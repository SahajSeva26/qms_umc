import { ALLOWED_ROLETYPE_CODES } from '../../modules/access-management/role-type/roleType.constants';
import { LEAD_PERMISSIONS } from '../../modules/crm/lead/lead.constants';
import { APPOINTMENT_PERMISSIONS } from '../../modules/crm/appointment/appointment.constants';
import { DOCTOR_PERMISSIONS } from '../../modules/doctor/doctor.constants';
import { CAMP_PERMISSIONS } from '../../modules/operations/camp/camp.constants';
import { TENANT_PERMISSIONS } from '../../modules/access-management/tenant/tenant.constants';
import { DIVISION_PERMISSIONS } from '../../modules/crm/division/division.constants';

// CRM ROLE TYPES
export const CRM_BUSINESS_ROLE_TYPES = [
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.SALES_REP,
        name: 'Sales Representative',
        description: 'Sales representative — owns and works their own leads',
        permissions: [
            TENANT_PERMISSIONS.SEARCH.code,
            TENANT_PERMISSIONS.GET.code,

            LEAD_PERMISSIONS.SEARCH.code,
            LEAD_PERMISSIONS.CREATE.code,
            LEAD_PERMISSIONS.UPDATE.code,
            LEAD_PERMISSIONS.GET.code,
            // appointments they own/attend — CRUD (search+get is what the service scopes own-visibility off)
            APPOINTMENT_PERMISSIONS.SEARCH.code,
            APPOINTMENT_PERMISSIONS.CREATE.code,
            APPOINTMENT_PERMISSIONS.UPDATE.code,
            APPOINTMENT_PERMISSIONS.GET.code,
            APPOINTMENT_PERMISSIONS.RSVP.code,
        ],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.SALES_HEAD,
        name: 'Sales Head',
        description: 'Sales head — full lead visibility, assigns leads to sales reps',
        permissions: [
            LEAD_PERMISSIONS.MANAGE.code,
            APPOINTMENT_PERMISSIONS.MANAGE.code,
            TENANT_PERMISSIONS.SEARCH.code,
            TENANT_PERMISSIONS.GET.code,

            DIVISION_PERMISSIONS.MANAGE.code,
        ],
    },
];

// OPERATION ROLE TYPES
export const OPERATION_BUSINESS_ROLE_TYPES = [
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.CAMP_COORDINATOR_SCREENING,
        name: 'Camp Coordinator (Screening)',
        description: 'Screening camp coordinator',
        permissions: [
            TENANT_PERMISSIONS.SEARCH.code,
            TENANT_PERMISSIONS.GET.code,

            CAMP_PERMISSIONS.SEARCH.code,
            CAMP_PERMISSIONS.GET.code,
            CAMP_PERMISSIONS.UPDATE.code,
            DOCTOR_PERMISSIONS.MANAGE.code,
            APPOINTMENT_PERMISSIONS.SEARCH.code,
            APPOINTMENT_PERMISSIONS.GET.code,
            APPOINTMENT_PERMISSIONS.RSVP.code,
        ],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.CAMP_COORDINATOR_DIET,
        name: 'Camp Coordinator (Diet)',
        description: 'Diet camp coordinator',
        permissions: [
            TENANT_PERMISSIONS.SEARCH.code,
            TENANT_PERMISSIONS.GET.code,

            CAMP_PERMISSIONS.SEARCH.code,
            CAMP_PERMISSIONS.GET.code,
            CAMP_PERMISSIONS.UPDATE.code,

            DOCTOR_PERMISSIONS.MANAGE.code,

            APPOINTMENT_PERMISSIONS.SEARCH.code,
            APPOINTMENT_PERMISSIONS.GET.code,
            APPOINTMENT_PERMISSIONS.RSVP.code,
        ],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.OPERATION_MANAGER_SCREENING,
        name: 'Ops Manager Screening',
        description: 'Ops manager screening (manages screening camps)',
        permissions: [
            TENANT_PERMISSIONS.SEARCH.code,
            TENANT_PERMISSIONS.GET.code,

            CAMP_PERMISSIONS.MANAGE.code,
            APPOINTMENT_PERMISSIONS.SEARCH.code,
            APPOINTMENT_PERMISSIONS.GET.code,
            APPOINTMENT_PERMISSIONS.RSVP.code,
        ],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.OPERATION_MANAGER_DIET,
        name: 'Ops Manager Diet',
        description: 'Ops manager diet (manages diet camps)',
        permissions: [
            TENANT_PERMISSIONS.SEARCH.code,
            TENANT_PERMISSIONS.GET.code,

            CAMP_PERMISSIONS.MANAGE.code,
            APPOINTMENT_PERMISSIONS.SEARCH.code,
            APPOINTMENT_PERMISSIONS.GET.code,
            APPOINTMENT_PERMISSIONS.RSVP.code,
        ],
    },

    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER,
        name: 'Field Officer',
        description: 'Field officer',
        permissions: [
            CAMP_PERMISSIONS.SEARCH.code,
            CAMP_PERMISSIONS.GET.code,
            APPOINTMENT_PERMISSIONS.SEARCH.code,
            APPOINTMENT_PERMISSIONS.GET.code,
            APPOINTMENT_PERMISSIONS.RSVP.code,
        ],
    },
];
