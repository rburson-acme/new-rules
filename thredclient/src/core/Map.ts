import { MapLocation } from 'thredlib';

export function getMapCenter(locations: MapLocation[]) {
  const numberLocations = locations.map(({ latitude, longitude }) => ({
    latitude: Number(latitude),
    longitude: Number(longitude),
  }));
  let minLat = numberLocations[0].latitude;
  let maxLat = numberLocations[0].latitude;
  let minLng = numberLocations[0].longitude;
  let maxLng = numberLocations[0].longitude;

  numberLocations.forEach(({ latitude, longitude }) => {
    if (latitude < minLat) minLat = latitude;
    if (latitude > maxLat) maxLat = latitude;
    if (longitude < minLng) minLng = longitude;
    if (longitude > maxLng) maxLng = longitude;
  });

  const latitudeDelta = maxLat - minLat;
  const longitudeDelta = maxLng - minLng;

  const paddingFactor = 0.2; // 20% padding
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latitudeDelta + latitudeDelta * paddingFactor,
    longitudeDelta: longitudeDelta + longitudeDelta * paddingFactor,
  };
}
