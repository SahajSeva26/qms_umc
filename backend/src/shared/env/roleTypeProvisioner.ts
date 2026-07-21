import { RoleTypeModel } from '../../modules/access-management/role-type/roleType.model';
import logger from '../utils/logger';

export interface IDefaultRoleTypeDefinition {
    code: string;
    name: string;
    description?: string;
    permissions?: string[];
}

// Provisions FIXED default role types for a tenant. Created directly via the model (bypassing the
// API validators) so they can be marked isSystem: true — which reserves their codes against custom
// creation. Idempotent on { code, tenant }: an existing role type is left untouched, so its _id is
// never reissued and roles referencing it stay valid across restarts.
//
// MUST be awaited sequentially inside a transaction — the shared session cannot run parallel ops.
// Returns the resulting role type docs (newly created OR already-existing), in definition order,
// so callers can link them (e.g. wire the {code}.admin role type to the owner role).
export const provisionDefaultRoleTypes = async (tenant: any, definitions: IDefaultRoleTypeDefinition[]) => {
    const roleTypes = [];
    for (const definition of definitions) {
        const existing = await RoleTypeModel.findOne({ code: definition.code, tenant: tenant._id });
        if (existing) {
            roleTypes.push(existing);
            continue;
        }

        const roleType = await RoleTypeModel.create({
            tenant: tenant._id,
            code: definition.code,
            name: definition.name,
            description: definition.description ?? '',
            isSystem: true,
        });

        if (definition.permissions?.length) {
            roleType.permissions.push(...definition.permissions);
            await roleType.save();
        }

        logger.debug('Default role type provisioned', {
            roleTypeId: roleType.id,
            code: roleType.code,
            tenant: tenant._id,
        });

        roleTypes.push(roleType);
    }
    return roleTypes;
};
