import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const isValidObjectID = (id: string): boolean => {
    return mongoose.isValidObjectId(id);
};
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const generateUUID = (): string => {
    return uuidv4().toString();
};
