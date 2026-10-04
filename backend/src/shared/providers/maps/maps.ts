import { IMapsProvider } from '../../types/maps.types';
import { GOOGLE_MAPS, GoogleMapsProvider } from './google/google.provider';

class MapsManager {
    private readonly providers: Map<string, IMapsProvider> = new Map();

    constructor() {
        this.providers.set(GOOGLE_MAPS, new GoogleMapsProvider());
    }

    get(name: string): IMapsProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Maps provider ${name} not found`);
        }
        return provider;
    }
}

export const mapsManager = new MapsManager();
