import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApprovalType } from '@/types/salesdash.types'
import * as salesService from '@/features/crm/sales/sales.service'
import type { AddRepInput } from '@/features/crm/sales/sales.service'

export const useSalesData = () => {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({ queryKey: ['sales-data'], queryFn: salesService.getSalesData })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sales-data'] })

  const addRepMutation = useMutation({
    mutationFn: (input: AddRepInput) => salesService.addRep(input),
    onSuccess: invalidate,
  })

  const setTargetMutation = useMutation({
    mutationFn: ({ repId, target, rationale, setBy }: { repId: string; target: number; rationale: string; setBy?: string }) =>
      salesService.setTarget(repId, target, rationale, setBy),
    onSuccess: invalidate,
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, note, reviewedBy }: { id: string; note: string; reviewedBy?: string }) =>
      salesService.approveRequest(id, note, reviewedBy),
    onSuccess: invalidate,
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason, reviewedBy }: { id: string; reason: string; reviewedBy?: string }) =>
      salesService.rejectRequest(id, reason, reviewedBy),
    onSuccess: invalidate,
  })

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => salesService.withdrawRequest(id),
    onSuccess: invalidate,
  })

  const submitMutation = useMutation({
    mutationFn: ({
      type,
      record,
      submittedBy,
      submittedByEmail,
    }: {
      type: ApprovalType
      record: Record<string, string>
      submittedBy?: string
      submittedByEmail?: string
    }) => salesService.submitRequest(type, record, submittedBy, submittedByEmail),
    onSuccess: invalidate,
  })

  return {
    reps: data?.reps ?? [],
    targets: data?.targets ?? [],
    assignments: data?.assignments ?? [],
    approvals: data?.approvals ?? [],
    activityFeed: data?.activityFeed ?? [],
    meetings: data?.meetings ?? [],
    isLoading,
    error,
    addRep: (input: AddRepInput) => addRepMutation.mutate(input),
    setTarget: (repId: string, target: number, rationale: string, setBy?: string) =>
      setTargetMutation.mutate({ repId, target, rationale, setBy }),
    approveRequest: (id: string, note: string, reviewedBy?: string) =>
      approveMutation.mutate({ id, note, reviewedBy }),
    rejectRequest: (id: string, reason: string, reviewedBy?: string) =>
      rejectMutation.mutate({ id, reason, reviewedBy }),
    withdrawRequest: (id: string) => withdrawMutation.mutate(id),
    submitRequest: (type: ApprovalType, record: Record<string, string>, submittedBy?: string, submittedByEmail?: string) =>
      submitMutation.mutate({ type, record, submittedBy, submittedByEmail }),
  }
}
