import { motion } from 'framer-motion';
import {
  APPROACH_LABELS,
  SIGNAL_LABELS,
  getSignalColor,
  getPrimaryApproach,
  formatBadgeText,
} from '../../utils/trafficUtils';

function Badge({ badge, aiAdjustment }) {
  const styles = {
    normal: 'bg-[#181818] text-[#B8B8B8]',
    ai_adjusted: 'bg-[#4E8CFF]/10 text-[#4E8CFF]',
    emergency: 'bg-[#FF4D4F]/10 text-[#FF4D4F]',
  };

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        styles[badge] ?? styles.normal
      }`}
    >
      {formatBadgeText(badge, aiAdjustment)}
    </span>
  );
}

function SignalEntry({ junction, isSelected, onSelect, mode }) {
  const [direction, approach] = getPrimaryApproach(junction);
  const signalColor = getSignalColor(approach.signal);
  const badge =
    mode === 'baseline' ? 'normal' : approach.badge ?? 'normal';

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(junction.id)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition-colors border ${
        isSelected
          ? 'border-[#4E8CFF]/20 bg-[#111827] ring-1 ring-[#4E8CFF]/20'
          : 'border-[#252D3A] bg-[#0D1118] hover:bg-[#181818]'
      }`}
    >
      <span className="w-8 shrink-0 text-sm font-bold text-[#FFFFFF]">{junction.id}</span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#B8B8B8]">{APPROACH_LABELS[direction]}</span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: signalColor }}
              aria-hidden="true"
            />
            <span className="text-xs font-semibold" style={{ color: signalColor }}>
              {SIGNAL_LABELS[approach.signal]}
            </span>
            <span className="text-xs text-[#B8B8B8]">{approach.countdown} sec</span>
          </span>
        </div>
      </div>

      <Badge badge={badge} aiAdjustment={approach.aiAdjustment} />
    </motion.button>
  );
}

export default function SignalControlPanel({
  junctions,
  selectedJunctionId,
  onSelectJunction,
  mode,
}) {
  return (
    <div className="rounded-[20px] border border-[#252D3A] bg-[#111111] p-4">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.34em] text-[#7E7E7E]">
        Live Signal Control
      </h3>
      <div className="flex flex-col gap-2">
        {junctions.map((junction) => (
          <SignalEntry
            key={junction.id}
            junction={junction}
            isSelected={junction.id === selectedJunctionId}
            onSelect={onSelectJunction}
            mode={mode}
          />
        ))}
      </div>
    </div>
  );
}
