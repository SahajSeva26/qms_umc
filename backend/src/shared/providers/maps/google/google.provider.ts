import { IMapsProvider } from '../../../types/maps.types';
import ENV from '../../../config/app.config';

export const GOOGLE_MAPS = 'google-maps';

// Google Maps provider — holds the API key; methods are added as functionality is wired.
export class GoogleMapsProvider implements IMapsProvider {
    private readonly apiKey: string;

    constructor() {
        this.apiKey = ENV.Providers.GoogleMaps.ApiKey;
    }
}
