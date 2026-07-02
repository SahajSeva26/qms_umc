import { HydratedDocument } from "mongoose"
import { UserService } from "../user/user.service"
import { IRegisterUserPayload } from "./auth.validators"
import { IUser } from "../user/user.model"

const register = async (data:IRegisterUserPayload):Promise<HydratedDocument<IUser>> => {
    
    const user=await UserService.create(data)
    return user
}

export const AuthService = {
    register
}