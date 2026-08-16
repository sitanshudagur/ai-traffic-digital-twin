/**
 * Traffic data service layer.
 * Connects to live FastAPI WebSocket with fallback to mock data.
 */

import { initialTrafficState } from '../data/mockTrafficData';
import { createSocketClient } from './socketClient';

function deepClone(state) {
  return JSON.parse(JSON.stringify(state));
}

class TrafficService {
  constructor() {
    this.state = deepClone(initialTrafficState);
    this.listeners = new Set();
    this.isLiveConnected = false;
    this.connectionListeners = new Set();

    // Initialize live WebSocket client
    this.client = createSocketClient('ws://127.0.0.1:8000/ws');
    this.client.onOpen(() => {
      this.isLiveConnected = true;
      console.log('[trafficService] Connected to live Digital Twin backend');
      this.notifyConnection(true);
    });

    this.client.onClose(() => {
      this.isLiveConnected = false;
      console.log('[trafficService] Disconnected from backend, operating in offline/mock mode');
      this.notifyConnection(false);
    });

    this.client.onMessage((data) => {
      if (data?.type === 'traffic_update') {
        const normalized = this.normalizeWebSocketMessage(data);
        this.state = normalized;
        this.notify();
      }
    });

    // Auto-connect WebSocket in browser environment
    if (typeof window !== 'undefined') {
      this.client.connect();
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeConnection(listener) {
    this.connectionListeners.add(listener);
    listener(this.isLiveConnected);
    return () => this.connectionListeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  notifyConnection(status) {
    this.connectionListeners.forEach((fn) => fn(status));
  }

  setState(updater) {
    this.state = typeof updater === 'function' ? updater(this.state) : updater;
    this.notify();
  }

  reset() {
    this.state = deepClone(initialTrafficState);
    this.notify();
  }

  sendAction(action, payload = {}) {
    if (this.isLiveConnected) {
      this.client.send({ action, ...payload });
    }
  }

  /**
   * Normalizes incoming WebSocket payload from FastAPI backend to match frontend state.
   */
  normalizeWebSocketMessage(message) {
    return {
      simulation: {
        status: message.simulation?.status ?? message.status ?? this.state.simulation.status,
        time: message.simulation?.time ?? message.simulation_time ?? this.state.simulation.time,
        mode: message.simulation?.mode ?? message.mode ?? this.state.simulation.mode,
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

export const trafficService = new TrafficService();
export default trafficService;
