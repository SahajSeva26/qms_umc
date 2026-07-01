import { HydratedDocument } from 'mongoose';
import { IUser, UserModel } from './user.model';
import { IRegisterPayload } from './user.validators';
import bcrypt from 'bcrypt';

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

export const set = async (model: any, entity: HydratedDocument<IUser>): Promise<IUser> => {

    if(model.firstName){
        entity.firstName=model.firstName;
    }
    if(model.lastName){
        entity.lastName=model.lastName;
    }
    if(model.gender){
        entity.gender=model.gender;
    }

    return entity;
};

export const create = async (model: IRegisterPayload, entity: HydratedDocument<IUser>): Promise<IUser> => {

    let user:IUser|null=null;
    //1 check exitsing user

    //1: hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(entity.password, salt);

    //2: create user
    const newUser = new UserModel({
        ...entity,
        password: hashedPassword,
    });


    user= await newUser.save();
    return user;
};
