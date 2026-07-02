import { Request, Response } from 'express';

import { RegisterPayloadSchema } from './user.validators';
import { ResponseHandler } from '../../shared/utils/responseHandler';
import { formatZodError } from '../../shared/utils/error';

export const UserController = {};
