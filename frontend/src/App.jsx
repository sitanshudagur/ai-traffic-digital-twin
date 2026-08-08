import Navbar from './components/layout/Navbar';
import SectionHeader from './components/layout/SectionHeader';
import TrafficMap from './components/map/TrafficMap';
import JunctionDetails from './components/traffic/JunctionDetails';
import SignalControlPanel from './components/traffic/SignalControlPanel';
import KPICards from './components/analytics/KPICards';
import SystemStatusStrip from './components/analytics/SystemStatusStrip';
import AnalyticsSection from './components/analytics/AnalyticsSection';
import CongestionPrediction from './components/analytics/CongestionPrediction';
import ComparisonSection from './components/analytics/ComparisonSection';
import EmergencySection from './components/analytics/EmergencySection';
import useTrafficSimulation from './hooks/useTrafficSimulation';

export default function App() {
  const {
    trafficState,
    selectedJunctionId,
    selectedJunction,
    selectJunction,
    play,
    pause,
    reset,
    setMode,
    isRunning,
    mode,
    simulationTime,
  } = useTrafficSimulation();

  return (
    <div className="min-h-screen bg-[#040404]">
      <Navbar
        isRunning={isRunning}
        mode={mode}
        simulationTime={simulationTime}
        onPlay={play}
        onPause={pause}
        onReset={reset}
        onModeChange={setMode}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section id="digital-twin" className="section-anchor py-16 lg:py-20">
          <SectionHeader
            eyebrow="LIVE DIGITAL TWIN"
            heading="Real-time traffic network"
            description="This view represents live junction, road, signal, and congestion conditions."
            badge={mode === 'optimized' ? 'AI Optimized' : 'Baseline Mode'}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:gap-5">
            <div className="flex min-w-0 flex-col gap-3">
              <TrafficMap
                junctions={trafficState.junctions}
                roads={trafficState.roads}
                selectedJunctionId={selectedJunctionId}
                onSelectJunction={selectJunction}
              />
              <SystemStatusStrip
                isRunning={isRunning}
                mode={mode}
                signalsOnline={4}
                connectedVehicles={152}
                updateRate="1 sec"
              />
              <KPICards metrics={trafficState.metrics} comparison={trafficState.comparison} />
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <JunctionDetails junction={selectedJunction} mode={mode} />
              <SignalControlPanel
                junctions={trafficState.junctions}
                selectedJunctionId={selectedJunctionId}
                onSelectJunction={selectJunction}
                mode={mode}
              />
            </div>
          </div>
        </section>

        <AnalyticsSection trafficState={trafficState} />
        <CongestionPrediction prediction={trafficState.prediction} />
        <ComparisonSection comparison={trafficState.comparison} />
        <EmergencySection emergency={trafficState.emergency} />
      </main>
    </div>
  );
}
