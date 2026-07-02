

import mongoose from "mongoose";

export const isValidObjectID = (id: string): boolean => {
    return mongoose.isValidObjectId(id);
};