export interface MapLocation {
    name: string;
    latitude: string;
    longitude: string;
    display?: string;
}
export interface MapModel {
    locations: MapLocation[];
}
