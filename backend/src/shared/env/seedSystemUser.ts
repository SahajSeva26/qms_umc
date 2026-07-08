import { PermissionGroupModel } from '../../modules/access-management/permission-group/permissionGroup.model';
import { RoleTypeModel } from '../../modules/access-management/role-type/roleType.model';
import { TenantModel } from '../../modules/access-management/tenant/tenant.model';
import { PERMISSIONS } from './permissions';
import { UserModel } from '../../modules/user/user.model';
import ENV from '../config/app.config';
import bcrypt from 'bcrypt';
import { RoleModel } from '../../modules/access-management/role/role.model';
import logger from '../utils/logger';

const seedSystemUser = async () => {
    try {
        //  1: Check if system tenant already exists
        const seededItems: string[] = [];

        let tenant = await TenantModel.findOne({ code: 'system' });
        //  2: If not, create system tenant
        if (!tenant) {
            tenant = await TenantModel.create({
                code: 'system',
                name: 'System',
                description: 'System tenant',
            });
            seededItems.push('tenant');
        }

        //3: create permission group if not exits
        let permissionGroup = await PermissionGroupModel.findOne({ tenant: tenant.id });
        if (!permissionGroup) {
            permissionGroup = await PermissionGroupModel.create({
                tenant: tenant.id,
                code: 'system',
                name: 'System',
                description: 'System permission group',
            });

            //4: insert permissions
            permissionGroup.permissions.push(PERMISSIONS.SYSTEM.MANAGE);
            await permissionGroup.save();
        }

        // 4: Create a role type
        let roleType = await RoleTypeModel.findOne({ tenant: tenant.id });
        if (!roleType) {
            roleType = await RoleTypeModel.create({
                tenant: tenant.id,
                code: 'system',
                name: 'System',
                description: 'System role type',
            });

            roleType.permissions.push(PERMISSIONS.SYSTEM.MANAGE.code);
            await roleType.save();
        }

        //5: Create a user
        let user = await UserModel.findOne({ email: ENV.App.SystemUserEmail });
        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(ENV.App.SystemUserPassword, salt);
            user = await UserModel.create({
                email: ENV.App.SystemUserEmail,
                password: hashedPassword,
                firstName: 'System',
                lastName: 'User',
                phone: ENV.App.SystemUserPhone,
            });
            seededItems.push('user');
        }

        // 6: Assign role to user
        let role = await RoleModel.findOne({ tenant: tenant.id, type: roleType.id });
        if (!role) {
            role = await RoleModel.create({
                code: 'system',
                name: 'System role',
                description: 'System role created by system',
                tenant: tenant.id,
                type: roleType.id,
                user: user.id,
            });
            role.permissions.push(PERMISSIONS.SYSTEM.MANAGE.code);
            await role.save();
            //update owner of tenant
            tenant.owner = role._id;
            await tenant.save();
            seededItems.push('role');
        }

        const message =
            seededItems.length > 0
                ? `System tenant, role type, permissions, and user created successfully. Seeded items: [${seededItems.join(', ').toUpperCase()}]`
                : 'System tenant, role type, permissions, and user already exist';

        logger.success(message);
    } catch (error) {
        logger.error('Error seeding system user:', error);
        throw error;
    }
};

export default seedSystemUser;
