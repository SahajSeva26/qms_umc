// Shared field/label styling for the New Project wizard, matching the
// prototype's injectCss() module CSS exactly (projects-manager.js
// .qms-prj-modal label / .input / .select / .textarea rules) rather than
// the CRM wizard's borrowed defaults. Also shared verbatim by the CRM New
// Lead wizard, which uses the byte-identical .qms-sl-modal rules.
export const labelClasses = 'block text-[11px] font-bold uppercase tracking-wide mb-1'
export const labelStyle = { color: 'var(--qms-text-soft)' }
// Prototype: padding:12px 14px; border-radius:14px (--r-md); font-size:14px.
export const fieldClasses = 'text-sm rounded-[14px] px-3.5 py-3 h-auto'
