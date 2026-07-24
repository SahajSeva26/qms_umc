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
            // Seeded role-type permissions are owned entirely by the seed (not editable via API),
            // so the definition is the source of truth. Full-sync on every run: apply BOTH additions
            // and removals so the live role type exactly matches the definition. No-op when in sync.
            const desired = definition.permissions ?? [];
            const current = existing.permissions ?? [];
            const inSync = desired.length === current.length && desired.every((code) => current.includes(code));
            if (!inSync) {
                existing.set('permissions', desired);
                await existing.save();
                logger.debug(
                    {
                        roleTypeId: existing.id,
                        code: existing.code,
                        permissions: desired,
                    },
                    'Default role type permissions synced',
                );
            }
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

        logger.debug(
            {
                roleTypeId: roleType.id,
                code: roleType.code,
                tenant: tenant._id,
            },
            'Default role type provisioned',
        );

        roleTypes.push(roleType);
    }
    return roleTypes;
};
