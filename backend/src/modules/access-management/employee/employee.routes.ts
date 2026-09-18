// Employee Routes
import express from 'express';
import { EmployeeController } from './employee.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateEmployeePayloadSchema,
    SearchEmployeeQuerySchema,
    UpdateEmployeePayloadSchema,
} from './employee.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { RoleGuard } from '../../../shared/middlewares/roleGuard';
import { ALLOWED_ROLETYPE_CODES } from '../role-type/roleType.constants';

export const EmployeeRouter = express.Router();

const { PLATFORM } = ALLOWED_ROLETYPE_CODES;

// who may touch the employee registry (gated by role TYPE, not permission):
//   - manage (create / update) → admin + both ops managers, who onboard field officers
//   - read (get / search)      → the managers above + field officers (own record only, via own-scope)
const EMPLOYEE_MANAGE_ROLES = [
    PLATFORM.ADMIN,
    PLATFORM.OPERATION_MANAGER_SCREENING,
    PLATFORM.OPERATION_MANAGER_DIET,
];
const EMPLOYEE_READ_ROLES = [...EMPLOYEE_MANAGE_ROLES, PLATFORM.FIELD_OFFICER];

EmployeeRouter.use(AuthMiddleware);

// get employee
registry.registerPath({
    method: 'get',
    path: '/employees/{id}',
    tags: ['EMPLOYEE'],
    summary: 'Get employee',
    parameters: [
        {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
        },
    ],
    responses: {
        200: { description: 'Employee fetched successfully' },
        404: { description: 'Employee not found' },
    },
});

// search employees
registry.registerPath({
    method: 'get',
    path: '/employees',
    tags: ['EMPLOYEE'],
    summary: 'Search employees',
    request: {
        query: SearchEmployeeQuerySchema,
    },
    responses: {
        200: { description: 'Employees fetched successfully' },
    },
});

// create employee
registry.registerPath({
    method: 'post',
    path: '/employees',
    tags: ['EMPLOYEE'],
    summary: 'Create employee',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateEmployeePayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Employee created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'User not found' },
        409: { description: 'Employee already exists for this email or user' },
    },
});

// update employee
registry.registerPath({
    method: 'put',
    path: '/employees/{id}',
    tags: ['EMPLOYEE'],
    summary: 'Update employee',
    parameters: [
        {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
        },
    ],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateEmployeePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Employee updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Employee not found' },
    },
});

EmployeeRouter.get('/:id', RoleGuard(EMPLOYEE_READ_ROLES), EmployeeController.get);
EmployeeRouter.get('/', RoleGuard(EMPLOYEE_READ_ROLES), EmployeeController.search);
EmployeeRouter.post('/', RoleGuard(EMPLOYEE_MANAGE_ROLES), EmployeeController.create);
EmployeeRouter.put('/:id', RoleGuard(EMPLOYEE_MANAGE_ROLES), EmployeeController.update);
