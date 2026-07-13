import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Meeting, MeetingOutcome } from '@/types/meeting.types'
import * as meetingsService from '@/features/crm/appointments/appointments.service'

export const useMeetings = () => {
  const queryClient = useQueryClient()

  const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: meetingsService.getMeetings })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['meetings'] })

  const createMutation = useMutation({
    mutationFn: (meeting: Meeting) => meetingsService.createMeeting(meeting),
    onSuccess: invalidate,
  })

  const submitMomMutation = useMutation({
    mutationFn: ({ id, momText, nextSteps }: { id: string; momText: string; nextSteps?: string }) =>
      meetingsService.submitMom(id, momText, nextSteps),
    onSuccess: invalidate,
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, startAt, endAt, reason }: { id: string; startAt: string; endAt: string; reason: string }) =>
      meetingsService.reschedule(id, startAt, endAt, reason),
    onSuccess: invalidate,
  })

  const markDoneMutation = useMutation({
    mutationFn: (id: string) => meetingsService.markDone(id),
    onSuccess: invalidate,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => meetingsService.cancel(id),
    onSuccess: invalidate,
  })

  const setOutcomeMutation = useMutation({
    mutationFn: ({ id, outcome, reason }: { id: string; outcome: MeetingOutcome; reason?: string }) =>
      meetingsService.setOutcome(id, outcome, reason),
    onSuccess: invalidate,
  })

  const releaseBlockMutation = useMutation({
    mutationFn: ({ id, reason, releasedBy }: { id: string; reason: string; releasedBy: string }) =>
      meetingsService.releaseBlock(id, reason, releasedBy),
    onSuccess: invalidate,
  })

  const createMeeting = (meeting: Meeting) => createMutation.mutateAsync(meeting)
  const submitMom = (id: string, momText: string, nextSteps?: string) =>
    submitMomMutation.mutate({ id, momText, nextSteps })
  const reschedule = (id: string, startAt: string, endAt: string, reason: string) =>
    rescheduleMutation.mutate({ id, startAt, endAt, reason })
  // Resolves { ok, error } so callers can surface the rejection inline
  const markDone = (id: string) => markDoneMutation.mutateAsync(id)
  const cancel = (id: string) => cancelMutation.mutate(id)
  const setOutcome = (id: string, outcome: MeetingOutcome, reason?: string) =>
    setOutcomeMutation.mutate({ id, outcome, reason })
  const releaseBlock = (id: string, reason: string, releasedBy: string) =>
    releaseBlockMutation.mutate({ id, reason, releasedBy })

  return { meetings, createMeeting, submitMom, reschedule, markDone, cancel, setOutcome, releaseBlock }
}
