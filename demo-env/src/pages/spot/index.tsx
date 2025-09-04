import { SpotMap } from '@/components/maps/SpotMap';
import { EventProvider } from '@/providers/EventProvider';
import { MapProvider } from '@/providers/MapsProvider';

export default function SpotPage() {
  return (
    <EventProvider token="robot0">
      <MapProvider>
        <div className="items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
          <SpotMap />
        </div>
      </MapProvider>
    </EventProvider>
  );
}
