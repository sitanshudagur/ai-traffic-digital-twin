import { CONGESTION_COLORS, CONGESTION_LABELS } from '../../utils/trafficUtils';

const LEGEND_ITEMS = [
  { key: 'free', label: CONGESTION_LABELS.free },
  { key: 'moderate', label: CONGESTION_LABELS.moderate },
  { key: 'heavy', label: CONGESTION_LABELS.heavy },
  { key: 'severe', label: CONGESTION_LABELS.severe },
];

export default function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] rounded-[16px] border border-white/10 bg-[#090A0E]/85 px-3 py-2 text-[#FFFFFF] shadow-none backdrop-blur-sm">
      <div className="flex items-center gap-3 text-[11px]">
        {LEGEND_ITEMS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2 whitespace-nowrap">
            <span
              className="h-1.5 w-5 rounded-full"
              style={{ backgroundColor: CONGESTION_COLORS[key] }}
            />
            <span className="text-[#FFFFFF]/90">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
