# Traffic Data Contract

This document describes the frontend's expected WebSocket JSON payload shape.
The React frontend is designed to consume normalized traffic state from either mock mode or a FastAPI WebSocket.

## Top-level payload shape

```json
{
  "type": "traffic_update",
  "simulation": { ... },
  "metrics": { ... },
  "junctions": [ ... ],
  "roads": [ ... ],
  "prediction": { ... },
  "emergency": { ... },
  "comparison": { ... },
  "chartHistory": [ ... ]
}
```

### `type`
- `string`
- expected value: `traffic_update`
- used by the frontend to identify normalized messages.

### `simulation`
- `status`: `running` | `paused`
- `time`: numeric simulation time in seconds
- `mode`: `baseline` | `optimized`

Example:
```json
"simulation": {
  "status": "running",
  "time": 1234,
  "mode": "optimized"
}
```

### `metrics`
A normalized summary of network KPIs.
- `avgWait`: number (seconds)
- `queueLength`: number (vehicles)
- `vehicleCount`: optional number
- `throughput`: number (vehicles/hour)
- `avgSpeed`: number (km/h)
- `efficiency`: optional number (%)
- `co2`: optional number

Example:
```json
"metrics": {
  "avgWait": 31.4,
  "queueLength": 17,
  "throughput": 1510,
  "avgSpeed": 26,
  "efficiency": 82,
  "co2": 34.1
}
```

### `junctions`
Array of junction objects.
Each junction should include a stable `id`, `name`, `position`, and approach data.

Example:
```json
{
  "id": "J1",
  "name": "Junction J1",
  "position": [12.9716, 77.5946],
  "aiControlActive": true,
  "overallCongestion": "moderate",
  "approaches": {
    "north": {
      "signal": "green",
      "countdown": 18,
      "queue": 23,
      "avgWait": 12,
      "fixedGreen": 30,
      "aiGreen": 42,
      "aiAdjustment": 12,
      "congestion": "moderate",
      "badge": "ai_adjusted"
    },
    "south": { ... },
    "east": { ... },
    "west": { ... }
  }
}
```

### `roads`
Array of road or edge objects.
The frontend uses `coordinates` for polyline rendering and `congestion` for color.

Example:
```json
{
  "id": "R1-J1-J2",
  "from": "J1",
  "to": "J2",
  "coordinates": [[12.9716, 77.5946], [12.975, 77.6]],
  "congestion": "moderate"
}
```

### `prediction`
Prediction output from backend/ML.
- `junctionId`: string
- `roadId`: optional string if prediction is road-based
- `current`: string congestion label
- `forecast30`: string congestion label
- `forecast60`: string congestion label
- `expectedQueue`: optional number

Example:
```json
"prediction": {
  "junctionId": "J1",
  "current": "moderate",
  "forecast30": "heavy",
  "forecast60": "severe",
  "expectedQueue": 28
}
```

### `emergency`
Emergency corridor state for green corridor support.
- `active`: boolean
- `triggered`: boolean
- `vehicleId`: optional string
- `route`: array of junction ids
- `routeCoordinates`: optional array of coordinates
- `currentJunction`: optional string
- `progress`: number between 0 and 1
- `estimatedClearance`: number (seconds)
- `corridorStates`: array of objects with `junctionId` and `status`

Example:
```json
"emergency": {
  "active": true,
  "triggered": true,
  "vehicleId": "Ambulance-01",
  "route": ["J1", "J2", "J3", "J4"],
  "routeCoordinates": [[12.9716, 77.5946], ...],
  "currentJunction": "J2",
  "progress": 0.42,
  "estimatedClearance": 32,
  "corridorStates": [
    { "junctionId": "J1", "status": "passed" },
    { "junctionId": "J2", "status": "forced_green" }
  ]
}
```

### `comparison`
Baseline vs optimized metrics.
- `baseline`: same metric keys as `metrics`
- `optimized`: same metric keys as `metrics`

Example:
```json
"comparison": {
  "baseline": {
    "avgWait": 48,
    "queueLength": 27,
    "avgSpeed": 18,
    "throughput": 1240
  },
  "optimized": {
    "avgWait": 31.4,
    "queueLength": 17,
    "avgSpeed": 26,
    "throughput": 1510
  }
}
```

### `chartHistory`
Array of recent trend points for Recharts.
Each point may include: `time`, `avgWait`, `queueLength`, `avgSpeed`, `co2`, and `throughput`.

Example:
```json
"chartHistory": [
  { "time": "18:41", "avgWait": 32.8, "queueLength": 18, "avgSpeed": 25, "co2": 34.5 },
  { "time": "18:42", "avgWait": 31.9, "queueLength": 17, "avgSpeed": 25.5, "co2": 34.2 }
]
```

## Notes
- The frontend is tolerant of missing optional fields and will continue rendering in mock mode.
- Road and junction congestion labels should match: `free`, `moderate`, `heavy`, `severe`.
- `warning` or additional fields may be added later,
  but this contract should remain the baseline for frontend data consumption.

## Event types

- `traffic_update`: normalized per-tick network state (default payload described above).
- `control_ack`: acknowledgement messages for control actions (e.g., forced green, timing overrides).
- `alert`: non-normalized warnings or system-level alerts (retain `message` and `level`).

Event consumers should ignore unknown `type` values to preserve forward-compatibility.

## Versioning and compatibility

- Add a top-level optional `version` string (semantic version or date) when introducing breaking changes.
- New fields MUST be additive; avoid removing or renaming existing keys without bumping `version`.
- Backwards-compatible transforms should be applied server-side when possible to keep frontend simple.

## Full payload example

```json
{
  "type": "traffic_update",
  "version": "1.0.0",
  "simulation": { "status": "running", "time": 1234, "mode": "optimized" },
  "metrics": { "avgWait": 31.4, "queueLength": 17, "throughput": 1510, "avgSpeed": 26 },
  "junctions": [
    {
      "id": "J1",
      "name": "Junction J1",
      "position": [12.9716, 77.5946],
      "aiControlActive": true,
      "overallCongestion": "moderate",
      "approaches": {
        "north": { "signal": "green", "countdown": 18, "queue": 23 }
      }
    }
  ],
  "roads": [ { "id": "R1-J1-J2", "from": "J1", "to": "J2", "coordinates": [[12.97,77.59],[12.975,77.6]], "congestion": "moderate" } ],
  "prediction": { "junctionId": "J1", "current": "moderate", "forecast30": "heavy", "forecast60": "severe" },
  "emergency": { "active": false },
  "comparison": { "baseline": { "avgWait": 48 }, "optimized": { "avgWait": 31.4 } },
  "chartHistory": [ { "time": "18:41", "avgWait": 32.8 } ]
}
```

## JSON Schema (validation)

A lightweight JSON Schema is provided to help backend and tests validate outgoing payloads. See `src/services/traffic_data_contract.schema.json` for the machine-readable schema.
