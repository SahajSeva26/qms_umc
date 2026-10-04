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
    computeDistance: (origin: ILatLng, destination: ILatLng) => Promise<IRouteDistance>;
    // road distance + travel time from one origin to many destinations, in ONE call.
    // Results are aligned to the `destinations` order; an unreachable destination yields distanceMeters = Infinity.
    computeDistanceMatrix: (origin: ILatLng, destinations: ILatLng[]) => Promise<IRouteDistance[]>;
}
