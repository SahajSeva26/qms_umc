import { HydratedDocument } from "mongoose"
import { UserService } from "../user/user.service"
import { IRegisterPayload } from "../user/user.validators"
import { IUser } from "../user/user.model"

const register = async (data:IRegisterPayload):Promise<HydratedDocument<IUser>> => {
    
    const user=await UserService.create(data)
    return user
}

export const AuthService = {
    register
}