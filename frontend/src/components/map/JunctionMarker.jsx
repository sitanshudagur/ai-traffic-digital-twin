import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getCongestionColor, SIGNAL_LABELS } from '../../utils/trafficUtils';

function createJunctionIcon(junction, isSelected) {
  const defaultColor = getCongestionColor(junction.overallCongestion);
  const size = isSelected ? 34 : 30;
  const borderColor = isSelected ? '#4E8CFF' : defaultColor;
  const ring = isSelected
    ? 'box-shadow: 0 0 0 2px rgba(78,140,255,0.18);'
    : '';

  return L.divIcon({
    className: 'junction-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: #10131A;
        border: 2px solid ${borderColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        color: #F4F7FB;
        font-family: Inter, system-ui, sans-serif;
        ${ring}
      ">
        ${junction.id}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function JunctionMarker({ junction, isSelected, onSelect }) {
  const greenApproach = Object.values(junction.approaches).find(
    (a) => a.signal === 'green',
  );

  return (
    <Marker
      position={junction.position}
      icon={createJunctionIcon(junction, isSelected)}
      eventHandlers={{
        click: () => onSelect(junction.id),
      }}
    >
      <Popup className="junction-popup">
        <div className="text-xs">
          <p className="font-semibold">{junction.name}</p>
          <p className="text-gray-500">
            Signal: {SIGNAL_LABELS[greenApproach?.signal ?? 'green']}
            {greenApproach ? ` • ${greenApproach.countdown} sec` : ''}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}
