import asyncio
import json
import subprocess
import time
from pathlib import Path
import jsonschema
import websockets

SCHEMA_PATH = Path("frontend/src/services/traffic_data_contract.schema.json")
with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
    schema = json.load(f)

async def test_live_ws():
    uri = "ws://127.0.0.1:8000/ws"
    print("Connecting to live WebSocket:", uri)
    async with websockets.connect(uri) as ws:
        for i in range(3):
            msg_text = await ws.recv()
            data = json.loads(msg_text)
            sim_time = data.get("simulation", {}).get("time")
            junc_count = len(data.get("junctions", []))
            metrics = data.get("metrics", {})
            print(f"Received tick {i+1}: time={sim_time}s, junctions={junc_count}, wait={metrics.get('avgWait')}s, queue={metrics.get('queueLength')}")
            jsonschema.validate(instance=data, schema=schema)
            print(f"Tick {i+1} schema validation: PASS")

if __name__ == "__main__":
    proc = subprocess.Popen(["python", "-m", "uvicorn", "backend.api.main:app", "--host", "127.0.0.1", "--port", "8000"])
    try:
        time.sleep(3.5)
        asyncio.run(test_live_ws())
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
    print("ALL LIVE WEBSOCKET TICKS VALIDATED SUCCESSFULLY!")
