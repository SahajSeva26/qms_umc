// Maps provider — geocoding / places / distance operations.
// Methods are added here as each functionality is wired.

export interface ILatLng {
    lat: number;
    lng: number;
}

export interface IRouteDistance {
    distanceMeters: number; // road distance between the two points
    durationSeconds: number | null; // travel time in seconds, when available
}

export interface IMapsProvider {
    // road distance + travel time between two coordinates
    distanceBetween: (origin: ILatLng, destination: ILatLng) => Promise<IRouteDistance>;
}
