import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import JunctionMarker from './JunctionMarker';
import MapLegend from './MapLegend';
import { getCongestionColor, getMapCenter } from '../../utils/trafficUtils';

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function TrafficMap({
  junctions,
  roads,
  selectedJunctionId,
  onSelectJunction,
}) {
  const center = getMapCenter(junctions);

  return (
    <div className="relative isolate z-0 h-[520px] w-full overflow-hidden rounded-[20px] border border-[#252D3A] bg-[#111111] lg:h-[640px]">
      <MapContainer
        center={center}
        zoom={15}
        className="relative z-0 h-full w-full"
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapResizeHandler />

        {roads.map((road) => (
          <Polyline
            key={road.id}
            positions={road.coordinates}
            pathOptions={{
              color: getCongestionColor(road.congestion),
              weight: 6,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        ))}

        {junctions.map((junction) => (
          <JunctionMarker
            key={junction.id}
            junction={junction}
            isSelected={junction.id === selectedJunctionId}
            onSelect={onSelectJunction}
          />
        ))}
      </MapContainer>

      <MapLegend />
    </div>
  );
}
