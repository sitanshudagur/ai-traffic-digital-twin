import { AlertTriangle, ShieldAlert } from 'lucide-react';

function safeText(value, fallback = '—') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function statusColors(state) {
  // Map corridor statuses or generic keywords to colors per design tokens
  const s = String(state ?? '').toLowerCase();
  if (s.includes('passed') || s.includes('cleared') || s === 'passed') return '#2DD36F';
  if (s.includes('priority') || s.includes('green')) return '#2DD36F';
  if (s.includes('current') || s === 'current') return '#FFFFFF';
  return '#7E7E7E';
}

export default function EmergencySection({ emergency }) {
  const active = Boolean(emergency?.active);

  const route = Array.isArray(emergency?.route) && emergency.route.length ? emergency.route : (Array.isArray(emergency?.corridorStates) ? emergency.corridorStates.map((c) => c.junctionId) : []);
  const corridorMap = (Array.isArray(emergency?.corridorStates) ? emergency.corridorStates : []).reduce((acc, c) => {
    acc[c.junctionId] = c;
    return acc;
  }, {});

  return (
    <section id="emergency" className="section-anchor mb-12 py-8 lg:mb-12 lg:py-10">
      <div className="max-w-6xl">
        <div className="mb-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.34em] text-[#7E7E7E]">EMERGENCY RESPONSE</p>
          <h3 className="mt-1 text-[22px] font-semibold text-[#FFFFFF]">Emergency Green Corridor</h3>
          <p className="mt-2 text-sm text-[#B8B8B8] max-w-2xl">Visualize signal priority and corridor activation for detected emergency vehicles.</p>
        </div>

        {/* Inactive compact state */}
        {!active && (
          <div className="mt-4 flex items-center gap-4">
            <span className="inline-flex h-3 w-3 rounded-full bg-[#2DD36F]" />
            <div>
              <p className="text-sm font-semibold text-[#FFFFFF]">SYSTEM READY</p>
              <p className="text-sm text-[#B8B8B8]">No emergency vehicle detected. Green Corridor will activate automatically.</p>
            </div>
          </div>
        )}

        {/* Active state */}
        {active && (
          <div className="mt-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#FF4D4F] uppercase tracking-[0.18em]">EMERGENCY VEHICLE DETECTED</p>
                <p className="mt-1 text-sm font-semibold text-[#2DD36F] uppercase tracking-[0.18em]">GREEN CORRIDOR ACTIVE</p>
                <p className="mt-2 text-sm text-[#B8B8B8]">{safeText(emergency.vehicleId ? `Vehicle ${emergency.vehicleId} detected on route` : 'An emergency vehicle is on the network')}</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#7E7E7E]">Current Junction</p>
                <p className="mt-1 text-sm font-semibold text-[#FFFFFF]">{safeText(emergency.currentJunction, 'Unknown')}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[#7E7E7E]">Est. clearance</p>
                <p className="mt-1 text-sm font-semibold text-[#FFFFFF]">{emergency.estimatedClearance != null ? `${emergency.estimatedClearance} sec` : '—'}</p>
              </div>
            </div>

            {/* Info grid: Vehicle / Progress */}
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#7E7E7E]">Vehicle</p>
                <p className="mt-1 text-sm font-semibold text-[#FFFFFF]">{safeText(emergency.vehicleId, 'Unknown')}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#7E7E7E]">Progress</p>
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-[#181818] overflow-hidden">
                    <div style={{ width: `${Math.max(0, Math.min(100, Number(emergency?.progress ?? 0)))}%` }} className="h-2 bg-[#2DD36F] transition-all" />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#FFFFFF]">{emergency.progress != null ? `${Math.round(emergency.progress)}%` : '—'}</p>
                </div>
              </div>
            </div>

            {/* Route visualization */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#7E7E7E] mb-2">Route</p>
              {route.length ? (
                <div className="flex items-center gap-2 overflow-x-auto py-2">
                  {route.map((junctionId, idx) => {
                    const cs = corridorMap[junctionId];
                    let status = cs?.status;
                    if (!status) {
                      if (emergency?.progress != null) {
                        const passedCount = Math.floor(route.length * (Number(emergency.progress) / 100));
                        status = idx < passedCount ? 'passed' : 'upcoming';
                      } else {
                        status = 'upcoming';
                      }
                    }
                    const color = statusColors(status);
                    const isCurrent = String(junctionId) === String(emergency.currentJunction);
                    return (
                      <div key={junctionId} className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <div className={`h-3 w-3 rounded-full ${isCurrent ? 'ring-2 ring-[#4E8CFF]' : ''}`} style={{ backgroundColor: isCurrent ? '#FFFFFF' : color }} />
                          <p className="mt-1 text-[10px] text-[#B8B8B8]">{junctionId}</p>
                          <p className="mt-0.5 text-[10px] text-[#7E7E7E]">{safeText(status).replace(/_/g, ' ')}</p>
                        </div>
                        {idx < route.length - 1 && (
                          <div className={`flex-1 h-[2px] ${statusColors((corridorMap[route[idx]] || {}).status) === '#2DD36F' ? 'bg-[#2DD36F]' : 'bg-[#7E7E7E]'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#B8B8B8]">Route details are not available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
