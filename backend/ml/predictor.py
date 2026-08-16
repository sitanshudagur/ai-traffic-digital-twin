"""
Congestion Predictor: ML prediction interface.
Primary ownership: Member 5.

Provides clean hooks to:
1. Extract feature vectors from live and rolling traffic snapshots.
2. Predict future congestion state (30s / 60s forecasts) and expected queues.
3. Serve prediction outputs to the frontend and signal controller.
"""

from __future__ import annotations

import logging
from typing import Dict, Any, Optional

from backend.traci_engine.data_extractor import TrafficSnapshot

logger = logging.getLogger("ml_predictor")


class CongestionPredictor:
    """Predictor for near-term traffic congestion forecasting."""

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.is_trained: bool = False
        logger.info("Initialized CongestionPredictor (ready for Member 5 model weights).")

    def predict(self, snapshot: TrafficSnapshot) -> Dict[str, Any]:
        """
        Main prediction hook: extracts state features and outputs forecast DTO.
        """
        primary_junc = snapshot.junctions[0] if snapshot.junctions else None
        junc_id = primary_junc.id if primary_junc else "J1"
        current_congestion = primary_junc.overall_congestion if primary_junc else "moderate"

        # Heuristic baseline forecast (Member 5 can replace with trained model inference)
        total_queue = snapshot.metrics.queue_length
        if total_queue > 18:
            forecast30 = "heavy"
            forecast60 = "severe"
            expected_queue = int(total_queue * 1.35)
        elif total_queue > 8:
            forecast30 = "moderate"
            forecast60 = "heavy"
            expected_queue = int(total_queue * 1.15)
        else:
            forecast30 = "free"
            forecast60 = "moderate"
            expected_queue = max(2, int(total_queue * 1.05))

        return {
            "junctionId": junc_id,
            "approach": "north",
            "current": current_congestion,
            "forecast30": forecast30,
            "forecast60": forecast60,
            "confidence": 88,
            "expectedQueue": expected_queue,
        }
