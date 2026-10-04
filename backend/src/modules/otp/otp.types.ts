// Otp Types
import { HydratedDocument } from 'mongoose';
import { IOtp } from './otp.model';

// an otp document or null, as returned by the raw get()
export type OtpDocument = HydratedDocument<IOtp> | null;
