"""
DataExtractor: Extracts real-time traffic data from SUMO via TraCI and normalizes
it into clean internal Python data models.
Transforms network coordinates to WGS84 [lat, lon], computes approach queues,
waiting times, signal states, and network-wide KPIs.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple

import traci

logger = logging.getLogger("data_extractor")

# Explicit mapping of the 4 SUMO traffic light cluster IDs to human-readable IDs and exact approach links
TL_ID_MAP = {
    "cluster_1820903920_1820903922_1820903923_1820903925_#4more": {
        "id": "J1",
        "name": "Junction J1 (Sector 62 Crossway)",
        "junction_id": "cluster_1820903920_1820903922_1820903923_1820903925_#4more",
        "default_phase_greens": {0: 39, 2: 39},
        "approach_edges": {
            "north": "1427481953#7",
            "south": "70534871#2",
            "east": "1381600987#0",
            "west": "1381600986#1",
        },
        "approach_links": {
            "north": [4, 5, 6, 7],
            "south": [0, 1, 2, 3],
            "east": [12, 13, 14, 15],
            "west": [8, 9, 10, 11],
        },
    },
    "cluster_836339720_836340131_836340215_841773856_#2more": {
        "id": "J2",
        "name": "Junction J2 (Amaltash / Stadium Crossing)",
        "junction_id": "cluster_836339720_836340131_836340215_841773856_#2more",
        "default_phase_greens": {0: 33, 2: 6, 4: 33},
        "approach_edges": {
            "north": "70535825#17",
            "south": "96192454#8",
            "east": "1313414235#1",
            "west": "70535825#17",
        },
        "approach_links": {
            "north": [1, 2],
            "south": [6, 7],
            "east": [10, 11, 12, 13],
            "west": [0, 3, 4],
        },
    },
    "841773686": {
        "id": "J3",
        "name": "Junction J3 (Amaltash / Sector 12 Crossing)",
        "junction_id": "841773686",
        "default_phase_greens": {0: 80},
        "custom_gps": [28.591925, 77.338520],  # Real intersection on Amaltash Marg / Sector 12
        "approach_edges": {
            "north": "70535825#14",
            "south": "70535825#16",
            "east": "1120324760#0",
            "west": "70535825#15",
        },
        "approach_links": {
            "north": [0],
            "south": [1],
            "east": [0],
            "west": [1],
        },
    },
    "cluster_847791369_847791372_847791376_847791401_#3more": {
        "id": "J4",
        "name": "Junction J4 (North Sector 63 Junction)",
        "junction_id": "cluster_847791369_847791372_847791376_847791401_#3more",
        "default_phase_greens": {0: 79},
        "approach_edges": {
            "north": "682964498#1",
            "south": "682964498#1",
            "east": "682964498#1",
            "west": "682964498#1",
        },
        "approach_links": {
            "north": [0],
            "south": [0],
            "east": [0],
            "west": [0],
        },
    },
}


def classify_congestion(queue: int, avg_speed: float) -> str:
    """Classifies congestion level into free, moderate, heavy, or severe."""
    if queue > 20 or avg_speed <= 8.0:
        return "severe"
    if queue > 12 or avg_speed <= 15.0:
        return "heavy"
    if queue > 4 or avg_speed <= 25.0:
        return "moderate"
    return "free"


@dataclass
class ApproachSnapshot:
    direction: str
    signal: str = "green"  # green, yellow, red, emergency
    countdown: int = 15
    queue: int = 0
    avg_wait: float = 0.0
    vehicle_count: int = 0
    avg_speed: float = 30.0
    fixed_green: int = 30
    ai_green: int = 30
    ai_adjustment: int = 0
    congestion: str = "free"
    badge: str = "normal"  # normal, ai_adjusted, emergency


@dataclass
class JunctionSnapshot:
    id: str
    name: str
    tl_id: str
    position: List[float]  # [lat, lon]
    ai_control_active: bool = False
    overall_congestion: str = "free"
    current_phase: int = 0
    phase_elapsed: float = 0.0
    approaches: Dict[str, ApproachSnapshot] = field(default_factory=dict)


@dataclass
class RoadSnapshot:
    id: str
    from_junction: str
    to_junction: str
    coordinates: List[List[float]]  # [[lat, lon], ...]
    congestion: str = "free"


@dataclass
class NetworkMetricsSnapshot:
    avg_wait: float = 0.0
    queue_length: int = 0
    vehicle_count: int = 0
    throughput: int = 0
    avg_speed: float = 0.0
    efficiency: float = 100.0
    co2: float = 0.0


@dataclass
class TrafficSnapshot:
    simulation_time: float
    mode: str
    status: str
    metrics: NetworkMetricsSnapshot
    junctions: List[JunctionSnapshot]
    roads: List[RoadSnapshot]
    arrived_count_total: int = 0


class DataExtractor:
    """Extracts and aggregates traffic state from SUMO via TraCI."""

    def __init__(self):
        self._junction_geo_cache: Dict[str, List[float]] = {}
        self._road_cache: Optional[List[RoadSnapshot]] = None
        self._phase_timer: Dict[str, Tuple[int, float]] = {}
        self._total_arrived: int = 0
        self._last_sim_time: float = 0.0

    def extract_snapshot(self, mode: str = "baseline", status: str = "running") -> TrafficSnapshot:
        """Extracts complete snapshot of current simulation state from TraCI."""
        if not traci.isLoaded():
            return self._create_empty_snapshot(mode, status)

        sim_time = traci.simulation.getTime()
        self._last_sim_time = sim_time
        self._total_arrived += traci.simulation.getArrivedNumber()

        junctions = self._extract_junctions(mode, sim_time)
        roads = self._extract_roads()
        metrics = self._extract_metrics(sim_time)

        return TrafficSnapshot(
            simulation_time=sim_time,
            mode=mode,
            status=status,
            metrics=metrics,
            junctions=junctions,
            roads=roads,
            arrived_count_total=self._total_arrived,
        )

    def _create_empty_snapshot(self, mode: str, status: str) -> TrafficSnapshot:
        return TrafficSnapshot(
            simulation_time=0.0,
            mode=mode,
            status=status,
            metrics=NetworkMetricsSnapshot(),
            junctions=[],
            roads=[],
            arrived_count_total=0,
        )

    def _get_junction_gps(self, tl_id: str, junction_raw_id: str) -> List[float]:
        """Queries junction UTM position and converts it to WGS84 [lat, lon]."""
        if tl_id in self._junction_geo_cache:
            return self._junction_geo_cache[tl_id]

        config = TL_ID_MAP.get(tl_id, {})
        if "custom_gps" in config:
            self._junction_geo_cache[tl_id] = config["custom_gps"]
            return config["custom_gps"]

        try:
            try:
                x, y = traci.junction.getPosition(junction_raw_id)
            except Exception:
                x, y = traci.junction.getPosition(tl_id)

            lon, lat = traci.simulation.convertGeo(x, y)
            gps = [round(lat, 6), round(lon, 6)]
            self._junction_geo_cache[tl_id] = gps
            return gps
        except Exception as e:
            logger.debug("Could not query position for %s: %s", tl_id, e)
            default_coords = {
                "cluster_1820903920_1820903922_1820903923_1820903925_#4more": [28.594010, 77.332914],
                "cluster_836339720_836340131_836340215_841773856_#2more": [28.590363, 77.336342],
                "841773686": [28.589650, 77.338200],
                "cluster_847791369_847791372_847791376_847791401_#3more": [28.595430, 77.331570],
            }
            gps = default_coords.get(tl_id, [28.5920, 77.3340])
            self._junction_geo_cache[tl_id] = gps
            return gps

    def _extract_junctions(self, mode: str, sim_time: float) -> List[JunctionSnapshot]:
        """Extracts real-time approach metrics and signal phases for all active traffic lights."""
        active_tls = traci.trafficlight.getIDList()
        junctions: List[JunctionSnapshot] = []

        for tl_id in active_tls:
            config = TL_ID_MAP.get(tl_id, {
                "id": tl_id[:6],
                "name": f"Junction {tl_id[:6]}",
                "junction_id": tl_id,
                "default_phase_greens": {0: 30},
                "approach_edges": {},
                "approach_links": {},
            })

            frontend_id = config["id"]
            name = config["name"]
            junc_raw_id = config["junction_id"]
            position = self._get_junction_gps(tl_id, junc_raw_id)

            # Traffic light phase state
            try:
                current_phase = traci.trafficlight.getPhase(tl_id)
                phase_state = traci.trafficlight.getRedYellowGreenState(tl_id)
                next_switch = traci.trafficlight.getNextSwitch(tl_id)
                countdown = max(1, int(next_switch - sim_time))
            except Exception as e:
                logger.debug("Failed to query TL %s state: %s", tl_id, e)
                current_phase = 0
                phase_state = "GGGG"
                countdown = 15

            # Track phase duration
            if tl_id not in self._phase_timer or self._phase_timer[tl_id][0] != current_phase:
                self._phase_timer[tl_id] = (current_phase, sim_time)
            phase_elapsed = sim_time - self._phase_timer[tl_id][1]

            # Extract approach metrics
            approaches: Dict[str, ApproachSnapshot] = {}
            approach_edges = config.get("approach_edges", {})
            approach_links = config.get("approach_links", {})

            directions = ["north", "south", "east", "west"]
            for direction in directions:
                edge_id = approach_edges.get(direction)
                queue = 0
                avg_wait = 0.0
                vehicle_count = 0
                avg_speed = 30.0

                if edge_id:
                    try:
                        queue = traci.edge.getLastStepHaltingNumber(edge_id)
                        vehicle_count = traci.edge.getLastStepVehicleNumber(edge_id)
                        raw_speed = traci.edge.getLastStepMeanSpeed(edge_id)
                        avg_speed = round(raw_speed * 3.6, 1) if raw_speed > 0 else 30.0

                        veh_ids = traci.edge.getLastStepVehicleIDs(edge_id)
                        if veh_ids:
                            total_wait = sum(traci.vehicle.getWaitingTime(v) for v in veh_ids)
                            avg_wait = round(total_wait / len(veh_ids), 1)
                    except Exception as e:
                        logger.debug("Error querying edge %s: %s", edge_id, e)

                # Determine signal based on exact controlled link indices for this approach
                links = approach_links.get(direction, [])
                signal = "red"
                if links and phase_state:
                    link_states = [phase_state[i] for i in links if i < len(phase_state)]
                    if any(c in ("G", "g") for c in link_states):
                        signal = "green"
                    elif any(c in ("Y", "y") for c in link_states):
                        signal = "yellow"
                    else:
                        signal = "red"
                else:
                    # Fallback
                    signal = "green" if (current_phase % 2 == 0) else "red"

                fixed_green = config.get("default_phase_greens", {}).get(current_phase, 35)
                ai_adjustment = 0
                ai_green = fixed_green
                badge = "normal"

                if mode == "optimized" and signal == "green":
                    ai_adjustment = 0
                    badge = "normal"

                congestion = classify_congestion(queue, avg_speed)

                approaches[direction] = ApproachSnapshot(
                    direction=direction,
                    signal=signal,
                    countdown=countdown,
                    queue=queue,
                    avg_wait=avg_wait,
                    vehicle_count=vehicle_count,
                    avg_speed=avg_speed,
                    fixed_green=fixed_green,
                    ai_green=ai_green,
                    ai_adjustment=ai_adjustment,
                    congestion=congestion,
                    badge=badge,
                )

            # Determine overall junction congestion
            max_queue = max((a.queue for a in approaches.values()), default=0)
            min_speed = min((a.avg_speed for a in approaches.values()), default=30.0)
            overall_congestion = classify_congestion(max_queue, min_speed)

            junctions.append(
                JunctionSnapshot(
                    id=frontend_id,
                    name=name,
                    tl_id=tl_id,
                    position=position,
                    ai_control_active=(mode == "optimized"),
                    overall_congestion=overall_congestion,
                    current_phase=current_phase,
                    phase_elapsed=phase_elapsed,
                    approaches=approaches,
                )
            )

        return junctions

    def _extract_roads(self) -> List[RoadSnapshot]:
        """Extracts complete network road corridors with accurate polyline shapes and live congestion."""
        # Comprehensive road corridor definitions across the simulated network
        corridors = [
            ("R1-J4-J1", "J4", "J1", ["682964498#0", "682964498#1"]),
            ("R2-J1-J2", "J1", "J2", ["70534949#1", "70534949#2", "70534949#3", "70534949#4", "70534949#5"]),
            ("R3-J2-J3", "J2", "J3", ["70535825#14", "70535825#15", "70535825#16", "70535825#17"]),
            ("R4-J2-Ring", "J2", "J3", ["1313414235#1", "1313414235#4", "1313414235#5", "1120324760#0", "1120324760#1"]),
            ("R5-J1-West", "J1", "J4", ["1381600986#0", "1381600986#1", "1427481953#0", "1427481953#1"]),
            ("R6-J1-East", "J1", "J2", ["1381600987#3", "1381600987#4", "1381600987#5", "1381600987#6"]),
        ]

        roads: List[RoadSnapshot] = []

        for road_id, from_j, to_j, edge_sequence in corridors:
            coords: List[List[float]] = []
            max_queue = 0
            min_speed = 40.0

            for edge_id in edge_sequence:
                try:
                    shape = traci.lane.getShape(f"{edge_id}_0")
                    for x, y in shape:
                        lon, lat = traci.simulation.convertGeo(x, y)
                        pt = [round(lat, 6), round(lon, 6)]
                        if not coords or coords[-1] != pt:
                            coords.append(pt)

                    q = traci.edge.getLastStepHaltingNumber(edge_id)
                    spd = traci.edge.getLastStepMeanSpeed(edge_id) * 3.6
                    max_queue = max(max_queue, q)
                    if spd > 0:
                        min_speed = min(min_speed, spd)
                except Exception:
                    continue

            if not coords:
                # Fallback to direct connection
                j1_pos = self._get_junction_gps("cluster_1820903920_1820903922_1820903923_1820903925_#4more", "")
                j2_pos = self._get_junction_gps("cluster_836339720_836340131_836340215_841773856_#2more", "")
                coords = [j1_pos, j2_pos]

            congestion = classify_congestion(max_queue, min_speed)

            roads.append(
                RoadSnapshot(
                    id=road_id,
                    from_junction=from_j,
                    to_junction=to_j,
                    coordinates=coords,
                    congestion=congestion,
                )
            )

        return roads

    def _extract_metrics(self, sim_time: float) -> NetworkMetricsSnapshot:
        """Calculates global network traffic metrics from active vehicles."""
        vehicle_ids = traci.vehicle.getIDList()
        vehicle_count = len(vehicle_ids)

        if vehicle_count == 0:
            return NetworkMetricsSnapshot(
                avg_wait=0.0,
                queue_length=0,
                vehicle_count=0,
                throughput=0,
                avg_speed=35.0,
                efficiency=100.0,
                co2=0.0,
            )

        total_wait = 0.0
        total_speed = 0.0
        halting_count = 0
        total_co2 = 0.0

        for veh_id in vehicle_ids:
            try:
                speed = traci.vehicle.getSpeed(veh_id)
                wait = traci.vehicle.getWaitingTime(veh_id)
                co2_mg = traci.vehicle.getCO2Emission(veh_id)

                total_wait += wait
                total_speed += speed
                total_co2 += co2_mg / 1000.0

                if speed < 0.1:
                    halting_count += 1
            except Exception:
                continue

        avg_wait = round(total_wait / vehicle_count, 1)
        avg_speed_kmh = round((total_speed / vehicle_count) * 3.6, 1)

        elapsed_hours = max(sim_time / 3600.0, 1.0 / 3600.0)
        throughput = int(self._total_arrived / elapsed_hours) if sim_time > 10 else int(vehicle_count * 12)

        free_flow_speed = 40.0
        speed_ratio = min(1.0, avg_speed_kmh / free_flow_speed)
        wait_penalty = min(0.5, (avg_wait / 120.0))
        efficiency = round(max(10.0, min(100.0, (speed_ratio - wait_penalty) * 100.0)), 1)

        return NetworkMetricsSnapshot(
            avg_wait=avg_wait,
            queue_length=halting_count,
            vehicle_count=vehicle_count,
            throughput=max(0, throughput),
            avg_speed=avg_speed_kmh,
            efficiency=efficiency,
            co2=round(total_co2, 1),
        )
