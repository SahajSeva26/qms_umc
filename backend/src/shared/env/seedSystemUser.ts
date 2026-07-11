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

const systemUserPermissions: any = [
    PERMISSIONS.SYSTEM.MANAGE,
    ...Object.values(PERMISSIONS.USER),
    ...Object.values(PERMISSIONS.TENANT),
    ...Object.values(PERMISSIONS.PERMISSION_GROUP),
    ...Object.values(PERMISSIONS.ROLE_TYPE),
    ...Object.values(PERMISSIONS.ROLE),
];

const seedSystemUser = async () => {
    try {
        const seededItems: string[] = [];
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
                seededItems.push('tenant');
            }

            //3: create permission group if not exits ========================================================>
            let permissionGroup = await PermissionGroupModel.findOne({ code: ENV.App.SystemTenantCode });
            if (!permissionGroup) {
                permissionGroup = await PermissionGroupModel.create({
                    tenant: tenant.id,
                    code: ENV.App.SystemTenantCode,
                    name: ENV.App.SystemTenantName,
                    description: ENV.App.SystemTenantName + ' permission group',
                });

                //4: insert permissions
                permissionGroup.permissions = systemUserPermissions;
                await permissionGroup.save();
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
                });

                // role type level permissions
                systemRoleType.permissions.push(PERMISSIONS.SYSTEM.MANAGE.code);
                await systemRoleType.save();
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
                });

                // role type level permissions
                tenantAdminRoleType.permissions.push(PERMISSIONS.TENANT.MANAGE.code);
                await tenantAdminRoleType.save();
            }

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
                seededItems.push('System user');
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
                seededItems.push('user');
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
                seededItems.push('role');
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
                seededItems.push('role');
            }

            //update owner of tenant
            tenant.owner = adminRole._id;
            await tenant.save();
        });
        const message =
            seededItems.length > 0
                ? `System tenant, role type, permissions, and user created successfully. Seeded items: [${seededItems.join(', ').toUpperCase()}]`
                : 'System tenant, role type, permissions, and user already exist';

        logger.success(message);
    } catch (error) {
        logger.error('Error seeding system user:', error);
        return throwAppError('Error seeding system users', 500);
    }
};

export default seedSystemUser;
