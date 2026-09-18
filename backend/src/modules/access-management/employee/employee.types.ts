// Employee Types
import { HydratedDocument } from 'mongoose';
import { IEmployee } from './employee.model';

export type EmployeeDocument = HydratedDocument<IEmployee>;
