import { useEventManager } from '@/hooks/useEventManager';
import { useEffect, useState } from 'react';
import { PawprintIcon } from '../icons/PawprintIcon';
import { Event, EventBuilder } from 'thredlib';
import { SpotEvent } from '../events/SpotEvent';
import Image from 'next/image';

export function SpotMap() {
  const eventManager = useEventManager();
  const [events, setEvents] = useState<Event[]>([]);
  useEffect(() => {
    eventManager.subscribe(event => {
      setEvents([...events, event]);
    });
  });

  const onMapClick = (event: Event, location: google.maps.LatLng) => {
    eventManager.publish(
      EventBuilder.create({
        type: 'robot0',
        source: { id: 'robot0', name: 'Spot' },
        re: event.id,
        thredId: event.thredId,
      })
        .mergeValues({
          latitude: location.lat(),
          longitude: location.lng(),
          robotId: 'robot_id_0',
          videoStreamUrl: 'https://videos.pexels.com/video-files/3764259/3764259-hd_1280_720_60fps.mp4',
        })
        .build(),
    );
  };

  return (
    <div>
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl">Spot Client Map</h1>
        <Image
          src={'https://mfe-is.com/wp-content/uploads/2024/09/Boston-Dynamics-Spot-Featured-Image.png'}
          alt="Spot"
          width={300}
          height={300}
        />
        {events.map(event => {
          return <SpotEvent onSelect={onMapClick} key={event.id} event={event} />;
        })}
      </div>
    </div>
  );
}
