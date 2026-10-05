// Camp Types
import { HydratedDocument } from 'mongoose';
import { ICamp } from './camp.model';

// a camp document or null, as returned by get()
export type CampDocument = HydratedDocument<ICamp> | null;

// a camp is staffed by one worker kind, decided by its type (diet → dietitian, else field officer)
export type FieldWorker = {
    field: 'fo' | 'dietitian'; // the camp field that holds this worker's role
    geoType: string; // the geo-profile type to search for allocation
    roleTypeCode: string; // the role type a caller-supplied override must be
    label: string; // human label for error messages
};

// per-camp patient counts (opt-in report block on search)
export type CampStats = { patients: number; patientsCompleted: number };
