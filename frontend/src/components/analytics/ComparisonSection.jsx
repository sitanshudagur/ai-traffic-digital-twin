const metricKeys = [
  { key: 'avgWait', label: 'Average Wait Time', unit: 'sec', lowerBetter: true },
  { key: 'queueLength', label: 'Queue Length', unit: 'veh', lowerBetter: true },
  { key: 'throughput', label: 'Throughput', unit: 'veh/hr', lowerBetter: false },
  { key: 'avgSpeed', label: 'Average Speed', unit: 'km/h', lowerBetter: false },
];

function formatMetricValue(metricKey, value) {
  if (metricKey === 'avgWait') return `${value?.toFixed(1) ?? 0} sec`;
  if (metricKey === 'throughput') return `${Math.round(value ?? 0)} veh/hr`;
  if (metricKey === 'queueLength') return `${Math.round(value ?? 0)} veh`;
  if (metricKey === 'avgSpeed') return `${value?.toFixed(0) ?? 0} km/h`;
  return `${value ?? 0}`;
}

function computeImprovement(metricKey, baseline, optimized, lowerBetter) {
  if (baseline == null || optimized == null || baseline === 0) return null;
  const delta = lowerBetter ? (baseline - optimized) : (optimized - baseline);
  return (delta / baseline) * 100;
}

export default function ComparisonSection({ comparison }) {
  const baseline = comparison?.baseline ?? {};
  const optimized = comparison?.optimized ?? {};

  const rows = metricKeys.map((metric) => {
    const baselineValue = baseline[metric.key] ?? 0;
    const optimizedValue = optimized[metric.key] ?? 0;
    const improvement = computeImprovement(metric.key, baselineValue, optimizedValue, metric.lowerBetter);
    return {
      ...metric,
      baselineValue,
      optimizedValue,
      improvement,
    };
  });

  const summaryItems = rows.map((r) => {
    if (r.improvement == null) return null;
    const positive = r.improvement > 0;
    const arrow = r.lowerBetter ? (positive ? '↓' : '↑') : (positive ? '↑' : '↓');
    return {
      key: r.key,
      label: r.label,
      text: `${arrow} ${Math.abs(r.improvement).toFixed(0)}%`,
      positive,
    };
  }).filter(Boolean);

  return (
    <section id="comparison" className="section-anchor mb-12 py-8 lg:mb-12 lg:py-10">
      <div className="max-w-6xl">
        <div className="mb-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.34em] text-[#7E7E7E]">PERFORMANCE COMPARISON</p>
          <h3 className="mt-1 text-[22px] font-semibold text-[#FFFFFF]">Baseline vs AI Optimized</h3>
          <p className="mt-2 text-sm text-[#B8B8B8] max-w-2xl">Compare fixed-timer traffic signal performance with AI-optimized control under the same traffic conditions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((row) => {
            const imp = row.improvement;
            const hasImp = imp != null;
            const positive = hasImp ? (imp > 0) : false;
            const arrowSym = row.lowerBetter ? (positive ? '↓' : '↑') : (positive ? '↑' : '↓');
            const impText = hasImp ? `${Math.abs(imp).toFixed(1)}%` : 'N/A';
            return (
              <div key={row.key} className="bg-[#111111] rounded-[20px] p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#B8B8B8]">{row.label}</p>

                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#7E7E7E]">Baseline</p>
                    <p className="mt-1 text-lg font-semibold text-[#B8B8B8]">{formatMetricValue(row.key, row.baselineValue)}</p>
                  </div>

                  <div className="text-center text-[#7E7E7E] text-xl">→</div>

                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#4E8CFF]">AI Optimized</p>
                    <p className="mt-1 text-lg font-semibold text-[#FFFFFF]">{formatMetricValue(row.key, row.optimizedValue)}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className={`text-sm font-medium ${hasImp ? (positive ? 'text-[#2DD36F]' : 'text-[#FF4D4F]') : 'text-[#7E7E7E]'}`}>{hasImp ? `${arrowSym} ${impText}` : 'N/A'}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#7E7E7E]">OPTIMIZATION IMPACT</p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            {summaryItems.length ? summaryItems.map((s) => (
              <div key={s.key} className={`font-semibold ${s.positive ? 'text-[#2DD36F]' : 'text-[#FF4D4F]'}`}>
                <span className="mr-2">{s.text}</span>
                <span className="text-[#B8B8B8]">{s.label.replace(/\b(Avg|Average)\b/g, 'Avg')}</span>
              </div>
            )) : <span className="text-[#7E7E7E]">No comparison data available</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
