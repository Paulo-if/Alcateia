import { MapPin } from 'lucide-react';

interface Props {
  address: string;
  mapsUrl: string;
}

export function LocationMap({ address, mapsUrl }: Props) {
  return (
    <a
      className="map-card"
      href={mapsUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Abrir localização no Google Maps — ${address}`}
    >
      <span className="map-visual" aria-hidden="true">
        <span className="map-pin">
          <MapPin size={30} />
        </span>
      </span>
      <span className="map-address">{address}</span>
    </a>
  );
}