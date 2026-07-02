import mongoose, { InferSchemaType } from 'mongoose';
import { USER_GENDERS, USER_STATUS } from './user.constants';

const defaultUserImage = 'https://as2.ftcdn.net/jpg/00/64/67/27/1000_F_64672736_U5kpdGs9keUll8CRQ3p3YaEv2M6qkVY5.webp';

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true,
            lowercase: true,
        },

        lastName: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true,
            lowercase: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            index: true,
            lowercase: true,
        },

        phone: {
            type: String,
            required: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },

        avatar: {
            url: {
                type: String,
                default: defaultUserImage,
            },
            id: {
                type: String,
                default: '',
            },
        },

        status: {
            type: String,
            enum: [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE, USER_STATUS.SUSPENDED, USER_STATUS.DELETED],
            default: USER_STATUS.ACTIVE,
        },

        gender: {
            type: String,
            enum: [USER_GENDERS.MALE, USER_GENDERS.FEMALE],
        },

        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        isPhoneVerified: {
            type: Boolean,
            default: false,
        },

        loginAttempts: {
            type: Number,
            default: 0,
        },

        lockUntil: {
            type: Date,
            default: null,
        },

        meta: {
            default: {},
        },
    },
    {
        timestamps: true,
    },
);

export const UserModel = mongoose.model('User', userSchema);
export type IUser = InferSchemaType<typeof userSchema>;
