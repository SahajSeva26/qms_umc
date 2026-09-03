import { ALLOWED_ROLETYPE_CODES } from '../../modules/access-management/role-type/roleType.constants';
import { LEAD_PERMISSIONS } from '../../modules/crm/lead/lead.constants';
import { APPOINTMENT_PERMISSIONS } from '../../modules/crm/appointment/appointment.constants';
import { DOCTOR_PERMISSIONS } from '../../modules/crm/doctor/doctor.constants';
import { CAMP_PERMISSIONS } from '../../modules/operations/camp/camp.constants';
import { TEST_MASTER_PERMISSIONS } from '../../modules/operations/testMaster/testMaster.constants';
import { PATIENT_PERMISSIONS } from '../../modules/operations/patient/patient.constants';
import { SCREENING_PERMISSIONS } from '../../modules/operations/screening/screening.constants';
import { TEST_PERMISSIONS } from '../../modules/operations/test/test.constants';
import { TENANT_PERMISSIONS } from '../../modules/access-management/tenant/tenant.constants';
import { DIVISION_PERMISSIONS } from '../../modules/crm/division/division.constants';
import { CONTACT_PERMISSIONS } from '../../modules/crm/contact/contact.constants';
import { ROLE_PERMISSIONS } from '../../modules/access-management/role/role.constants';
import { INVENTORY_REQUEST_PERMISSIONS } from '../../modules/inventory/inventory-request/inventory-request.constants';
import { INVENTORY_MASTER_PERMISSIONS } from '../../modules/inventory/inventory-master/inventory-master.constants';
import { INVENTORY_CONSUMABLE_PERMISSIONS } from '../../modules/inventory/inventory-consumable/inventory-consumable.constants';
import { INVENTORY_DEVICE_PERMISSIONS } from '../../modules/inventory/inventory-device/inventory-device.constants';
import { INVENTORY_ASSIGNMENT_PERMISSIONS } from '../../modules/inventory/inventory-assignment/inventory-assignment.constants';
import { INVENTORY_LEDGER_PERMISSIONS } from '../../modules/inventory/inventory-ledger/inventory-ledger.constants';
import { VENDOR_MASTER_PERMISSIONS } from '../../modules/vendor-master/vendor-master.constants';
import { INVOICE_PERMISSIONS } from '../../modules/finance/invoice/invoice.constants';
import { INVOICE_LINE_ITEM_PERMISSIONS } from '../../modules/finance/invoiceLineItem/invoiceLineItem.constants';

// CRM ROLE TYPES
export const CRM_BUSINESS_ROLE_TYPES = [
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.SALES_REP,
        name: 'Sales Representative',
        description: 'Sales representative — owns and works their own leads',
        permissions: [
            TENANT_PERMISSIONS.SEARCH.code,
            TENANT_PERMISSIONS.GET.code,

            ROLE_PERMISSIONS.SEARCH.code,
            ROLE_PERMISSIONS.GET.code,

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

            CONTACT_PERMISSIONS.SEARCH.code,
            CONTACT_PERMISSIONS.GET.code,
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

            ROLE_PERMISSIONS.SEARCH.code,
            ROLE_PERMISSIONS.GET.code,

            DIVISION_PERMISSIONS.MANAGE.code,
            CONTACT_PERMISSIONS.MANAGE.code,
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
            PATIENT_PERMISSIONS.CREATE.code,
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
            PATIENT_PERMISSIONS.CREATE.code,
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
            TEST_MASTER_PERMISSIONS.MANAGE.code,
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
            TEST_MASTER_PERMISSIONS.MANAGE.code,
            APPOINTMENT_PERMISSIONS.SEARCH.code,
            APPOINTMENT_PERMISSIONS.GET.code,
            APPOINTMENT_PERMISSIONS.RSVP.code,
        ],
    },

    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.INVENTORY_MANAGER,
        name: 'Inventory Manager',
        description: 'Inventory manager — full control over the inventory domain',
        permissions: [
            INVENTORY_MASTER_PERMISSIONS.MANAGE.code,
            INVENTORY_CONSUMABLE_PERMISSIONS.MANAGE.code,
            INVENTORY_DEVICE_PERMISSIONS.MANAGE.code,
            INVENTORY_ASSIGNMENT_PERMISSIONS.MANAGE.code,
            INVENTORY_REQUEST_PERMISSIONS.MANAGE.code,
            INVENTORY_LEDGER_PERMISSIONS.MANAGE.code,
            VENDOR_MASTER_PERMISSIONS.MANAGE.code,
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
            // read the test catalog (needed to run camp tests) — read-only, no manage
            TEST_MASTER_PERMISSIONS.SEARCH.code,
            TEST_MASTER_PERMISSIONS.GET.code,
            // register + look up + amend patients at the camp (own-scoped reads)
            PATIENT_PERMISSIONS.CREATE.code,
            PATIENT_PERMISSIONS.GET.code,
            PATIENT_PERMISSIONS.SEARCH.code,
            PATIENT_PERMISSIONS.UPDATE.code,
            // start + progress + read back screenings at a live camp they are assigned to
            SCREENING_PERMISSIONS.CREATE.code,
            SCREENING_PERMISSIONS.UPDATE.code,
            SCREENING_PERMISSIONS.GET.code,
            SCREENING_PERMISSIONS.SEARCH.code,
            // record + correct + read back patient test results after the screening is completed
            TEST_PERMISSIONS.CREATE.code,
            TEST_PERMISSIONS.UPDATE.code,
            TEST_PERMISSIONS.GET.code,
            TEST_PERMISSIONS.SEARCH.code,
            // raise and manage their own refill/return requests (progressing the stage is manage-only)
            INVENTORY_REQUEST_PERMISSIONS.CREATE.code,
            INVENTORY_REQUEST_PERMISSIONS.GET.code,
            INVENTORY_REQUEST_PERMISSIONS.SEARCH.code,
            INVENTORY_REQUEST_PERMISSIONS.UPDATE.code,
        ],
    },
];

// FINANCE ROLE TYPES
export const FINANCE_BUSINESS_ROLE_TYPES = [
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.FINANCE_MANAGER,
        name: 'Finance Manager',
        description: 'Finance manager — full control over invoicing',
        permissions: [INVOICE_PERMISSIONS.MANAGE.code, INVOICE_LINE_ITEM_PERMISSIONS.MANAGE.code],
    },
];
