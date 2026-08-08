/**
 * Mock traffic data for TrafficTwin AI.
 * All values are demonstration data — real values will come from SUMO/FastAPI.
 */

import { createInitialChartHistory } from '../utils/simulationEngine';

const APPROACH_TEMPLATE = (overrides = {}) => ({
  signal: 'green',
  countdown: 18,
  queue: 12,
  avgWait: 8,
  fixedGreen: 30,
  aiGreen: 30,
  aiAdjustment: 0,
  congestion: 'free',
  ...overrides,
});

export const initialTrafficState = {
  simulation: {
    status: 'paused',
    time: 1122,
    mode: 'optimized',
    storyPhase: 0,
  },

  metrics: {
    avgWait: 31.4,
    throughput: 1510,
    efficiency: 82,
    queueLength: 17,
    avgSpeed: 26,
    co2: 34.1,
  },

  comparison: {
    baseline: {
      avgWait: 48,
      queueLength: 27,
      avgSpeed: 18,
      throughput: 1240,
      efficiency: 64,
      co2: 42.5,
    },
    optimized: {
      avgWait: 31.4,
      queueLength: 17,
      avgSpeed: 26,
      throughput: 1510,
      efficiency: 82,
      co2: 34.1,
    },
  },

  chartHistory: createInitialChartHistory(),

  junctions: [
    {
      id: 'J1',
      name: 'Junction J1',
      position: [12.9716, 77.5946],
      aiControlActive: true,
      overallCongestion: 'moderate',
      approaches: {
        north: APPROACH_TEMPLATE({
          signal: 'green',
          countdown: 18,
          queue: 23,
          avgWait: 12,
          aiGreen: 42,
          aiAdjustment: 12,
          congestion: 'moderate',
          badge: 'ai_adjusted',
        }),
        south: APPROACH_TEMPLATE({
          signal: 'red',
          countdown: 14,
          queue: 8,
          avgWait: 6,
          congestion: 'free',
          badge: 'normal',
        }),
        east: APPROACH_TEMPLATE({
          signal: 'green',
          countdown: 22,
          queue: 15,
          avgWait: 9,
          aiGreen: 38,
          aiAdjustment: 8,
          congestion: 'moderate',
          badge: 'ai_adjusted',
        }),
        west: APPROACH_TEMPLATE({
          signal: 'red',
          countdown: 9,
          queue: 11,
          avgWait: 7,
          congestion: 'free',
          badge: 'normal',
        }),
      },
    },
    {
      id: 'J2',
      name: 'Junction J2',
      position: [12.975, 77.6],
      aiControlActive: true,
      overallCongestion: 'free',
      approaches: {
        north: APPROACH_TEMPLATE({ signal: 'red', countdown: 11, queue: 6, badge: 'normal' }),
        south: APPROACH_TEMPLATE({ signal: 'green', countdown: 24, queue: 9, badge: 'normal' }),
        east: APPROACH_TEMPLATE({
          signal: 'green',
          countdown: 24,
          queue: 10,
          avgWait: 7,
          badge: 'normal',
        }),
        west: APPROACH_TEMPLATE({ signal: 'red', countdown: 16, queue: 5, badge: 'normal' }),
      },
    },
    {
      id: 'J3',
      name: 'Junction J3',
      position: [12.968, 77.6],
      aiControlActive: true,
      overallCongestion: 'moderate',
      approaches: {
        north: APPROACH_TEMPLATE({
          signal: 'green',
          countdown: 11,
          queue: 14,
          aiGreen: 38,
          aiAdjustment: 8,
          congestion: 'moderate',
          badge: 'ai_adjusted',
        }),
        south: APPROACH_TEMPLATE({ signal: 'red', countdown: 19, queue: 7, badge: 'normal' }),
        east: APPROACH_TEMPLATE({ signal: 'red', countdown: 8, queue: 4, badge: 'normal' }),
        west: APPROACH_TEMPLATE({ signal: 'green', countdown: 31, queue: 12, badge: 'normal' }),
      },
    },
    {
      id: 'J4',
      name: 'Junction J4',
      position: [12.9716, 77.606],
      aiControlActive: true,
      overallCongestion: 'free',
      approaches: {
        north: APPROACH_TEMPLATE({ signal: 'red', countdown: 13, queue: 5, badge: 'normal' }),
        south: APPROACH_TEMPLATE({ signal: 'green', countdown: 20, queue: 8, badge: 'normal' }),
        east: APPROACH_TEMPLATE({ signal: 'red', countdown: 7, queue: 3, badge: 'normal' }),
        west: APPROACH_TEMPLATE({
          signal: 'green',
          countdown: 31,
          queue: 9,
          avgWait: 5,
          badge: 'normal',
        }),
      },
    },
  ],

  roads: [
    {
      id: 'R1-J1-J2',
      from: 'J1',
      to: 'J2',
      coordinates: [
        [12.9716, 77.5946],
        [12.9733, 77.5973],
        [12.975, 77.6],
      ],
      congestion: 'moderate',
    },
    {
      id: 'R2-J2-J4',
      from: 'J2',
      to: 'J4',
      coordinates: [
        [12.975, 77.6],
        [12.9733, 77.603],
        [12.9716, 77.606],
      ],
      congestion: 'free',
    },
    {
      id: 'R3-J1-J3',
      from: 'J1',
      to: 'J3',
      coordinates: [
        [12.9716, 77.5946],
        [12.9698, 77.5973],
        [12.968, 77.6],
      ],
      congestion: 'heavy',
    },
    {
      id: 'R4-J3-J4',
      from: 'J3',
      to: 'J4',
      coordinates: [
        [12.968, 77.6],
        [12.9698, 77.603],
        [12.9716, 77.606],
      ],
      congestion: 'moderate',
    },
    {
      id: 'R5-J1-J4',
      from: 'J1',
      to: 'J4',
      coordinates: [
        [12.9716, 77.5946],
        [12.9716, 77.6003],
        [12.9716, 77.606],
      ],
      congestion: 'free',
    },
  ],

  prediction: {
    junctionId: 'J1',
    approach: 'north',
    current: 'moderate',
    forecast30: 'heavy',
    forecast60: 'severe',
    confidence: 87,
    expectedQueue: 28,
  },

  emergency: {
    active: false,
    triggered: false,
    vehicleId: 'Ambulance-01',
    route: ['J1', 'J2', 'J3', 'J4'],
    routeCoordinates: [],
    currentJunction: null,
    progress: 0,
    estimatedClearance: 42,
    corridorStates: [],
  },

  aiDecisions: [
    {
      id: 'dec-1',
      time: '18:42:15',
      type: 'congestion_detected',
      message: 'High congestion detected',
      detail: 'J1 — North Approach',
    },
    {
      id: 'dec-2',
      time: '18:42:16',
      type: 'signal_optimization',
      message: 'Signal optimization',
      detail: 'Green duration: 30 sec → 42 sec',
      reason: 'High queue length',
    },
    {
      id: 'dec-3',
      time: '18:42:38',
      type: 'queue_reduced',
      message: 'Queue reduced',
      detail: '23 → 15 vehicles',
    },
  ],
};

export default initialTrafficState;
