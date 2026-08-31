// File Model

import mongoose from 'mongoose';
import { ENTITY_TYPE, ENTITY_TYPE_CATEGORIES_ARRAY, FILE_STATUS, FILE_TYPE } from './file.constants';

const contentSchema = new mongoose.Schema({
    provider: {
        type: String,
        required: true,
    },
    path: {
        type: String,
        required: true,
    },
    identifier: {
        type: String,
        required: true,
    },
    originalName: {
        type: String,
        required: true,
        trim: true,
    },

    displayName: {
        type: String,
        required: true,
        trim: true,
    },
    mimeType: {
        type: String,
        required: true,
        trim: true,
    },
    extension: {
        type: String,
        required: true,
        trim: true,
    },
    size: {
        type: Number,
        required: true,
        min: 0,
    },
}, { _id: false });
const fileSchema = new mongoose.Schema(
    {
        entity: {
            id: {
                type: String,
                required: true,
            },
            type: {
                type: String,
                enum: Object.values(ENTITY_TYPE),
                required: true,
            },
            category: {
                type: String,
                enum: ENTITY_TYPE_CATEGORIES_ARRAY,
                required: true,
            },
        },
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
        type: {
            type: String,
            enum: Object.values(FILE_TYPE),
            default: FILE_TYPE.DOCUMENT,
        },
        status: {
            type: String,
            enum: Object.values(FILE_STATUS),
            default: FILE_STATUS.DRAFT,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
        },
        content: {
            type: contentSchema,
            required: true,
        },
        tags: {
            type: [String],
            default: [],
        },
    },
    { timestamps: true },
);

export const FileModel = mongoose.model('File', fileSchema);
export type IFile = mongoose.InferSchemaType<typeof fileSchema>;
