import { useCallback, useEffect, useRef, useState } from 'react';
import trafficService from '../services/trafficService';
import { tickSimulation } from '../utils/simulationEngine';

/**
 * Hook providing traffic state, simulation controls, and live/mock updates.
 */
export function useTrafficSimulation() {
  const [trafficState, setTrafficState] = useState(trafficService.getState());
  const [isLive, setIsLive] = useState(trafficService.isLiveConnected);
  const [selectedJunctionId, setSelectedJunctionId] = useState('J1');
  const intervalRef = useRef(null);

  useEffect(() => {
    const unsubState = trafficService.subscribe(setTrafficState);
    const unsubConn = trafficService.subscribeConnection(setIsLive);
    return () => {
      unsubState();
      unsubConn();
    };
  }, []);

  // Only run client-side mock ticker if NOT connected to live backend WebSocket
  useEffect(() => {
    if (isLive || trafficState.simulation.status !== 'running') {
      clearInterval(intervalRef.current);
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      trafficService.setState((prev) => tickSimulation(prev));
    }, 1500);

    return () => clearInterval(intervalRef.current);
  }, [isLive, trafficState.simulation.status]);

  const play = useCallback(() => {
    trafficService.sendAction('play');
    trafficService.setState((prev) => ({
      ...prev,
      simulation: { ...prev.simulation, status: 'running' },
    }));
  }, []);

  const pause = useCallback(() => {
    trafficService.sendAction('pause');
    trafficService.setState((prev) => ({
      ...prev,
      simulation: { ...prev.simulation, status: 'paused' },
    }));
  }, []);

  const reset = useCallback(() => {
    trafficService.sendAction('reset');
    trafficService.reset();
    setSelectedJunctionId('J1');
  }, []);

  const setMode = useCallback((mode) => {
    trafficService.sendAction('set_mode', { mode });
    trafficService.setState((prev) => ({
      ...prev,
      simulation: { ...prev.simulation, mode },
    }));
  }, []);

  const selectJunction = useCallback((junctionId) => {
    setSelectedJunctionId(junctionId);
  }, []);

  const selectedJunction =
    trafficState.junctions.find((j) => j.id === selectedJunctionId) ??
    trafficState.junctions[0];

  return {
    trafficState,
    selectedJunctionId,
    selectedJunction,
    selectJunction,
    play,
    pause,
    reset,
    setMode,
    isRunning: trafficState.simulation.status === 'running',
    mode: trafficState.simulation.mode,
    simulationTime: trafficState.simulation.time,
    isLive,
  };
}

export default useTrafficSimulation;
