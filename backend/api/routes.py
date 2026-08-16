"""
FastAPI REST API Routes.
Exposes endpoints for health checks, live traffic state snapshots, junction data,
metrics, and simulation lifecycle control.
"""

from __future__ import annotations

import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger("api_routes")


class ModeRequest(BaseModel):
    mode: str  # "baseline" or "optimized"


class EmergencyRequest(BaseModel):
    vehicle_id: str = "Ambulance-01"


# Helper getters attached at main.py startup
_simulation_runner = None
_data_extractor = None
_payload_adapter = None
_signal_controller = None
_ml_predictor = None


def configure_route_dependencies(runner, extractor, adapter, controller, predictor):
    """Injects core engine dependencies into route handlers."""
    global _simulation_runner, _data_extractor, _payload_adapter, _signal_controller, _ml_predictor
    _simulation_runner = runner
    _data_extractor = extractor
    _payload_adapter = adapter
    _signal_controller = controller
    _ml_predictor = predictor


@router.get("/")
def root_index() -> Dict[str, Any]:
    """Root endpoint providing API information and endpoint links."""
    return {
        "message": "AI Traffic Digital Twin API is Running",
        "documentation": "/docs",
        "endpoints": {
            "health": "/health",
            "traffic_state": "/api/traffic",
            "simulation_status": "/api/status",
            "junctions": "/api/junctions",
            "metrics": "/api/metrics",
            "websocket": "/ws",
        },
    }


@router.get("/health")
def health_check() -> Dict[str, Any]:
    """Health check endpoint confirming API availability and TraCI connection status."""
    connected = _simulation_runner.is_connected() if _simulation_runner else False
    sim_time = _simulation_runner.simulation_time if _simulation_runner else 0.0
    mode = _simulation_runner.mode if _simulation_runner else "baseline"
    return {
        "status": "ok",
        "service": "AI Traffic Digital Twin Backend",
        "traci_connected": connected,
        "simulation_time": sim_time,
        "mode": mode,
    }


@router.get("/api/status")
def get_simulation_status() -> Dict[str, Any]:
    """Returns current simulation running/paused status and mode."""
    if not _simulation_runner:
        raise HTTPException(status_code=503, detail="Simulation runner not initialized")
    return _simulation_runner.get_status()


@router.get("/api/traffic")
def get_traffic_snapshot() -> Dict[str, Any]:
    """Returns full current normalized traffic state payload (matching frontend contract)."""
    if not _data_extractor or not _payload_adapter or not _simulation_runner:
        raise HTTPException(status_code=503, detail="Backend services not initialized")

    status = _simulation_runner.get_status()
    snapshot = _data_extractor.extract_snapshot(mode=status["mode"], status=status["status"])
    
    pred = _ml_predictor.predict(snapshot) if _ml_predictor else None
    emergency = None
    if _signal_controller and _signal_controller.emergency_active:
        emergency = {
            "active": True,
            "triggered": True,
            "vehicleId": _signal_controller.emergency_vehicle_id or "Ambulance-01",
            "route": ["J1", "J2", "J3", "J4"],
            "progress": 0.5,
            "estimatedClearance": 30,
            "corridorStates": [{"junctionId": j, "status": "forced_green"} for j in ["J1", "J2", "J3", "J4"]],
        }

    return _payload_adapter.to_frontend_payload(
        snapshot=snapshot,
        prediction_override=pred,
        emergency_override=emergency,
    )


@router.get("/api/junctions")
def get_junctions() -> Dict[str, Any]:
    """Returns the list of junctions and approach conditions."""
    traffic_data = get_traffic_snapshot()
    return {"junctions": traffic_data.get("junctions", [])}


@router.get("/api/metrics")
def get_metrics() -> Dict[str, Any]:
    """Returns network KPIs and baseline/optimized comparison."""
    traffic_data = get_traffic_snapshot()
    return {
        "metrics": traffic_data.get("metrics", {}),
        "comparison": traffic_data.get("comparison", {}),
    }


@router.post("/api/simulation/start")
def start_simulation() -> Dict[str, Any]:
    """Starts or resumes simulation."""
    if not _simulation_runner:
        raise HTTPException(status_code=503, detail="Simulation runner not initialized")
    _simulation_runner.resume()
    return {"status": "ok", "message": "Simulation started/resumed"}


@router.post("/api/simulation/pause")
def pause_simulation() -> Dict[str, Any]:
    """Pauses simulation."""
    if not _simulation_runner:
        raise HTTPException(status_code=503, detail="Simulation runner not initialized")
    _simulation_runner.pause()
    return {"status": "ok", "message": "Simulation paused"}


@router.post("/api/simulation/resume")
def resume_simulation() -> Dict[str, Any]:
    """Resumes simulation."""
    if not _simulation_runner:
        raise HTTPException(status_code=503, detail="Simulation runner not initialized")
    _simulation_runner.resume()
    return {"status": "ok", "message": "Simulation resumed"}


@router.post("/api/simulation/reset")
def reset_simulation() -> Dict[str, Any]:
    """Resets simulation to time 0."""
    if not _simulation_runner:
        raise HTTPException(status_code=503, detail="Simulation runner not initialized")
    _simulation_runner.reset()
    return {"status": "ok", "message": "Simulation reset to t=0"}


@router.post("/api/simulation/mode")
def set_mode(req: ModeRequest) -> Dict[str, Any]:
    """Switches mode between 'baseline' and 'optimized'."""
    if not _simulation_runner:
        raise HTTPException(status_code=503, detail="Simulation runner not initialized")
    _simulation_runner.set_mode(req.mode)
    return {"status": "ok", "mode": req.mode}


@router.post("/api/emergency/trigger")
def trigger_emergency(req: EmergencyRequest) -> Dict[str, Any]:
    """Triggers green corridor emergency mode."""
    if not _signal_controller:
        raise HTTPException(status_code=503, detail="Signal controller not initialized")
    res = _signal_controller.trigger_emergency_corridor(req.vehicle_id)
    return {"status": "ok", "emergency": res}


@router.post("/api/emergency/clear")
def clear_emergency() -> Dict[str, Any]:
    """Clears emergency mode."""
    if not _signal_controller:
        raise HTTPException(status_code=503, detail="Signal controller not initialized")
    _signal_controller.clear_emergency_corridor()
    return {"status": "ok", "message": "Emergency corridor cleared"}
