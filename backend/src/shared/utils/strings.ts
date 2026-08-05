import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

// Removes ALL whitespace — leading, trailing, AND internal — from a string. Used as a Zod
// `preprocess` to normalize user-supplied codes before validation, so " sun cardio " becomes
// "suncardio". Non-string input is passed through untouched for Zod to reject.
export const stripWhitespace = (val: unknown): unknown => {
    return typeof val === 'string' ? val.replace(/\s+/g, '') : val;
};
