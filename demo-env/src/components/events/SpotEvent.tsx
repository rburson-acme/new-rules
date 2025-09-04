import { GoogleMap, Marker } from '@react-google-maps/api';
import { useState } from 'react';
import { Event } from 'thredlib';

const defaultMapContainerStyle = {
  width: '350px',
  height: '250px',
  borderRadius: '8px',
};

const defaultMapCenter = {
  lat: 40.90210372955823,
  lng: -80.84387312133761,
};

type SpotEventProps = {
  event: Event;
  onSelect: (event: Event, location: google.maps.LatLng) => void;
};
export function SpotEvent({ event, onSelect }: SpotEventProps) {
  const [spotLocation, setSpotLocation] = useState<google.maps.LatLng | null>(null);
  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || spotLocation) return;
    setSpotLocation(e.latLng);
  };

  return (
    <div key={event.id} className="flex flex-col gap-4 items-center">
      <div className="flex flex-row items-center justify-center gap-4">
        <p>{new Date(event.time ? event.time : 0).toLocaleTimeString()}</p>
        <button
          onClick={() => alert(JSON.stringify(event, null, 2))}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded">
          View Event
        </button>
      </div>
      {!spotLocation ? <p>Spot has received the command {event.data?.title} from the {event.source.name}</p> : null}
      <GoogleMap
        mapContainerStyle={defaultMapContainerStyle}
        center={defaultMapCenter}
        onClick={e => {
          if (!e.latLng || spotLocation) return;
          setSpotLocation(e.latLng);
          onSelect(event, e.latLng);
        }}
        zoom={12}
        options={{
          zoomControl: false,
          scaleControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          minZoom: 12,
          tilt: 0,
        }}>
        {spotLocation && (
          <Marker
            position={spotLocation}
            icon={{
              url: 'https://www.svgrepo.com/show/364732/paw-print-fill.svg',
              scaledSize: new window.google.maps.Size(50, 50),
              anchor: new window.google.maps.Point(25, 25),
            }}
          />
        )}
      </GoogleMap>
      {spotLocation ? (
        <div>
          <p>
            Spot is currently located at {spotLocation.lat()}, {spotLocation.lng()}
          </p>
        </div>
      ) : null}
    </div>
  );
}
