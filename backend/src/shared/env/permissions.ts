import { USER_PERMISSIONS } from '../../modules/user/user.constants';
import { TENANT_PERMISSIONS } from '../../modules/access-management/tenant/tenant.constants';
import { PERMISSION_GROUP_PERMISSIONS } from '../../modules/access-management/permission-group/permissionGroup.constants';
import { ROLE_TYPE_PERMISSIONS } from '../../modules/access-management/role-type/roleType.constants';
import { ROLE_PERMISSIONS } from '../../modules/access-management/role/role.constants';
import { DIVISION_PERMISSIONS } from '../../modules/division/division.constants';
import { LEAD_PERMISSIONS } from '../../modules/crm/lead/lead.constants';
import { CONTACT_PERMISSIONS } from '../../modules/crm/contact/contact.constants';
import { PROJECT_PERMISSIONS } from '../../modules/crm/project/project.constants';
import { QA_FEEDBACK_PERMISSIONS } from '../../modules/qa-feedback/qaFeedback.constants';
import { DOCTOR_PERMISSIONS } from '../../modules/doctor/doctor.constants';
import { GEO_PROFILE_PERMISSIONS } from '../../modules/operations/geoProfile/geoProfile.constants';
import { CAMP_PERMISSIONS } from '../../modules/operations/camp/camp.constants';
import { COUNTER_PERMISSIONS } from '../../modules/counter/counter.constants';

export const SYSTEM_PERMISSIONS = {
    MANAGE: {
        code: 'system:manage',
        name: 'Manage System',
        description: 'Manage system',
    },
};
export const PERMISSIONS = {
    SYSTEM: SYSTEM_PERMISSIONS,
    USER: USER_PERMISSIONS,
    TENANT: TENANT_PERMISSIONS,
    PERMISSION_GROUP: PERMISSION_GROUP_PERMISSIONS,
    ROLE_TYPE: ROLE_TYPE_PERMISSIONS,
    ROLE: ROLE_PERMISSIONS,
    DIVISION: DIVISION_PERMISSIONS,
    LEAD: LEAD_PERMISSIONS,
    CONTACT: CONTACT_PERMISSIONS,
    PROJECT: PROJECT_PERMISSIONS,
    QA_FEEDBACK: QA_FEEDBACK_PERMISSIONS,
    DOCTOR: DOCTOR_PERMISSIONS,
    GEO_PROFILE: GEO_PROFILE_PERMISSIONS,
    CAMP: CAMP_PERMISSIONS,
    COUNTER: COUNTER_PERMISSIONS,
};

export const PERMISSIONS_ARRAY = Object.values(PERMISSIONS)
    .map((v) => Object.values(v).map((i) => i.code))
    .flat();
