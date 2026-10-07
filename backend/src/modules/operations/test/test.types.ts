// Test Types
import { HydratedDocument } from 'mongoose';
import { TestDocument as ITest } from './test.model';

// a test document or null, as returned by get()
export type TestDoc = HydratedDocument<ITest> | null;
