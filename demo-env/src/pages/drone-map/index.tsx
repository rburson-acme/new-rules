import { Map } from '@/components/map/Map';
import { EventProvider } from '@/providers/EventProvider';
import { MapProvider } from '@/providers/MapsProvider';

export default function DroneMapPage() {
  return (
    <EventProvider token="sensor_agent0">
      <MapProvider>
        <div className="items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
          <Map />
        </div>
      </MapProvider>
    </EventProvider>
  );
}
