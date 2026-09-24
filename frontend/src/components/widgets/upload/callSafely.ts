// onRetry may reject (useUploadFile's steps re-throw after setting their own failure state) —
// React's onClick can't catch that, so this swallows both a sync throw and an async rejection.
export function callSafely(fn: () => void): void {
  void Promise.resolve().then(fn).catch(() => {})
}
