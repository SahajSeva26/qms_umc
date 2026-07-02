

import mongoose from "mongoose";

export const isValidObjectID = (id: string): boolean => {
    return mongoose.isValidObjectId(id);
};

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};