import { HydratedDocument } from "mongoose";
import { IUser } from "./user.model";


// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================
export const set =async(model :any, entity:HydratedDocument<IUser>): Promise<IUser>=>{
    model.set(entity);
    await model.save();
    return entity;
}
export const create =async(model :any, entity:HydratedDocument<IUser>): Promise<IUser>=>{
    const newModel = new model(entity);
    return await newModel.save();
}

