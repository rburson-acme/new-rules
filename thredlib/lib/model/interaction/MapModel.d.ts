export interface MapLocation {
    name: string;
    latitude: number | string;
    longitude: number | string;
}
export interface MapModel {
    locations: MapLocation[];
}
