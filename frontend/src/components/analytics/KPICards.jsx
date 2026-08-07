import { Activity, Clock3, Gauge, Leaf, TrendingUp, Zap } from 'lucide-react';

const lowerBetter = new Set(['avgWait', 'queueLength', 'co2']);
const higherBetter = new Set(['throughput', 'avgSpeed', 'efficiency']);

function formatMetricValue(metricKey, value) {
  if (metricKey === 'avgWait') return `${(value ?? 0).toFixed(1)} sec`;
  if (metricKey === 'throughput') return `${Math.round(value ?? 0)} veh/hr`;
  if (metricKey === 'efficiency') return `${(value ?? 0).toFixed(0)}%`;
  if (metricKey === 'queueLength') return `${Math.round(value ?? 0)} vehicles`;
  if (metricKey === 'avgSpeed') return `${(value ?? 0).toFixed(0)} km/h`;
  if (metricKey === 'co2') return `${(value ?? 0).toFixed(1)} kg`;
  return `${value ?? 0}`;
}

function formatMetricLabel(metricKey) {
  switch (metricKey) {
    case 'avgWait':
      return 'Average Wait';
    case 'throughput':
      return 'Throughput';
    case 'efficiency':
      return 'Traffic Efficiency';
    case 'queueLength':
      return 'Queue Length';
    case 'avgSpeed':
      return 'Avg Speed';
    case 'co2':
      return 'CO₂ Emissions';
    default:
      return metricKey;
  }
}

function getMetricIcon(metricKey) {
  switch (metricKey) {
    case 'avgWait':
      return Clock3;
    case 'throughput':
      return Activity;
    case 'efficiency':
      return TrendingUp;
    case 'queueLength':
      return Gauge;
    case 'avgSpeed':
      return Zap;
    case 'co2':
      return Leaf;
    default:
      return Activity;
  }
}

function computeImprovement(metricKey, comparison) {
  const baseline = comparison?.baseline?.[metricKey];
  const optimized = comparison?.optimized?.[metricKey];
  if (baseline == null || optimized == null || baseline === 0) return null;

  if (lowerBetter.has(metricKey)) {
    return ((baseline - optimized) / baseline) * 100;
  }

  if (higherBetter.has(metricKey)) {
    return ((optimized - baseline) / baseline) * 100;
  }

  return null;
}

export default function KPICards({ metrics, comparison }) {
  const metricEntries = ['avgWait', 'throughput', 'efficiency', 'queueLength', 'avgSpeed', 'co2'];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metricEntries.map((key) => {
        const value = metrics?.[key] ?? 0;
        const improvement = computeImprovement(key, comparison);
        const Icon = getMetricIcon(key);
        const improvementText = improvement == null ? 'N/A' : `${improvement >= 0 ? '↑' : '↓'}${Math.abs(improvement).toFixed(0)}%`;
        const isFavorable = improvement != null ? improvement >= 0 : false;

        return (
          <div key={key} className="rounded-[20px] border border-[#252D3A] bg-[#111111] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E7E7E]">
                  {formatMetricLabel(key)}
                </p>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-lg font-semibold tabular-nums text-[#FFFFFF]">
                    {formatMetricValue(key, value)}
                  </span>
                </div>
              </div>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#181818] text-[#B8B8B8]">
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  improvement == null
                    ? 'bg-[#111111] text-[#FFFFFF]'
                    : isFavorable
                    ? 'bg-traffic-free/10 text-traffic-free'
                    : 'bg-[#FF4D4F]/10 text-traffic-severe'
                }`}
              >
                {improvementText}
              </span>

              {key === 'efficiency' && (
                <span
                  className="text-[11px] text-[#7E7E7E]"
                  title="Composite traffic performance metric supplied by the optimization system."
                >
                  ⓘ
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
