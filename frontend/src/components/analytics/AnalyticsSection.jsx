import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const metricDefinitions = [
  {
    key: 'avgWait',
    label: 'Average Wait',
    color: '#60A5FA',
    formatter: (value) => `${value?.toFixed(1) ?? 0} sec`,
  },
  {
    key: 'queueLength',
    label: 'Queue Length',
    color: '#F59E0B',
    formatter: (value) => `${Math.round(value ?? 0)} veh`,
  },
  {
    key: 'avgSpeed',
    label: 'Avg Speed',
    color: '#34D399',
    formatter: (value) => `${value?.toFixed(0) ?? 0} km/h`,
  },
  {
    key: 'throughput',
    label: 'Throughput',
    color: '#A78BFA',
    formatter: (value) => `${Math.round(value ?? 0)} veh/hr`,
  },
];

const severityOrder = {
  severe: 3,
  heavy: 2,
  moderate: 1,
  free: 0,
};

function getSeverityColor(level) {
  switch (level) {
    case 'severe':
      return 'bg-traffic-severe/10 text-traffic-severe';
    case 'heavy':
      return 'bg-traffic-heavy/10 text-traffic-heavy';
    case 'moderate':
      return 'bg-traffic-moderate/10 text-traffic-moderate';
    default:
      return 'bg-traffic-free/10 text-traffic-free';
  }
}

function getSeverityText(level) {
  switch (level) {
    case 'severe':
      return 'text-[#FF4D4F]';
    case 'heavy':
      return 'text-[#FF922B]';
    case 'moderate':
      return 'text-[#FFD43B]';
    default:
      return 'text-[#2DD36F]';
  }
}

export default function AnalyticsSection({ trafficState }) {
  const [selectedMetric, setSelectedMetric] = useState('avgWait');
  const metrics = trafficState?.metrics ?? {};
  const history = trafficState?.chartHistory ?? [];
  const junctions = trafficState?.junctions ?? [];
  const roads = trafficState?.roads ?? [];

  const selectedDefinition = metricDefinitions.find((item) => item.key === selectedMetric) ?? metricDefinitions[0];

  const stats = useMemo(() => {
    const values = history.map((point) => point[selectedMetric] ?? 0);
    const current = values[values.length - 1] ?? metrics[selectedMetric] ?? 0;
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : current;
    const peak = values.length ? Math.max(...values) : current;
    const change = values.length > 1 ? ((current - values[0]) / Math.max(values[0], 1)) * 100 : 0;
    const trend = change >= 0 ? `▲ +${change.toFixed(1)}%` : `▼ ${Math.abs(change).toFixed(1)}%`;

    return {
      current,
      average,
      peak,
      trend,
    };
  }, [history, metrics, selectedMetric]);

  const worstJunction = useMemo(() => {
    if (!junctions.length) return { id: 'N/A', label: 'N/A', congestion: 'free', wait: 0, queue: 0, speed: 0 };
    return [...junctions].sort((a, b) => {
      const aLevel = severityOrder[a.overallCongestion] ?? 0;
      const bLevel = severityOrder[b.overallCongestion] ?? 0;
      if (bLevel !== aLevel) return bLevel - aLevel;
      return (b.approaches?.north?.queue ?? 0) - (a.approaches?.north?.queue ?? 0);
    })[0];
  }, [junctions]);

  const congestionCounts = useMemo(() => {
    return roads.reduce(
      (acc, road) => {
        const level = road.congestion ?? 'free';
        acc[level] = (acc[level] ?? 0) + 1;
        return acc;
      },
      { free: 0, moderate: 0, heavy: 0, severe: 0 },
    );
  }, [roads]);

  const congestionLevels = [
    { key: 'free', label: 'Free Flow', count: congestionCounts.free, color: 'bg-traffic-free' },
    { key: 'moderate', label: 'Moderate', count: congestionCounts.moderate, color: 'bg-traffic-moderate' },
    { key: 'heavy', label: 'Heavy', count: congestionCounts.heavy, color: 'bg-traffic-heavy' },
    { key: 'severe', label: 'Severe', count: congestionCounts.severe, color: 'bg-traffic-severe' },
  ];

  return (
    <section id="analytics" className="section-anchor mb-24 py-8 lg:mb-24 lg:py-12">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7E7E7E]">
              LIVE TRAFFIC ANALYTICS
            </p>
            <h3 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#FFFFFF] sm:text-[32px]">
              Traffic performance over time
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#B8B8B8]">
              These metrics represent current and recent network conditions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {metricDefinitions.map((metric) => (
              <button
                key={metric.key}
                type="button"
                onClick={() => setSelectedMetric(metric.key)}
                className={`text-[11px] font-semibold uppercase tracking-[0.24em] transition-colors ${
                  selectedMetric === metric.key
                    ? 'text-[#4E8CFF] border-b-2 border-[#4E8CFF] pb-1'
                    : 'text-[#7E7E7E] hover:text-[#FFFFFF]'
                }`}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[#252D3A] bg-[#111111]/95 p-4">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7E7E7E]">
                    Traffic Performance Chart
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#FFFFFF]">{selectedDefinition.label}</p>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-sm text-[#B8B8B8]">
                  {[
                    ['Current', selectedDefinition.formatter(stats.current)],
                    ['Average', selectedDefinition.formatter(stats.average)],
                    ['Peak', selectedDefinition.formatter(stats.peak)],
                    ['Trend', stats.trend],
                  ].map(([label, value], index) => (
                    <div key={label} className="flex items-baseline gap-2">
                      <span className="text-[10px] uppercase tracking-[0.24em] text-[#7E7E7E]">{label}</span>
                      <span className="text-sm font-semibold text-[#FFFFFF]">{value}</span>
                      {index < 3 && <span className="h-4 w-px bg-white/10" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-[360px] w-full rounded-[20px] border border-[#252D3A] bg-[#090A12] p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={selectedDefinition.color} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={selectedDefinition.color} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: '#8B95A8', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#8B95A8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#11151D',
                        border: '1px solid #252D3A',
                        borderRadius: '0.75rem',
                        color: '#F4F7FB',
                      }}
                      labelStyle={{ color: '#F4F7FB' }}
                      formatter={(value) => [selectedDefinition.formatter(value), selectedDefinition.label]}
                    />
                    <Area type="monotone" dataKey={selectedMetric} stroke={selectedDefinition.color} fill="url(#metricFill)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[20px] border border-[#252D3A] bg-[#111111]/95 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7E7E7E]">
                  Junction Performance
                </p>
                <p className="text-[11px] text-[#B8B8B8]">
                  Worst: <span className="font-semibold text-[#FFFFFF]">{worstJunction.id}</span>
                </p>
              </div>

              <div className="mt-4 grid grid-cols-[70px_1.2fr_0.8fr_0.8fr_1fr] items-center gap-3 border-b border-[#252D3A] pb-3 text-[10px] uppercase tracking-[0.24em] text-[#7E7E7E]">
                <span>Junction</span>
                <span>Status</span>
                <span>Wait</span>
                <span>Queue</span>
                <span>Avg Speed</span>
              </div>

              <div className="mt-3">
                {junctions.map((junction, idx) => {
                  const isWorst = junction.id === worstJunction.id;
                  const queue = Object.values(junction.approaches ?? {}).reduce((sum, approach) => sum + (approach.queue ?? 0), 0);
                  const avgWait = Object.values(junction.approaches ?? {}).reduce((sum, approach) => sum + (approach.avgWait ?? 0), 0) / Math.max(Object.keys(junction.approaches ?? {}).length, 1);
                  const speed = junction.overallCongestion === 'free' ? 34 : junction.overallCongestion === 'moderate' ? 26 : junction.overallCongestion === 'heavy' ? 20 : 14;
                  return (
                    <div
                      key={junction.id}
                      className={`grid grid-cols-[70px_1.2fr_0.8fr_0.8fr_1fr] items-center gap-3 px-3 py-2 border-b border-[#252D3A] ${
                        isWorst ? 'border-l-2 border-[#4E8CFF] pl-2' : ''
                      }`}
                    >
                      <div>
                        <span className="text-sm font-semibold text-[#FFFFFF]">{junction.id}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${getSeverityText(junction.overallCongestion)}`} />
                        <span className={`text-sm font-semibold ${getSeverityText(junction.overallCongestion)}`}>{junction.overallCongestion}</span>
                      </div>

                      <div>
                        <span className="text-sm font-semibold text-[#FFFFFF]">{Math.round(avgWait)}s</span>
                      </div>

                      <div>
                        <span className="text-sm font-semibold text-[#FFFFFF]">{queue}</span>
                      </div>

                      <div>
                        <span className="text-sm font-semibold text-[#B8B8B8]">{speed} km/h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#252D3A] bg-[#111111]/95 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7E7E7E]">
                Network Traffic Status
              </p>
              <div className="mt-3 space-y-3">
                {congestionLevels.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 text-sm text-[#B8B8B8]">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-semibold text-[#FFFFFF]">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
