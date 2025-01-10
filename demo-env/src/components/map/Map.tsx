'use client';
import { Circle, GoogleMap, Marker } from '@react-google-maps/api';
import { useEffect, useState } from 'react';
import { EventBuilder } from 'thredlib';
import { nanoid } from 'nanoid';
import { useEventManager } from '@/hooks/useEventManager';
//Map's styling
export const defaultMapContainerStyle = {
  width: '100%',
  height: '80vh',
  borderRadius: '8px',
};

const defaultMapCenter = {
  lat: 40.90210372955823,
  lng: -80.84387312133761,
};

type Drone = google.maps.LatLng & { seen: boolean };
export function Map() {
  const [sensors, setSensors] = useState<google.maps.LatLng[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [mode, setMode] = useState<'sensor' | 'drone'>('sensor');
  const [showCircles, setShowCircles] = useState<boolean>(false);

  const EventManager = useEventManager();

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    if (mode === 'sensor') {
      setSensors([...sensors, e.latLng]);
    }
    if (mode === 'drone') {
      // merge e.latLng with seen: false
      //not like above
      const drone: Drone = Object.assign(e.latLng, { seen: false });
      setDrones([...drones, drone]);
    }
  };

  const onSensorClick = (e: google.maps.MapMouseEvent) => {
    const marker = sensors.find(marker => marker === e.latLng);
    if (marker) {
      setSensors(sensors.filter(marker => marker !== e.latLng));
    }
  };

  const onDroneClick = (e: google.maps.MapMouseEvent) => {
    const marker = drones.find(marker => marker === e.latLng);
    if (marker) {
      setDrones(drones.filter(marker => marker !== e.latLng));
    }
  };
  const activeStyle = 'bg-blue-500 text-black';
  const inactiveStyle = 'bg-gray-300 text-black';

  const buttonStyle = 'px-4 py-2 rounded-lg';

  useEffect(() => {
    if (sensors.length === 0 || drones.length === 0) return;

    checkForDrones();
  }, [drones.length, sensors.length]);

  function checkForDrones() {
    sensors.forEach((sensor, index) => {
      drones.forEach(drone => {
        if (google.maps.geometry.spherical.computeDistanceBetween(sensor, drone) < 50) {
          //if drone has not been seen, call sendDrone
          if (!drone.seen) {
            sendDrone(drone, sensor, index);
            //mark drone as seen
            drone.seen = true;
            setDrones([...drones]);
          }
        }
      });
    });
  }

  function sendDrone(drone: google.maps.LatLng, sensor: google.maps.LatLng, sensorId: number) {
    //send the drone to the event engine

    const event = EventBuilder.create({
      type: 'wt.agent.detectionEvent',
      source: { id: nanoid(), name: 'Drone Detected' },
      time: Date.now(),
    })
      .mergeValues({
        droneLattitude: drone.lat(),
        droneLongitude: drone.lng(),
        certainty: Math.random(),
        sensorId: sensorId,
      })
      .build();

    EventManager.publish(event);
  }
  return (
    <div className="w-full h-[80vh] rounded-lg">
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
            setDrones([]);
          }}>
          Remove Drones
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
        {drones.map(marker => {
          return (
            <Marker
              key={marker.toString()}
              position={marker}
              onClick={onDroneClick}
              icon={{
                url: 'https://www.svgrepo.com/show/521818/robot.svg',
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
