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
    async computeDistance(origin: ILatLng, destination: ILatLng): Promise<IRouteDistance> {
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

    // road distance + travel time from one origin to many destinations in a single call. Uses the
    // Routes API's server-streaming computeRouteMatrix; elements may arrive out of order, so results
    // are placed by destinationIndex. An unreachable destination stays Infinity (so distance checks fail).
    async computeDistanceMatrix(origin: ILatLng, destinations: ILatLng[]): Promise<IRouteDistance[]> {
        const results: IRouteDistance[] = destinations.map(() => ({ distanceMeters: Infinity, durationSeconds: null }));
        if (!destinations.length) {
            return results;
        }

        const stream = this.client.computeRouteMatrix(
            {
                origins: [{ waypoint: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } } }],
                destinations: destinations.map((d) => ({
                    waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
                })),
                travelMode: 'DRIVE',
            },
            {
                otherArgs: {
                    headers: { 'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,condition' },
                },
            },
        );

        await new Promise<void>((resolve, reject) => {
            stream.on('data', (el: any) => {
                const i = el?.destinationIndex;
                if (typeof i !== 'number' || i < 0 || i >= results.length) {
                    return;
                }
                const exists = el.condition === 'ROUTE_EXISTS' || el.condition === 1;
                if (exists && el.distanceMeters != null) {
                    results[i] = {
                        distanceMeters: Number(el.distanceMeters),
                        durationSeconds: el.duration?.seconds != null ? Number(el.duration.seconds) : null,
                    };
                }
            });
            stream.on('error', reject);
            stream.on('end', () => resolve());
        });

        return results;
    }
}
