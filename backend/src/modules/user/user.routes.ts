import express from 'express';
import { UserController } from './user.controller';
import { registry } from 'zod';
import { RegisterPayloadSchema } from './user.validators';

export const UserRouter = express.Router();

