"""
SimulationRunner: Manages the lifecycle of Eclipse SUMO and the TraCI connection.
Handles SUMO process launch, stepping, pause/resume, reset, mode switching, and clean termination.
"""

from __future__ import annotations

import logging
import os
import sys
import threading
import time
from pathlib import Path
from typing import Optional, Dict, Any

# Ensure SUMO tools are available in sys.path
SUMO_HOME = os.environ.get("SUMO_HOME", r"C:\Program Files (x86)\Eclipse\Sumo")
tools_path = os.path.join(SUMO_HOME, "tools")
if tools_path not in sys.path and os.path.exists(tools_path):
    sys.path.append(tools_path)

import traci
import traci.constants as tc

logger = logging.getLogger("simulation_runner")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


class SimulationRunner:
    """Thread-safe runner managing the SUMO simulation lifecycle via TraCI."""

    def __init__(self, workspace_root: Optional[Path] = None):
        self.workspace_root = workspace_root or Path(__file__).resolve().parent.parent.parent
        self.simulation_dir = self.workspace_root / "simulation"
        self._lock = threading.RLock()
        
        self.mode: str = "baseline"
        self.is_running: bool = False
        self.is_paused: bool = False
        self.simulation_time: float = 0.0
        self.step_count: int = 0
        self.step_length: float = 1.0
        self._traci_connected: bool = False

    def find_sumo_binary(self, use_gui: bool = False) -> str:
        """Finds the sumo or sumo-gui executable binary."""
        binary_name = "sumo-gui.exe" if (use_gui and sys.platform.startswith("win")) else (
            "sumo-gui" if use_gui else ("sumo.exe" if sys.platform.startswith("win") else "sumo")
        )
        
        # Check SUMO_HOME
        bin_dir = Path(SUMO_HOME) / "bin"
        candidate = bin_dir / binary_name
        if candidate.exists():
            return str(candidate)
        
        # Check standard default installation
        default_win_path = Path(r"C:\Program Files (x86)\Eclipse\Sumo\bin") / binary_name
        if default_win_path.exists():
            return str(default_win_path)

        # Fallback to PATH
        return "sumo-gui" if use_gui else "sumo"

    def get_config_path(self, mode: str) -> Path:
        """Returns the absolute path to the .sumocfg file for the requested mode."""
        cfg_file = "optimized.sumocfg" if mode == "optimized" else "baseline.sumocfg"
        cfg_path = self.simulation_dir / cfg_file
        if not cfg_path.exists():
            # Fallback to baseline if specific file missing
            cfg_path = self.simulation_dir / "baseline.sumocfg"
        return cfg_path

    def start(self, mode: str = "baseline", use_gui: bool = False, step_length: float = 1.0) -> bool:
        """Starts the SUMO simulation and connects through TraCI."""
        with self._lock:
            if self._traci_connected:
                logger.warning("Simulation already running. Closing previous instance first.")
                self.stop()

            self.mode = mode
            self.step_length = step_length
            sumo_binary = self.find_sumo_binary(use_gui=use_gui)
            cfg_path = self.get_config_path(mode)

            if not cfg_path.exists():
                raise FileNotFoundError(f"SUMO configuration file not found at: {cfg_path}")

            cmd = [
                sumo_binary,
                "-c", str(cfg_path),
                "--step-length", str(step_length),
                "--no-step-log", "true",
                "--collision.action", "warn",
                "--time-to-teleport", "-1",
            ]

            logger.info("Starting SUMO with command: %s (cwd: %s)", " ".join(cmd), str(self.simulation_dir))

            try:
                traci.start(cmd, label="traffic_twin")
                self._traci_connected = True
                self.is_running = True
                self.is_paused = False
                self.simulation_time = traci.simulation.getTime()
                self.step_count = 0
                logger.info("TraCI successfully connected. Version: %s", traci.getVersion())
                return True
            except Exception as e:
                logger.exception("Failed to start SUMO / TraCI: %s", e)
                self._traci_connected = False
                self.is_running = False
                self.is_paused = False
                raise

    def step(self) -> float:
        """Executes a single simulation step. Returns the current simulation time."""
        with self._lock:
            if not self._traci_connected or not self.is_running:
                return self.simulation_time

            if self.is_paused:
                return self.simulation_time

            try:
                # Check if simulation has ended
                if traci.simulation.getMinExpectedNumber() <= 0 and self.simulation_time > 0:
                    logger.info("Simulation reached completion (no more expected vehicles).")
                    self.is_running = False
                    return self.simulation_time

                traci.simulationStep()
                self.simulation_time = traci.simulation.getTime()
                self.step_count += 1
                return self.simulation_time
            except traci.FatalTraCIError as e:
                logger.error("Fatal TraCI error during step: %s", e)
                self._cleanup_connection()
                raise
            except Exception as e:
                logger.error("Error during simulation step: %s", e)
                raise

    def pause(self) -> None:
        """Pauses simulation progression."""
        with self._lock:
            self.is_paused = True
            logger.info("Simulation paused at t=%.1fs", self.simulation_time)

    def resume(self) -> None:
        """Resumes simulation progression."""
        with self._lock:
            if not self.is_running and not self._traci_connected:
                self.start(mode=self.mode)
            else:
                self.is_paused = False
                self.is_running = True
            logger.info("Simulation resumed at t=%.1fs", self.simulation_time)

    def reset(self, mode: Optional[str] = None) -> None:
        """Resets the simulation to t=0."""
        with self._lock:
            target_mode = mode or self.mode
            logger.info("Resetting simulation in mode: %s", target_mode)
            self.stop()
            self.start(mode=target_mode)

    def set_mode(self, mode: str) -> None:
        """Switches mode between 'baseline' and 'optimized'."""
        with self._lock:
            if mode not in ("baseline", "optimized"):
                raise ValueError(f"Invalid mode: {mode}. Must be 'baseline' or 'optimized'.")
            if self.mode != mode:
                self.mode = mode
                logger.info("Simulation mode switched to: %s", self.mode)

    def stop(self) -> None:
        """Terminates the SUMO simulation and closes the TraCI connection cleanly."""
        with self._lock:
            self.is_running = False
            self.is_paused = False
            if self._traci_connected:
                try:
                    traci.close()
                    logger.info("TraCI connection closed cleanly.")
                except Exception as e:
                    logger.warning("Error while closing TraCI: %s", e)
                finally:
                    self._cleanup_connection()

    def _cleanup_connection(self) -> None:
        self._traci_connected = False
        self.is_running = False
        self.is_paused = False

    def is_connected(self) -> bool:
        """Returns True if TraCI is currently connected."""
        return self._traci_connected

    def get_status(self) -> Dict[str, Any]:
        """Returns current lifecycle status."""
        with self._lock:
            if not self._traci_connected or not self.is_running:
                status_str = "stopped"
            elif self.is_paused:
                status_str = "paused"
            else:
                status_str = "running"

            return {
                "status": status_str,
                "time": self.simulation_time,
                "mode": self.mode,
                "stepCount": self.step_count,
                "connected": self._traci_connected,
            }
