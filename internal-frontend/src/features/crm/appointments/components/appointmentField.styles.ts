// Local field-styling layer for Appointments forms, matching the prototype's exact
// .input/.select/.textarea/label CSS (sales-calendar.js's injected .qms-cal-modal styles):
// 12px/14px padding, 14px radius (--r-md), a stronger border, surface-strong background,
// 14px text, and a brand-tinted focus ring. Scoped to this feature only — NOT a change to
// the shared Input/Select/Textarea/DatePicker/TimePicker components those values are
// overriding, since dozens of other forms app-wide rely on their current shared look.
//
// If the same exact treatment proves out on a second, unrelated form, that's the signal to
// promote this into a real shared component variant (with its own tokens + regression
// coverage) instead of copy-pasting this file again.

// className for Input/Textarea/DatePicker's own trigger — all three accept a plain
// `className` override on the actual field element. The shared component's own focus-ring
// color (--ring) already matches the prototype's exactly (confirmed against index.css), so
// only shape/border/background need overriding here.
export const fieldInputClassName = 'h-auto rounded-[14px] border px-3.5 py-3 text-[14px]'

export const fieldInputStyle = {
  borderColor: 'var(--qms-border-strong)',
  background: 'var(--qms-surface-strong)',
} as const

// Select's trigger is a flex row, not a plain text input — same visual values, different
// base classes (h-8/rounded-lg from the shared component don't apply here).
export const fieldSelectTriggerClassName = 'w-full h-auto justify-between rounded-[14px] border px-3.5 py-3 text-[14px]'

export const fieldSelectTriggerStyle = fieldInputStyle

// SelectContent renders through a portal (outside this form's DOM), so it needs its own
// override rather than inheriting from a wrapping container — same border/radius/bg values
// as the trigger, matching the prototype's dropdown panel.
export const fieldSelectContentClassName = 'rounded-[14px] border'

export const fieldSelectContentStyle = {
  borderColor: 'var(--qms-border-strong)',
  background: 'var(--qms-surface-strong)',
} as const
