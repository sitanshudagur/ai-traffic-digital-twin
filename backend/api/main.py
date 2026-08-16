"""
FastAPI Application Entry Point.
Coordinates SUMO simulation stepping in a background task, handles REST API endpoints,
and broadcasts live traffic state over WebSocket to React frontend clients.
"""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router as api_router, configure_route_dependencies
from backend.api.socket_handler import ws_manager
from backend.ml.predictor import CongestionPredictor
from backend.services.payload_adapter import PayloadAdapter
from backend.traci_engine.data_extractor import DataExtractor
from backend.traci_engine.signal_controller import SignalController
from backend.traci_engine.simulation_runner import SimulationRunner

logger = logging.getLogger("main_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Global instances
runner = SimulationRunner()
extractor = DataExtractor()
adapter = PayloadAdapter(validate_schema=True)
controller = SignalController()
predictor = CongestionPredictor()

# Dependency injection for REST routes
configure_route_dependencies(runner, extractor, adapter, controller, predictor)

# Background task reference
_simulation_task: asyncio.Task | None = None
_shutdown_event = asyncio.Event()


async def simulation_loop() -> None:
    """Background loop advancing SUMO simulation and broadcasting updates at 1 Hz."""
    logger.info("Starting background simulation worker loop...")

    # Start SUMO via TraCI
    try:
        runner.start(mode="baseline", use_gui=False)
    except Exception as e:
        logger.error("Failed to start SUMO at startup: %s. Will retry on demand.", e)

    while not _shutdown_event.is_set():
        try:
            if runner.is_connected() and runner.is_running and not runner.is_paused:
                # 1. Step simulation
                runner.step()

                # 2. Extract live traffic state
                status = runner.get_status()
                snapshot = extractor.extract_snapshot(mode=status["mode"], status=status["status"])

                # 3. Apply signal controller decision (Members 3 & 4 slot)
                decisions = controller.process_step(snapshot)

                # 4. Generate ML prediction (Member 5 slot)
                pred = predictor.predict(snapshot)

                # 5. Handle emergency corridor payload if active
                emergency = None
                if controller.emergency_active:
                    emergency = {
                        "active": True,
                        "triggered": True,
                        "vehicleId": controller.emergency_vehicle_id or "Ambulance-01",
                        "route": ["J1", "J2", "J3", "J4"],
                        "progress": 0.5,
                        "estimatedClearance": 30,
                        "corridorStates": [
                            {"junctionId": j, "status": "forced_green"}
                            for j in ["J1", "J2", "J3", "J4"]
                        ],
                    }

                # 6. Adapt payload for frontend contract
                payload = adapter.to_frontend_payload(
                    snapshot=snapshot,
                    prediction_override=pred,
                    emergency_override=emergency,
                )

                # 7. Broadcast to all connected React WebSocket clients
                await ws_manager.broadcast(payload)

            await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Error in simulation worker loop: %s", e)
            await asyncio.sleep(1.0)

    logger.info("Simulation worker loop stopped.")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifespan context manager to manage background simulation lifecycle."""
    global _simulation_task
    _shutdown_event.clear()
    _simulation_task = asyncio.create_task(simulation_loop())
    logger.info("AI Traffic Digital Twin Backend started.")
    yield
    # Shutdown
    logger.info("Shutting down AI Traffic Digital Twin Backend...")
    _shutdown_event.set()
    if _simulation_task:
        _simulation_task.cancel()
        try:
            await _simulation_task
        except asyncio.CancelledError:
            pass
    runner.stop()
    logger.info("Cleanup completed cleanly.")


app = FastAPI(
    title="AI Traffic Digital Twin Backend",
    version="1.0.0",
    description="Live TraCI-powered digital twin backend streaming traffic state to React dashboard",
    lifespan=lifespan,
)

# Enable CORS for React frontend (Vite default ports 5173, 3000, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST endpoints
app.include_router(api_router)


# WebSocket endpoints (supporting both /ws and /ws/traffic)
@app.websocket("/ws")
@app.websocket("/ws/traffic")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial state immediately upon connection
        status = runner.get_status()
        initial_snapshot = extractor.extract_snapshot(mode=status["mode"], status=status["status"])
        initial_payload = adapter.to_frontend_payload(initial_snapshot)
        await websocket.send_text(json.dumps(initial_payload))

        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                action = msg.get("action")
                if action == "play" or action == "resume":
                    runner.resume()
                    await ws_manager.send_ack(websocket, action, "ok", "Simulation resumed")
                elif action == "pause":
                    runner.pause()
                    await ws_manager.send_ack(websocket, action, "ok", "Simulation paused")
                elif action == "reset":
                    runner.reset()
                    await ws_manager.send_ack(websocket, action, "ok", "Simulation reset")
                elif action == "set_mode":
                    mode = msg.get("mode", "baseline")
                    runner.set_mode(mode)
                    await ws_manager.send_ack(websocket, action, "ok", f"Mode set to {mode}")
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning("WebSocket client error: %s", e)
        await ws_manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api.main:app", host="0.0.0.0", port=8000, reload=False)
