import { PermissionGroupModel } from '../../modules/access-management/permission-group/permissionGroup.model';
import { RoleTypeModel } from '../../modules/access-management/role-type/roleType.model';
import { TenantModel } from '../../modules/access-management/tenant/tenant.model';
import { PERMISSIONS } from './permissions';
import { UserModel } from '../../modules/user/user.model';
import ENV from '../config/app.config';
import bcrypt from 'bcrypt';
import { RoleModel } from '../../modules/access-management/role/role.model';
import logger from '../utils/logger';
import { TENANT_TYPE } from '../../modules/access-management/tenant/tenant.constants';
import { withTransaction } from '../helpers/transactionHelper';
import { throwAppError } from '../utils/error';
import { provisionDefaultRoleTypes } from './roleTypeProvisioner';
import { CRM_BUSINESS_ROLE_TYPES, OPERATION_BUSINESS_ROLE_TYPES } from './defaultRoleTypes';

const systemUserPermissions: any = [
    PERMISSIONS.SYSTEM.MANAGE,
    ...Object.values(PERMISSIONS.USER),
    ...Object.values(PERMISSIONS.TENANT),
    ...Object.values(PERMISSIONS.PERMISSION_GROUP),
    ...Object.values(PERMISSIONS.ROLE_TYPE),
    ...Object.values(PERMISSIONS.ROLE),
    ...Object.values(PERMISSIONS.DIVISION),
    ...Object.values(PERMISSIONS.LEAD),
    ...Object.values(PERMISSIONS.PROJECT),
    ...Object.values(PERMISSIONS.QA_FEEDBACK),
    ...Object.values(PERMISSIONS.DOCTOR),
    ...Object.values(PERMISSIONS.GEO_PROFILE),
    ...Object.values(PERMISSIONS.CAMP),
];

const seedSystemUser = async () => {
    const startTime = Date.now();
    try {
        // Ensure collections + indexes exist BEFORE the transaction, so the first
        // write doesn't trigger implicit collection creation inside it — which throws
        // a TransientTransactionError on a single-node replica set and makes the driver
        // replay the whole callback (the cause of the doubled seed run).
        await Promise.all([
            TenantModel.init(),
            PermissionGroupModel.init(),
            RoleTypeModel.init(),
            UserModel.init(),
            RoleModel.init(),
        ]);

        await withTransaction(async () => {
            //  1: Check if system tenant already exists ====================================================>
            let tenant = await TenantModel.findOne({ code: ENV.App.SystemTenantCode });
            //  2: If not, create system tenant
            if (!tenant) {
                tenant = await TenantModel.create({
                    code: ENV.App.SystemTenantCode,
                    name: ENV.App.SystemTenantName,
                    type: TENANT_TYPE.PLATFORM,
                    description: ENV.App.SystemTenantDescription,
                });

                logger.debug('System tenant created', { tenantId: tenant.id });
            }

            //3: create permission group if not exits ========================================================>
            let permissionGroup = await PermissionGroupModel.findOne({ code: ENV.App.SystemTenantCode });
            if (!permissionGroup) {
                permissionGroup = await PermissionGroupModel.create({
                    tenant: tenant.id,
                    code: ENV.App.SystemTenantCode,
                    name: ENV.App.SystemTenantName,
                    description: ENV.App.SystemTenantName + 'permission group',
                });
                logger.debug('Tenant permission group created', { permissionGroupId: permissionGroup.id });
            }

            //3.1: reconcile permissions — the system permission group is frozen against the API, so the
            // seed is the ONLY place it can grow. Idempotently add any permission missing by code and
            // leave existing entries untouched, so a new module's permission lands here on next startup.
            const existingCodes = new Set(permissionGroup.permissions.map((permission: any) => permission.code));
            const missingPermissions = systemUserPermissions.filter(
                (permission: any) => !existingCodes.has(permission.code),
            );
            if (missingPermissions.length > 0) {
                permissionGroup.permissions.push(...missingPermissions);
                await permissionGroup.save();
                logger.debug('System permission group permissions reconciled', {
                    permissionGroupId: permissionGroup.id,
                    added: missingPermissions.map((permission: any) => permission.code),
                });
            }

            // 4: Create defualt system ROLE TYPES ===============================================================>
            // 4:1 Create a system role type
            let systemRoleType = await RoleTypeModel.findOne({ code: 'system', tenant: tenant._id });
            if (!systemRoleType) {
                systemRoleType = await RoleTypeModel.create({
                    tenant: tenant._id,
                    code: 'system',
                    name: 'System',
                    description: 'System role type for system',
                    isSystem: true,
                });

                // role type level permissions
                systemRoleType.permissions.push(PERMISSIONS.SYSTEM.MANAGE.code);
                await systemRoleType.save();
                logger.debug('System role type created', { roleTypeId: systemRoleType.id });
            }

            // 4.2 Create system tenant admin role
            let tenantAdminRoleType = await RoleTypeModel.findOne({
                code: `${ENV.App.SystemTenantCode}.admin`,
                tenant: tenant._id,
            });
            if (!tenantAdminRoleType) {
                tenantAdminRoleType = await RoleTypeModel.create({
                    tenant: tenant._id,
                    code: `${ENV.App.SystemTenantCode}.admin`,
                    name: 'System Tenant Admin',
                    description: 'System tenant admin role type',
                    isSystem: true,
                });

                // role type level permissions
                tenantAdminRoleType.permissions.push(PERMISSIONS.TENANT.MANAGE.code, PERMISSIONS.TENANT.ADMIN.code);
                await tenantAdminRoleType.save();
                logger.debug('Admin role type created', { roleTypeId: tenantAdminRoleType.id });
            }

            // 4.3 Provision the platform's fixed business role types (sales, sales-head) with their lead permissions
            await provisionDefaultRoleTypes(tenant, CRM_BUSINESS_ROLE_TYPES);

            // 4.4 Provision the platform's camp/operations role types (coordinators, ops managers, fo)
            await provisionDefaultRoleTypes(tenant, OPERATION_BUSINESS_ROLE_TYPES);

            //5: Create corresponding users for Role-Type ==========================================================>
            // 5.1 Create system user
            let systemUser = await UserModel.findOne({ email: ENV.App.SystemUserEmail });
            if (!systemUser) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(ENV.App.SystemUserPassword, salt);
                systemUser = await UserModel.create({
                    email: ENV.App.SystemUserEmail,
                    password: hashedPassword,
                    firstName: 'System',
                    lastName: 'User',
                    phone: ENV.App.SystemUserPhone,
                });
                logger.debug('System user created', { userId: systemUser.id });
            }
            // 5.2 Create admin user
            let adminUser = await UserModel.findOne({ email: ENV.App.AdminUserEmail });
            if (!adminUser) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(ENV.App.AdminUserPassword, salt);
                adminUser = await UserModel.create({
                    email: ENV.App.AdminUserEmail,
                    password: hashedPassword,
                    firstName: 'Admin',
                    lastName: 'User',
                    phone: ENV.App.AdminUserPhone,
                });
                logger.debug('Admin user created', { userId: adminUser.id });
            }

            // 6: Create & Assign role to System users ====================================================>
            // 6.1 Create system role of system role type
            let systemRole = await RoleModel.findOne({ code: 'system' });
            if (!systemRole) {
                systemRole = await RoleModel.create({
                    code: 'system',
                    name: 'System role',
                    description: 'System role created by system',
                    tenant: tenant.id,
                    type: systemRoleType._id,
                    user: systemUser._id,
                });

                await systemRole.save();
                logger.debug('System role created', { roleId: systemRole.id });
            }

            // 6.2 Create admin role of system role type
            let adminRole = await RoleModel.findOne({ code: 'admin', tenant: tenant._id });
            if (!adminRole) {
                adminRole = await RoleModel.create({
                    code: 'admin',
                    name: 'Admin role',
                    description: 'Admin role created by system',
                    tenant: tenant.id,
                    type: tenantAdminRoleType._id,
                    user: adminUser._id,
                });

                await adminRole.save();
                logger.debug('Admin role created', { roleId: adminRole.id });
            }

            //update owner of tenant
            tenant.owner = adminRole._id;
            await tenant.save();
            logger.info('Tenant owner updated', { tenantId: tenant.id });
        });

        logger.success('System user seeding completed successfully....');
        const endTime = Date.now();
        logger.info(`System user seeding took ${endTime - startTime}ms`);
    } catch (error) {
        logger.error('Error seeding system user:', error);
        const endTime = Date.now();
        logger.error(`System user seeding took ${endTime - startTime}ms`);
        return throwAppError('Error seeding system users', 500);
    }
};

export default seedSystemUser;

// export const seedSystemBusinessRoles = async (tenant: any) => {
//     await provisionDefaultRoleTypes(tenant, [
//         ...LEAD_BUSINESS_ROLE_TYPES]);
// };
