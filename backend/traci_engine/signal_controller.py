"""
SignalController: Interface for adaptive signal control and emergency green corridor.
Primary ownership: Members 3 & 4.

Provides clean hooks to:
1. Receive extracted traffic state (queues, wait times, speeds per approach).
2. Calculate pressure / optimal phase durations.
3. Apply phase changes or dynamic green times to SUMO via TraCI.
4. Manage emergency green corridor preemption and safe recovery.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, Any, Optional, List

import traci

from backend.traci_engine.data_extractor import TrafficSnapshot, JunctionSnapshot

logger = logging.getLogger("signal_controller")


@dataclass
class SignalDecision:
    junction_id: str
    tl_id: str
    target_phase: int
    duration: float
    ai_adjustment: int
    is_emergency: bool = False
    reason: str = "Standard Fixed Time"


class SignalController:
    """Traffic Signal Controller handling adaptive optimization and emergency corridors."""

    def __init__(self):
        self.emergency_active: bool = False
        self.emergency_vehicle_id: Optional[str] = None
        self.emergency_corridor_junctions: List[str] = ["J1", "J2", "J3", "J4"]

    def process_step(self, snapshot: TrafficSnapshot) -> List[SignalDecision]:
        """
        Main decision hook invoked on every simulation step.
        To be extended by Members 3 & 4 for adaptive pressure-based optimization.
        """
        decisions: List[SignalDecision] = []

        if snapshot.mode != "optimized":
            # In baseline mode, let SUMO execute its static fixed-time phases
            return decisions

        # Placeholder: Basic adaptive check (Members 3 & 4 will enhance with dynamic algorithms)
        for junc in snapshot.junctions:
            # Example decision structure
            decisions.append(
                SignalDecision(
                    junction_id=junc.id,
                    tl_id=junc.tl_id,
                    target_phase=junc.current_phase,
                    duration=30.0,
                    ai_adjustment=0,
                    is_emergency=self.emergency_active,
                    reason="Baseline AI passthrough",
                )
            )

        return decisions

    def trigger_emergency_corridor(self, vehicle_id: str = "Ambulance-01") -> Dict[str, Any]:
        """Triggers emergency preemption mode."""
        self.emergency_active = True
        self.emergency_vehicle_id = vehicle_id
        logger.info("Emergency corridor triggered for vehicle: %s", vehicle_id)
        return {
            "active": True,
            "vehicleId": vehicle_id,
            "corridor": self.emergency_corridor_junctions,
        }

    def clear_emergency_corridor(self) -> None:
        """Clears emergency mode and returns to normal adaptive control."""
        self.emergency_active = False
        self.emergency_vehicle_id = None
        logger.info("Emergency corridor cleared.")
