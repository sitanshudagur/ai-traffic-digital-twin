import { motion } from 'framer-motion';
import {
  APPROACH_LABELS,
  CONGESTION_LABELS,
  SIGNAL_LABELS,
  getSignalColor,
} from '../../utils/trafficUtils';

function SignalBadge({ signal, countdown }) {
  const color = getSignalColor(signal);
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-sm font-semibold" style={{ color }}>
        {SIGNAL_LABELS[signal] ?? signal.toUpperCase()}
      </span>
      <span className="text-sm text-[#7E7E7E]">• {countdown} sec</span>
    </div>
  );
}

function ApproachCard({ direction, approach, mode }) {
  const showAi = mode === 'optimized' && approach.aiAdjustment > 0;

  return (
    <div className="rounded-[18px] border border-[#252D3A] bg-[#0D1118] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#7E7E7E]">
            {APPROACH_LABELS[direction]} Approach
          </p>
          <p className="mt-1 text-sm font-semibold text-[#FFFFFF]">
            {CONGESTION_LABELS[approach.congestion]}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#111111] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B8B8B8]">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getSignalColor(approach.signal) }} />
          {SIGNAL_LABELS[approach.signal]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-[#FFFFFF]">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[#7E7E7E]">Countdown</p>
          <p className="font-semibold">{approach.countdown} sec</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[#7E7E7E]">Queue</p>
          <p className="font-semibold">{approach.queue} vehicles</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[#7E7E7E]">Average Wait</p>
          <p className="font-semibold">{approach.avgWait} sec</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[#7E7E7E]">Fixed Green</p>
          <p className="font-semibold">{approach.fixedGreen} sec</p>
        </div>
        {showAi && (
          <> 
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.26em] text-[#4E8CFF]">AI Green</p>
              <p className="font-semibold text-[#4E8CFF]">{approach.aiGreen} sec</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.26em] text-[#4E8CFF]">AI Adjustment</p>
              <p className="font-semibold text-[#4E8CFF]">+{approach.aiAdjustment} sec</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function JunctionDetails({ junction, mode }) {
  if (!junction) {
    return (
      <div className="rounded-[20px] border border-[#252D3A] bg-[#111111] p-4">
        <p className="text-sm text-[#B8B8B8]">Select a junction on the map</p>
      </div>
    );
  }

  return (
    <motion.div
      key={junction.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 rounded-[20px] border border-[#252D3A] bg-[#111111] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#252D3A] pb-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[#FFFFFF]">{junction.name}</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#7E7E7E]">
            <span>{junction.location}</span>
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#7E7E7E]">
              <span className="h-2 w-2 rounded-full bg-[#2DD36F]" aria-hidden="true" />
              {junction.overallCongestion}
            </span>
          </div>
        </div>
        {mode === 'optimized' && junction.aiControlActive && (
          <span className="rounded-full border border-[#4E8CFF]/20 bg-[#111827] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4E8CFF]">
            AI Control Active
          </span>
        )}
        {mode === 'baseline' && (
          <span className="rounded-full border border-[#252D3A] bg-[#111827] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#B8B8B8]">
            Fixed Timing
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {Object.entries(junction.approaches).map(([direction, approach]) => (
          <ApproachCard
            key={direction}
            direction={direction}
            approach={approach}
            mode={mode}
          />
        ))}
      </div>
    </motion.div>
  );
}
