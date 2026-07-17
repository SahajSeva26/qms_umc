import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Project } from '@/types/project.types'
import type { VerificationStatusId } from '@/features/om/erp.types'
import * as erpService from '@/features/om/erp.service'

export const useErp = () => {
  const queryClient = useQueryClient()
  const verificationQuery = useQuery({ queryKey: ['erp-verification'], queryFn: erpService.getVerification })
  const billedQuery = useQuery({ queryKey: ['erp-billed'], queryFn: erpService.getBilledCampIds })
  const invoicesQuery = useQuery({ queryKey: ['erp-invoices'], queryFn: erpService.getInvoices })

  const invalidateVerification = () => queryClient.invalidateQueries({ queryKey: ['erp-verification'] })
  const invalidateBilling = () => {
    queryClient.invalidateQueries({ queryKey: ['erp-billed'] })
    queryClient.invalidateQueries({ queryKey: ['erp-invoices'] })
  }

  const acceptMutation = useMutation({ mutationFn: ({ campId, by }: { campId: string; by: string }) => erpService.setVerificationAccepted(campId, by), onSuccess: invalidateVerification })
  const decideMutation = useMutation({
    mutationFn: (args: { campId: string; status: VerificationStatusId; reason: string; rootCause: string; correctiveAction: string; responsible: string; by: string }) =>
      erpService.submitVerificationDecision(args.campId, args.status, args.reason, args.rootCause, args.correctiveAction, args.responsible, args.by),
    onSuccess: invalidateVerification,
  })
  const requestReinstateMutation = useMutation({ mutationFn: ({ campId, by }: { campId: string; by: string }) => erpService.requestReinstate(campId, by), onSuccess: invalidateVerification })
  const decideReinstateMutation = useMutation({
    mutationFn: ({ campId, decision, by }: { campId: string; decision: 'APPROVED' | 'REJECTED'; by: string }) => erpService.decideReinstate(campId, decision, by),
    onSuccess: invalidateVerification,
  })
  const generateInvoiceMutation = useMutation({
    mutationFn: ({ project, billableIds, by }: { project: Project; billableIds: string[]; by: string }) => erpService.generateInvoice(project, billableIds, by),
    onSuccess: invalidateBilling,
  })

  return {
    verification: verificationQuery.data ?? {},
    billedCampIds: billedQuery.data ?? new Set<string>(),
    invoices: invoicesQuery.data ?? [],
    isLoading: verificationQuery.isLoading,
    acceptVerification: (campId: string, by: string) => acceptMutation.mutateAsync({ campId, by }),
    submitVerificationDecision: (campId: string, status: VerificationStatusId, reason: string, rootCause: string, correctiveAction: string, responsible: string, by: string) =>
      decideMutation.mutateAsync({ campId, status, reason, rootCause, correctiveAction, responsible, by }),
    requestReinstate: (campId: string, by: string) => requestReinstateMutation.mutateAsync({ campId, by }),
    decideReinstate: (campId: string, decision: 'APPROVED' | 'REJECTED', by: string) => decideReinstateMutation.mutateAsync({ campId, decision, by }),
    generateInvoice: (project: Project, billableIds: string[], by: string) => generateInvoiceMutation.mutateAsync({ project, billableIds, by }),
  } as const
}
