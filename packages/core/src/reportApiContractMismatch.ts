interface ContractIssue {
  path: string
  code: string
}

// Deliberately narrow: only endpoint + Zod path/code breadcrumbs, never response body/headers/auth (PII/token risk).
export function reportApiContractMismatch(endpoint: string, issues: ContractIssue[]): void {
  if (import.meta.env.DEV) {
    console.warn(`[api-contract] ${endpoint} did not match its expected shape`, issues)
  }
}
