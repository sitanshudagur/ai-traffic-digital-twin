"""
WebSocket Handler: Manages active WebSocket connections to React frontend clients
and broadcasts live normalized traffic update payloads.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import List, Set, Dict, Any

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("socket_handler")


class WebSocketManager:
    """Manages active WebSocket client connections and broadcasting."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accepts and registers a new WebSocket client connection."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info("Frontend WebSocket client connected. Total clients: %d", len(self.active_connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        """Removes a disconnected client."""
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info("Frontend WebSocket client disconnected. Total clients: %d", len(self.active_connections))

    async def broadcast(self, payload: Dict[str, Any]) -> None:
        """Broadcasts a JSON payload to all active WebSocket clients."""
        if not self.active_connections:
            return

        message_str = json.dumps(payload)
        dead_connections: List[WebSocket] = []

        async with self._lock:
            for connection in list(self.active_connections):
                try:
                    await connection.send_text(message_str)
                except Exception as e:
                    logger.warning("Failed to send to client: %s. Removing.", e)
                    dead_connections.append(connection)

            for dead in dead_connections:
                self.active_connections.discard(dead)

    async def send_ack(self, websocket: WebSocket, action: str, status: str = "ok", detail: str = "") -> None:
        """Sends a control_ack event to a specific client."""
        try:
            ack_payload = {
                "type": "control_ack",
                "action": action,
                "status": status,
                "detail": detail,
            }
            await websocket.send_text(json.dumps(ack_payload))
        except Exception as e:
            logger.warning("Failed to send ack: %s", e)


# Global singleton manager
ws_manager = WebSocketManager()
