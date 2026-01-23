
/**
 * Represents a geographical location on a map.
 */
export interface MapLocation {
  name: string;
  latitude: string;
  longitude: string;
  display?: string;
}

/**
 * Represents a map
 */
export interface MapModel {
  locations: MapLocation[];
}
