export const QA_FEEDBACK_STATUS = {
    OPEN: 'open',
    RESOLVED: 'resolved',
} as const;

// ============================================================
// ============= QA FEEDBACK PERMISSIONS CONSTANTS =============
// ============================================================
// Two codes, not a full CRUD split (matches DIVISION_PERMISSIONS'
// single-action shape, not LEAD's 5-code split): CREATE covers what every
// tester needs (drop a report on any screen); MANAGE covers what only the
// reviewing developers need (list/read every report across every tenant,
// mark resolved). There is no per-tenant visibility split here — QA
// feedback is about THIS APPLICATION's screens, not about tenant data, so
// unlike every other module's ctx.where() tenant-scoping, a report is
// visible to any MANAGE holder regardless of which tenant reported it.
export const QA_FEEDBACK_PERMISSIONS = {
    CREATE: { code: 'qa-feedback:create', name: 'Create QA Feedback', description: 'Report a QA feedback comment' } as const,
    MANAGE: { code: 'qa-feedback:manage', name: 'Manage QA Feedback', description: 'Review and resolve QA feedback' } as const,
};
