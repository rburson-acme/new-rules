export interface MapLocation {
    name: string;
    latitude: number;
    longitude: number;
}
export interface MapModel {
    locations: MapLocation[];
}
