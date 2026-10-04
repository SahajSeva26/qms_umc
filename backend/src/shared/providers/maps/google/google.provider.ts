import { RoutesClient } from '@googlemaps/routing';
import { ILatLng, IMapsProvider, IRouteDistance } from '../../../types/maps.types';
import ENV from '../../../config/app.config';

export const GOOGLE_MAPS = 'google-maps';

// Google Maps provider — wraps the Routes API (@googlemaps/routing), authed via the API key.
export class GoogleMapsProvider implements IMapsProvider {
    private readonly client: RoutesClient;

    constructor() {
        this.client = new RoutesClient({ apiKey: ENV.Providers.GoogleMaps.ApiKey });
    }

    // road distance + travel time between two coordinates (DRIVE mode). The Routes API requires a
    // field mask header naming the fields to return.
    async distanceBetween(origin: ILatLng, destination: ILatLng): Promise<IRouteDistance> {
        const [response] = await this.client.computeRoutes(
            {
                origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
                destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
                travelMode: 'DRIVE',
            },
            {
                otherArgs: { headers: { 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration' } },
            },
        );

        const route = response.routes?.[0];
        return {
            distanceMeters: Number(route?.distanceMeters ?? 0),
            durationSeconds: route?.duration?.seconds != null ? Number(route.duration.seconds) : null,
        };
    }
}
