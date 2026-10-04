// Screening Types
import { HydratedDocument } from 'mongoose';
import { ScreeningDocument as IScreening } from './screening.model';

// a screening document or null, as returned by get()
export type ScreeningDoc = HydratedDocument<IScreening> | null;
