/** Traffic semantic color and formatting utilities */

export const CONGESTION_COLORS = {
  free: '#2DD36F',
  moderate: '#FFD43B',
  heavy: '#FF922B',
  severe: '#FF4D4F',
};

export const SIGNAL_COLORS = {
  green: '#2DD36F',
  yellow: '#FFD43B',
  red: '#FF4D4F',
  emergency: '#FF4D4F',
};

export const CONGESTION_LABELS = {
  free: 'Free Flow',
  moderate: 'Moderate',
  heavy: 'Heavy',
  severe: 'Severe',
};

export const SIGNAL_LABELS = {
  green: 'GREEN',
  yellow: 'YELLOW',
  red: 'RED',
  emergency: 'EMERGENCY',
};

export const APPROACH_LABELS = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
};

export const BADGE_LABELS = {
  normal: 'NORMAL',
  ai_adjusted: 'AI ADJUSTED',
  emergency: 'EMERGENCY',
};

export function getCongestionColor(level) {
  return CONGESTION_COLORS[level] ?? CONGESTION_COLORS.free;
}

export function getSignalColor(signal) {
  return SIGNAL_COLORS[signal?.toLowerCase()] ?? SIGNAL_COLORS.green;
}

export function formatSimulationTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export function formatBadgeText(badge, aiAdjustment = 0) {
  if (badge === 'emergency') return 'EMERGENCY';
  if (badge === 'ai_adjusted' && aiAdjustment > 0) return `AI +${aiAdjustment} sec`;
  return 'NORMAL';
}

export function getPrimaryApproach(junction) {
  const entries = Object.entries(junction.approaches);
  const green = entries.find(([, a]) => a.signal === 'green');
  return green ?? entries[0];
}

export function getMapCenter(junctions) {
  if (!junctions?.length) return [12.9716, 77.6];
  const lat = junctions.reduce((s, j) => s + j.position[0], 0) / junctions.length;
  const lng = junctions.reduce((s, j) => s + j.position[1], 0) / junctions.length;
  return [lat, lng];
}
