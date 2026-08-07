/**
 * Traffic data service layer.
 *
 * Currently uses mock data. To connect FastAPI WebSocket:
 * 1. Replace MockTrafficService with WebSocketTrafficService
 * 2. Use socketClient.js to receive normalized traffic_update messages
 * 3. UI components remain unchanged — they consume normalized state only
 */

import { initialTrafficState } from '../data/mockTrafficData';

function deepClone(state) {
  return JSON.parse(JSON.stringify(state));
}

class MockTrafficService {
  constructor() {
    this.state = deepClone(initialTrafficState);
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  setState(updater) {
    this.state = typeof updater === 'function' ? updater(this.state) : updater;
    this.notify();
  }

  reset() {
    this.state = deepClone(initialTrafficState);
    this.notify();
  }

  /**
   * Future: normalize WebSocket payload from FastAPI
   * @param {object} message - e.g. { type: "traffic_update", simulation_time, metrics, junctions, ... }
   */
  normalizeWebSocketMessage(message) {
    return {
      simulation: {
        status: message.status ?? this.state.simulation.status,
        time: message.simulation_time ?? this.state.simulation.time,
        mode: message.mode ?? this.state.simulation.mode,
      },
      metrics: message.metrics ?? this.state.metrics,
      junctions: message.junctions ?? this.state.junctions,
      roads: message.roads ?? this.state.roads,
      prediction: message.prediction ?? this.state.prediction,
      emergency: message.emergency ?? this.state.emergency,
      aiDecisions: message.aiDecisions ?? this.state.aiDecisions,
      comparison: message.comparison ?? this.state.comparison,
      chartHistory: message.chartHistory ?? this.state.chartHistory,
    };
  }
}

export const trafficService = new MockTrafficService();
export default trafficService;
