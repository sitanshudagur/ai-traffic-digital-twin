"""
Automated Test Suite for Member 2 Backend Pipeline.
Tests SUMO/TraCI lifecycle, DataExtractor, PayloadAdapter schema compliance,
and FastAPI REST endpoints.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.api.main import app, runner, extractor, adapter, controller, predictor
from backend.services.payload_adapter import PayloadAdapter
from backend.traci_engine.data_extractor import DataExtractor, TrafficSnapshot, NetworkMetricsSnapshot
from backend.traci_engine.simulation_runner import SimulationRunner


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_schema_file_exists():
    """Verify that frontend traffic data contract schema exists and is readable."""
    schema_path = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "services" / "traffic_data_contract.schema.json"
    assert schema_path.exists(), f"Schema not found at {schema_path}"
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)
    assert schema.get("title") == "TrafficDataContract" or "properties" in schema


def test_simulation_runner_lifecycle():
    """Test starting, stepping, pausing, and stopping SimulationRunner with TraCI."""
    test_runner = SimulationRunner()
    try:
        started = test_runner.start(mode="baseline", use_gui=False)
        assert started is True
        assert test_runner.is_connected() is True
        assert test_runner.is_running is True

        t1 = test_runner.step()
        assert t1 >= 1.0
        assert test_runner.step_count == 1

        test_runner.pause()
        assert test_runner.is_paused is True

        test_runner.resume()
        assert test_runner.is_paused is False

        test_runner.set_mode("optimized")
        assert test_runner.mode == "optimized"
    finally:
        test_runner.stop()
        assert test_runner.is_connected() is False


def test_data_extractor_and_schema_validation():
    """Test that DataExtractor outputs structured state that validates against schema."""
    test_runner = SimulationRunner()
    test_extractor = DataExtractor()
    test_adapter = PayloadAdapter(validate_schema=True)

    try:
        test_runner.start(mode="baseline", use_gui=False)
        for _ in range(3):
            test_runner.step()

        status = test_runner.get_status()
        snapshot = test_extractor.extract_snapshot(mode=status["mode"], status=status["status"])

        assert snapshot.simulation_time >= 3.0
        assert len(snapshot.junctions) > 0, "No junctions extracted"
        assert len(snapshot.roads) > 0, "No roads extracted"

        # Check junction GPS coordinates
        j1 = snapshot.junctions[0]
        assert len(j1.position) == 2
        assert 20.0 <= j1.position[0] <= 35.0  # Latitude in India
        assert 70.0 <= j1.position[1] <= 85.0  # Longitude in India

        # Check approaches
        assert "north" in j1.approaches
        assert "south" in j1.approaches
        assert j1.approaches["north"].signal in ("green", "yellow", "red")

        # Test transformation and schema validation
        payload = test_adapter.to_frontend_payload(snapshot)
        assert payload["type"] == "traffic_update"
        assert "simulation" in payload
        assert "metrics" in payload
        assert "junctions" in payload
        assert "roads" in payload
        assert "prediction" in payload
        assert "emergency" in payload
        assert "comparison" in payload
        assert "chartHistory" in payload

    finally:
        test_runner.stop()


def test_api_health_endpoint(client: TestClient):
    """Test /health endpoint."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "traci_connected" in data


def test_api_status_endpoint(client: TestClient):
    """Test /api/status endpoint."""
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "mode" in data


def test_api_traffic_endpoint(client: TestClient):
    """Test /api/traffic endpoint returns schema-compliant payload."""
    res = client.get("/api/traffic")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "traffic_update"
    assert isinstance(data["junctions"], list)
    assert isinstance(data["roads"], list)


def test_api_simulation_controls(client: TestClient):
    """Test simulation pause, resume, mode REST endpoints."""
    res_pause = client.post("/api/simulation/pause")
    assert res_pause.status_code == 200

    res_resume = client.post("/api/simulation/resume")
    assert res_resume.status_code == 200

    res_mode = client.post("/api/simulation/mode", json={"mode": "optimized"})
    assert res_mode.status_code == 200
    assert res_mode.json()["mode"] == "optimized"
