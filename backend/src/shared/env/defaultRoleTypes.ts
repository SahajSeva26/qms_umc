import { ALLOWED_ROLETYPE_CODES } from '../../modules/access-management/role-type/roleType.constants';
import { LEAD_PERMISSIONS } from '../../modules/crm/lead/lead.constants';
import { DOCTOR_PERMISSIONS } from '../../modules/doctor/doctor.constants';
import { CAMP_PERMISSIONS } from '../../modules/operations/camp/camp.constants';

// CRM ROLE TYPES
export const CRM_BUSINESS_ROLE_TYPES = [
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.SALES_REP,
        name: 'Sales Representative',
        description: 'Sales representative — owns and works their own leads',
        permissions: [
            LEAD_PERMISSIONS.SEARCH.code,
            LEAD_PERMISSIONS.CREATE.code,
            LEAD_PERMISSIONS.UPDATE.code,
            LEAD_PERMISSIONS.GET.code,
        ],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.SALES_HEAD,
        name: 'Sales Head',
        description: 'Sales head — full lead visibility, assigns leads to sales reps',
        permissions: [LEAD_PERMISSIONS.MANAGE.code],
    },
];

// OPERATION ROLE TYPES
export const OPERATION_BUSINESS_ROLE_TYPES = [
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.CAMP_COORDINATOR_SCREENING,
        name: 'Camp Coordinator (Screening)',
        description: 'Screening camp coordinator',
        permissions: [
            CAMP_PERMISSIONS.SEARCH.code,
            CAMP_PERMISSIONS.GET.code,
            CAMP_PERMISSIONS.UPDATE.code,
            DOCTOR_PERMISSIONS.MANAGE.code,
        ],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.CAMP_COORDINATOR_DIET,
        name: 'Camp Coordinator (Diet)',
        description: 'Diet camp coordinator',
        permissions: [
            CAMP_PERMISSIONS.SEARCH.code,
            CAMP_PERMISSIONS.GET.code,
            CAMP_PERMISSIONS.UPDATE.code,
            DOCTOR_PERMISSIONS.MANAGE.code,
        ],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.OPERATION_MANAGER_SCREENING,
        name: 'Ops Manager Screening',
        description: 'Ops manager screening (manages screening camps)',
        permissions: [CAMP_PERMISSIONS.MANAGE.code],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.OPERATION_MANAGER_DIET,
        name: 'Ops Manager Diet',
        description: 'Ops manager diet (manages diet camps)',
        permissions: [CAMP_PERMISSIONS.MANAGE.code],
    },

    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER,
        name: 'Field Officer',
        description: 'Field officer',
        permissions: [CAMP_PERMISSIONS.SEARCH.code, CAMP_PERMISSIONS.GET.code],
    },
];
