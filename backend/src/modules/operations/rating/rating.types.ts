// Rating Types
import { HydratedDocument } from 'mongoose';
import { IRating } from './rating.model';

export type RatingDocument = HydratedDocument<IRating>;
