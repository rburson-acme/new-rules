export type Location = {
  name: string;
  latitude: number;
  longitude: number;
};

export function getMapCenter(locations: Location[]) {
  let minLat = locations[0].latitude;
  let maxLat = locations[0].latitude;
  let minLng = locations[0].longitude;
  let maxLng = locations[0].longitude;

  locations.forEach(({ latitude, longitude }) => {
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
