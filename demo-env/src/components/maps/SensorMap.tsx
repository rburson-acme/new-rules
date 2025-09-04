'use client';
import { Circle, GoogleMap, Marker } from '@react-google-maps/api';
import { useEffect, useState } from 'react';
import { EventBuilder } from 'thredlib';
import { nanoid } from 'nanoid';
import { useEventManager } from '@/hooks/useEventManager';
import Link from 'next/link';

type EntityType = 'drone' | 'enemy';
type MapEntity = google.maps.LatLng & { seen: boolean; type: EntityType };
type MapSetMode = 'sensor' | 'drone' | 'enemy';
export const defaultMapContainerStyle = {
  width: '100%',
  height: '80vh',
  borderRadius: '8px',
};

const defaultMapCenter = {
  lat: 40.90210372955823,
  lng: -80.84387312133761,
};

export function SensorMap() {
  const [sensors, setSensors] = useState<google.maps.LatLng[]>([]);
  const [entites, setEntities] = useState<MapEntity[]>([]);
  const [mode, setMode] = useState<MapSetMode>('sensor');
  const [showCircles, setShowCircles] = useState<boolean>(false);

  const EventManager = useEventManager();

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    if (mode === 'sensor') {
      setSensors([...sensors, e.latLng]);
    } else if (mode === 'drone' || mode === 'enemy') {
      const drone: MapEntity = Object.assign(e.latLng, { seen: false, type: mode });
      setEntities([...entites, drone]);
    }
  };

  const onSensorClick = (e: google.maps.MapMouseEvent) => {
    const marker = sensors.find(marker => marker === e.latLng);
    if (marker) {
      setSensors(sensors.filter(marker => marker !== e.latLng));
    }
  };

  const onEntityClick = (e: google.maps.MapMouseEvent) => {
    const marker = entites.find(marker => marker === e.latLng);
    if (marker) {
      setEntities(entites.filter(marker => marker !== e.latLng));
    }
  };

  const removeEntityType = (type: EntityType) => {
    setEntities(entites.filter(marker => marker.type !== type));
  };
  const activeStyle = 'bg-blue-500 text-black';
  const inactiveStyle = 'bg-gray-300 text-black';

  const buttonStyle = 'px-4 py-2 rounded-lg';

  useEffect(() => {
    if (sensors.length === 0 || entites.length === 0) return;
    checkForEntities();
  }, [entites.length, sensors.length]);

  function checkForEntities() {
    sensors.forEach((sensor, index) => {
      entites.forEach(entity => {
        if (google.maps.geometry.spherical.computeDistanceBetween(sensor, entity) < 50) {
          //if enemy has not been seen, call sendEnemy
          if (!entity.seen) {
            switch (entity.type) {
              case 'drone':
                sendDrone(entity, index);
                break;
              case 'enemy':
                sendEnemy(entity, index);
                break;
            }
            entity.seen = true;
            setEntities([...entites]);
          }
        }
      });
    });
  }

  function sendDrone(drone: google.maps.LatLng, sensorId: number) {
    const event = EventBuilder.create({
      type: 'org.wt.sensor.detectionEvent',
      source: { id: nanoid(), name: 'Drone Detected' },
      time: Date.now(),
    })
      .mergeValues({
        latitude: drone.lat(),
        longitude: drone.lng(),
        certainty: Math.random(),
        sensorId: sensorId.toString(),
      })
      .build();

    EventManager.publish(event);
  }

  function sendEnemy(enemy: google.maps.LatLng, sensorId: number) {
    const event = EventBuilder.create({
      type: 'org.cmi2.sensor.detectionEvent',
      source: { id: nanoid(), name: 'Enemy Detected' },
      time: Date.now(),
    })
      .mergeValues({
        latitude: enemy.lat(),
        longitude: enemy.lng(),
        certainty: Math.random(),
        sensorId: sensorId.toString(),
      })
      .build();
    EventManager.publish(event);
  }
  return (
    <div className="w-full h-[80vh] rounded-lg">
      <div className="">
        <Link href="/">{'< Return Home'}</Link>
      </div>
      <div className="flex justify-center gap-4 pb-4">
        <button
          className={`${mode === 'sensor' ? activeStyle : inactiveStyle} ${buttonStyle}`}
          onClick={() => {
            setMode('sensor');
          }}>
          Add Sensor
        </button>
        <button
          className={`${mode === 'drone' ? activeStyle : inactiveStyle} ${buttonStyle}`}
          onClick={() => {
            setMode('drone');
          }}>
          Add Drone
        </button>
        <button
          className={`${mode === 'enemy' ? activeStyle : inactiveStyle} ${buttonStyle}`}
          onClick={() => {
            setMode('enemy');
          }}>
          Add Enemy
        </button>
        <button
          className={`${inactiveStyle} ${buttonStyle}`}
          onClick={() => {
            setSensors([]);
            setShowCircles(false);
          }}>
          Remove sensors
        </button>
        <button
          className={`${inactiveStyle} ${buttonStyle}`}
          onClick={() => {
            removeEntityType('drone');
          }}>
          Remove Drones
        </button>
        <button
          className={`${inactiveStyle} ${buttonStyle}`}
          onClick={() => {
            removeEntityType('enemy');
          }}>
          Remove Enemies
        </button>
        {sensors.length > 0 && (
          <button
            className={`${inactiveStyle} ${buttonStyle}`}
            onClick={() => {
              setShowCircles(!showCircles);
            }}>
            Toggle Sensor Radius
          </button>
        )}
      </div>
      <GoogleMap
        mapContainerStyle={defaultMapContainerStyle}
        center={defaultMapCenter}
        onClick={onMapClick}
        zoom={18}
        options={{
          zoomControl: false,
          scaleControl: false,
          cameraControl: false,
          streetViewControl: false,
          minZoom: 18,
          tilt: 0,
          gestureHandling: 'none',
        }}>
        {sensors.map(sensor => {
          return (
            <>
              <Marker
                position={sensor}
                onClick={onSensorClick}
                icon={{
                  url: 'https://www.svgrepo.com/show/489126/sensor.svg',
                  scaledSize: new window.google.maps.Size(50, 50),
                  anchor: new window.google.maps.Point(25, 25),
                }}
              />
              <Circle
                center={sensor}
                radius={50}
                visible={showCircles}
                options={{ clickable: false, visible: showCircles }}
              />
            </>
          );
        })}
        {entites.map(marker => {
          return (
            <Marker
              key={marker.toString()}
              position={marker}
              onClick={onEntityClick}
              icon={{
                url:
                  marker.type === 'drone'
                    ? 'https://www.svgrepo.com/show/521818/robot.svg'
                    : 'https://www.svgrepo.com/show/479064/caution-mark.svg',
                scaledSize: new window.google.maps.Size(50, 50),
                anchor: new window.google.maps.Point(25, 25),
              }}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
}
