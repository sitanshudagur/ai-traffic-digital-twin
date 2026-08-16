"""
PayloadAdapter: Serializes internal TrafficSnapshot into the normalized JSON payload
defined by frontend/src/services/TRAFFIC_DATA_CONTRACT.md.
Includes schema validation against frontend/src/services/traffic_data_contract.schema.json.
"""

from __future__ import annotations

import json
import logging
import time
from collections import deque
from pathlib import Path
from typing import Dict, Any, Optional, List

import jsonschema

from backend.traci_engine.data_extractor import TrafficSnapshot

logger = logging.getLogger("payload_adapter")

# Resolve contract schema path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEMA_PATH = WORKSPACE_ROOT / "frontend" / "src" / "services" / "traffic_data_contract.schema.json"


def format_clock_time(seconds: float) -> str:
    """Formats simulation seconds as MM:SS or HH:MM."""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


class PayloadAdapter:
    """Adapts internal traffic state snapshots into the normalized frontend contract payload."""

    def __init__(self, validate_schema: bool = False):
        self.validate_schema = validate_schema
        self.schema: Optional[Dict[str, Any]] = None
        self._chart_history: deque = deque(maxlen=30)
        self._last_history_time: float = -1.0
        
        # Accumulator for comparison metrics
        self.baseline_stats: Dict[str, float] = {
            "avgWait": 42.5,
            "queueLength": 24,
            "avgSpeed": 19.5,
            "throughput": 1280,
            "efficiency": 66.0,
            "co2": 38.5,
        }
        self.optimized_stats: Dict[str, float] = {
            "avgWait": 28.2,
            "queueLength": 14,
            "avgSpeed": 27.8,
            "throughput": 1540,
            "efficiency": 84.5,
            "co2": 31.2,
        }

        self._load_schema()

    def _load_schema(self) -> None:
        if SCHEMA_PATH.exists():
            try:
                with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
                    self.schema = json.load(f)
                logger.info("Traffic data contract schema loaded successfully.")
            except Exception as e:
                logger.warning("Failed to load schema from %s: %s", SCHEMA_PATH, e)
        else:
            logger.warning("Schema file not found at: %s", SCHEMA_PATH)

    def to_frontend_payload(
        self,
        snapshot: TrafficSnapshot,
        prediction_override: Optional[Dict[str, Any]] = None,
        emergency_override: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Converts TrafficSnapshot into the normalized frontend contract dictionary."""
        sim_time = snapshot.simulation_time

        # Update rolling chart history at ~2-5s intervals
        if sim_time - self._last_history_time >= 2.0 or self._last_history_time < 0:
            self._last_history_time = sim_time
            self._chart_history.append({
                "time": format_clock_time(sim_time),
                "avgWait": snapshot.metrics.avg_wait,
                "queueLength": snapshot.metrics.queue_length,
                "avgSpeed": snapshot.metrics.avg_speed,
                "co2": snapshot.metrics.co2,
                "throughput": snapshot.metrics.throughput,
            })

        # Format junctions
        junctions_payload: List[Dict[str, Any]] = []
        for junc in snapshot.junctions:
            approaches_dict = {}
            for direction, app in junc.approaches.items():
                approaches_dict[direction] = {
                    "signal": app.signal,
                    "countdown": app.countdown,
                    "queue": app.queue,
                    "avgWait": app.avg_wait,
                    "vehicleCount": app.vehicle_count,
                    "avgSpeed": app.avg_speed,
                    "fixedGreen": app.fixed_green,
                    "aiGreen": app.ai_green,
                    "aiAdjustment": app.ai_adjustment,
                    "congestion": app.congestion,
                    "badge": app.badge,
                }

            junctions_payload.append({
                "id": junc.id,
                "name": junc.name,
                "position": junc.position,
                "aiControlActive": junc.ai_control_active,
                "overallCongestion": junc.overall_congestion,
                "approaches": approaches_dict,
            })

        # Format roads
        roads_payload = [
            {
                "id": r.id,
                "from": r.from_junction,
                "to": r.to_junction,
                "coordinates": r.coordinates,
                "congestion": r.congestion,
            }
            for r in snapshot.roads
        ]

        # Format metrics
        metrics_payload = {
            "avgWait": snapshot.metrics.avg_wait,
            "queueLength": snapshot.metrics.queue_length,
            "vehicleCount": snapshot.metrics.vehicle_count,
            "throughput": snapshot.metrics.throughput,
            "avgSpeed": snapshot.metrics.avg_speed,
            "efficiency": snapshot.metrics.efficiency,
            "co2": snapshot.metrics.co2,
        }

        # Update dynamic comparison stats based on mode
        if snapshot.mode == "optimized":
            self.optimized_stats["avgWait"] = snapshot.metrics.avg_wait
            self.optimized_stats["queueLength"] = snapshot.metrics.queue_length
            self.optimized_stats["avgSpeed"] = snapshot.metrics.avg_speed
            self.optimized_stats["throughput"] = snapshot.metrics.throughput
            self.optimized_stats["efficiency"] = snapshot.metrics.efficiency
            self.optimized_stats["co2"] = snapshot.metrics.co2
        else:
            self.baseline_stats["avgWait"] = snapshot.metrics.avg_wait
            self.baseline_stats["queueLength"] = snapshot.metrics.queue_length
            self.baseline_stats["avgSpeed"] = snapshot.metrics.avg_speed
            self.baseline_stats["throughput"] = snapshot.metrics.throughput
            self.baseline_stats["efficiency"] = snapshot.metrics.efficiency
            self.baseline_stats["co2"] = snapshot.metrics.co2

        # Prediction object (Member 5 extension slot)
        primary_junction_id = junctions_payload[0]["id"] if junctions_payload else "J1"
        primary_congestion = junctions_payload[0]["overallCongestion"] if junctions_payload else "free"
        
        prediction_payload = prediction_override or {
            "junctionId": primary_junction_id,
            "approach": "north",
            "current": primary_congestion,
            "forecast30": "moderate" if primary_congestion == "free" else primary_congestion,
            "forecast60": "heavy" if primary_congestion in ("moderate", "heavy") else "moderate",
            "confidence": 88,
            "expectedQueue": max(5, int(snapshot.metrics.queue_length * 1.2)),
        }

        # Emergency object (Members 3 & 4 extension slot)
        emergency_payload = emergency_override or {
            "active": False,
            "triggered": False,
            "vehicleId": "Ambulance-01",
            "route": ["J1", "J2", "J3", "J4"],
            "routeCoordinates": [],
            "currentJunction": None,
            "progress": 0.0,
            "estimatedClearance": 45,
            "corridorStates": [
                {"junctionId": "J1", "status": "normal"},
                {"junctionId": "J2", "status": "normal"},
                {"junctionId": "J3", "status": "normal"},
                {"junctionId": "J4", "status": "normal"},
            ],
        }

        # Comparison object
        comparison_payload = {
            "baseline": dict(self.baseline_stats),
            "optimized": dict(self.optimized_stats),
        }

        payload: Dict[str, Any] = {
            "type": "traffic_update",
            "version": "1.0.0",
            "simulation": {
                "status": snapshot.status,
                "time": int(snapshot.simulation_time),
                "mode": snapshot.mode,
            },
            "metrics": metrics_payload,
            "junctions": junctions_payload,
            "roads": roads_payload,
            "prediction": prediction_payload,
            "emergency": emergency_payload,
            "comparison": comparison_payload,
            "chartHistory": list(self._chart_history),
        }

        if self.validate_schema and self.schema:
            try:
                jsonschema.validate(instance=payload, schema=self.schema)
            except jsonschema.ValidationError as err:
                logger.error("Payload schema validation failed: %s (path: %s)", err.message, list(err.path))

        return payload
