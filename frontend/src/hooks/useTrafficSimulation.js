import { useCallback, useEffect, useRef, useState } from 'react';
import trafficService from '../services/trafficService';
import { tickSimulation } from '../utils/simulationEngine';

/**
 * Hook providing traffic state, simulation controls, and live mock updates.
 */
export function useTrafficSimulation() {
  const [trafficState, setTrafficState] = useState(trafficService.getState());
  const [selectedJunctionId, setSelectedJunctionId] = useState('J1');
  const intervalRef = useRef(null);

  useEffect(() => {
    return trafficService.subscribe(setTrafficState);
  }, []);

  useEffect(() => {
    if (trafficState.simulation.status !== 'running') {
      clearInterval(intervalRef.current);
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      trafficService.setState((prev) => tickSimulation(prev));
    }, 1500);

    return () => clearInterval(intervalRef.current);
  }, [trafficState.simulation.status]);

  const play = useCallback(() => {
    trafficService.setState((prev) => ({
      ...prev,
      simulation: { ...prev.simulation, status: 'running' },
    }));
  }, []);

  const pause = useCallback(() => {
    trafficService.setState((prev) => ({
      ...prev,
      simulation: { ...prev.simulation, status: 'paused' },
    }));
  }, []);

  const reset = useCallback(() => {
    trafficService.reset();
    setSelectedJunctionId('J1');
  }, []);

  const setMode = useCallback((mode) => {
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
  };
}

export default useTrafficSimulation;
