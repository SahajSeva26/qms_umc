import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Escapes regex metacharacters so a search string used as `{ $regex: ... }`
// is matched LITERALLY, not compiled as a pattern. Every *.service.ts search()
// built a $regex straight from unescaped user input (filters.name/.email/etc)
// — besides letting a caller craft an unintended pattern, an adversarial
// pattern with nested repetition (e.g. `(a+)+$`) can trigger catastrophic
// backtracking and hang the query (ReDoS) for any authenticated caller with
// search access, not just an admin.
export const escapeRegex = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const generateUUID = (): string => {
    return uuidv4().toString();
};

export const isValidObjectID = (id: string): boolean => {
    return mongoose.isValidObjectId(id);
};
export const toObjectId = (id: string): mongoose.Types.ObjectId => {
    return new mongoose.Types.ObjectId(id);
};

export const hasAllItem = (data: string[], required: string[]): boolean => {
    return required.every((item) => data.includes(item));
};

export const hasAnyItem = (data: string[], required: string[]): boolean => {
    return required.some((item) => data.includes(item));
};

export const canTransition = (from: string, to: string, transitionMap: Record<string, string[]>) => {
    return transitionMap[from]?.includes(to);
};
