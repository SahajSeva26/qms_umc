import mongoose, { HydratedDocument } from 'mongoose';
import { IUser, UserModel } from './user.model';
import { IRegisterPayload } from './user.validators';
import bcrypt from 'bcrypt';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
type UserDocument = HydratedDocument<IUser> | null;
const populate = [];
// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<IUser>) => {
    if (model.firstName) {
        entity.firstName = model.firstName;
    }
    if (model.lastName) {
        entity.lastName = model.lastName;
    }
    if (model.gender) {
        entity.gender = model.gender;
    }
    if (model.phone) {
        entity.phone = model.phone;
    }

    return entity;
};

const get = async (id: string, options?: any): Promise<UserDocument> => {
    let query = null;

    if (mongoose.isValidObjectId(id)) {
        query = UserModel.findOne({ _id: id });
    } else if (id.includes('@')) {
        query = UserModel.findOne({ email: id });
    } else {
        return throwAppError('Invalid user identifier', StatusCodes.BAD_REQUEST);
    }

    if (options) {
        query = query.populate(options);
    }

    return await query;
};

const create = async (model: IRegisterPayload): Promise<IUser> => {

    let user: UserDocument = null;

    //1 check exitsing user
    user = await UserService.get(model.email);
    if (user) {
        return throwAppError('User already exists', StatusCodes.CONFLICT);
    }

    //1: hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(model.password, salt);

    //2: create user
    const entity = new UserModel({
        email: model.email,
        password: hashedPassword,
    });

    user = await set(model, entity);

    user = await user.save();
    return user;
};

export const UserService = {
    get,
    create,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
