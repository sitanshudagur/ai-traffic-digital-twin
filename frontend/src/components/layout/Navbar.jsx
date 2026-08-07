import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { formatSimulationTime } from '../../utils/trafficUtils';

const NAV_LINKS = [
  { id: 'digital-twin', label: 'Digital Twin' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'prediction', label: 'Prediction' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'emergency', label: 'Emergency' },
];

function scrollToSection(id) {
  const element = document.getElementById(id);

  if (!element) return;

  const offset = 96;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({ top, behavior: 'smooth' });
}

export default function Navbar({
  isRunning,
  mode,
  simulationTime,
  onPlay,
  onPause,
  onReset,
  onModeChange,
}) {
  return (
    <nav className="sticky top-0 z-[1000] border-b border-white/5 bg-[#040404]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#4E8CFF]" aria-hidden="true" />
          <span className="truncate text-xs font-semibold uppercase tracking-[0.28em] text-[#FFFFFF] sm:text-sm">
            TrafficTwin AI
          </span>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToSection(link.id)}
              className="rounded-full px-3 py-2 text-[11px] font-medium uppercase tracking-[0.28em] text-[#B8B8B8] transition-colors duration-200 hover:bg-[#111111] hover:text-[#FFFFFF]"
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 md:gap-3">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <button
              type="button"
              onClick={() => onModeChange('baseline')}
              className={`text-[11px] font-semibold uppercase tracking-[0.24em] transition-colors duration-200 ${
                mode === 'baseline'
                  ? 'text-[#FFFFFF] border-b-[2px] border-[#FFFFFF] pb-[2px]'
                  : 'text-[#7E7E7E] hover:text-[#FFFFFF]'
              }`}
            >
              Baseline
            </button>
            <button
              type="button"
              onClick={() => onModeChange('optimized')}
              className={`text-[11px] font-semibold uppercase tracking-[0.24em] transition-colors duration-200 ${
                mode === 'optimized'
                  ? 'text-[#4E8CFF] border-b-[2px] border-[#4E8CFF] pb-[2px]'
                  : 'text-[#7E7E7E] hover:text-[#FFFFFF]'
              }`}
            >
              AI Optimized
            </button>
          </div>

          <div className="hidden h-6 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-2 whitespace-nowrap">
            <motion.span
              className="inline-flex h-2 w-2 rounded-full"
              animate={isRunning ? { opacity: [1, 0.4, 1] } : { opacity: 0.5 }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ backgroundColor: isRunning ? '#2DD36F' : '#7E7E7E' }}
            />
            <span className={`text-[11px] font-medium uppercase tracking-[0.24em] ${isRunning ? 'text-[#FFFFFF]' : 'text-[#7E7E7E]'}`}>
              {isRunning ? 'Live' : 'Paused'}
            </span>
          </div>

          <div className="hidden h-6 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPlay}
              aria-label="Play simulation"
              className="flex h-9 w-9 items-center justify-center rounded text-[#B8B8B8] transition-colors duration-200 hover:text-[#FFFFFF] hover:bg-white/5"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onPause}
              aria-label="Pause simulation"
              className="flex h-9 w-9 items-center justify-center rounded text-[#B8B8B8] transition-colors duration-200 hover:text-[#FFFFFF] hover:bg-white/5"
            >
              <Pause className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset simulation"
              className="flex h-9 w-9 items-center justify-center rounded text-[#B8B8B8] transition-colors duration-200 hover:text-[#FFFFFF] hover:bg-white/5"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <span className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-[#B8B8B8] sm:inline">
            {formatSimulationTime(simulationTime)}
          </span>
        </div>
      </div>
    </nav>
  );
}
