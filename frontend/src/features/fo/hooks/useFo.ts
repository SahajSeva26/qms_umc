import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/features/fo/fo.service'
import type {
  FoClaim, ClaimStatus, LeaveRequest, TrainingRecord, TrainingStatus, Incident, IncidentStatus,
  ConsumableLot, FoNotification, MachineFlag,
} from '@/features/fo/fo.types'
import type { Camp } from '@/types/camp.types'
import { formatINR } from '@/utils/formatters'

// buildLiveNotifications — synthesizes the FO's notification feed from live
// data (camps/claims/incidents/consumables/training) rather than storing it,
// concatenated with persisted broadcasts (service.getNotifications). Order
// mirrors the prototype's fo-portal.js notification-priority list exactly —
// each rule only fires when its underlying count is > 0.
export function buildLiveNotifications(
  foId: string,
  camps: Camp[],
  claims: FoClaim[],
  incidents: Incident[],
  consumables: ConsumableLot[],
  training: (TrainingRecord & { status: TrainingStatus })[],
  persisted: FoNotification[]
): FoNotification[] {
  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const live: FoNotification[] = []

  const myCamps = camps.filter((c) => c.foId === foId)

  const todayCamp = myCamps.find((c) => c.date?.slice(0, 10) === todayIso)
  if (todayCamp) {
    live.push({
      id: `live-today-${todayCamp.id}`,
      kind: 'today',
      priority: 'high',
      icon: 'FiHome',
      title: `Today's camp: ${todayCamp.id}`,
      body: `${todayCamp.city} · ${todayCamp.slot}`,
      at: now.toISOString(),
      foId,
    })
  }

  const pendingClosure = myCamps.filter((c) => {
    const isPastUnclosed = c.date?.slice(0, 10) < todayIso && c.status !== 'COMPLETE' && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED' && c.status !== 'CLOSED'
    return c.status === 'INCOMPLETE' || isPastUnclosed
  })
  if (pendingClosure.length > 0) {
    live.push({
      id: 'live-closure',
      kind: 'reports',
      priority: 'urgent',
      icon: 'FiFileText',
      title: `${pendingClosure.length} camp(s) pending closure`,
      body: 'Upload mandatory reports + close to clear the queue.',
      at: now.toISOString(),
      foId,
    })
  }

  const upcoming = myCamps
    .filter((c) => c.date?.slice(0, 10) > todayIso)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  if (upcoming.length > 0) {
    const next = upcoming[0]
    live.push({
      id: `live-upcoming-${next.id}`,
      kind: 'upcoming',
      priority: 'med',
      icon: 'FiCalendar',
      title: `Upcoming: ${next.id}`,
      body: `${next.date?.slice(0, 10)} · ${next.city}`,
      at: now.toISOString(),
      foId,
    })
  }

  const pendingClaims = claims.filter((c) => c.foId === foId && (c.status === 'PENDING' || c.status === 'SUBMITTED'))
  if (pendingClaims.length > 0) {
    const total = pendingClaims.reduce((sum, c) => sum + c.amount, 0)
    live.push({
      id: 'live-claims',
      kind: 'expense',
      priority: 'med',
      icon: 'FiFileText',
      title: `${pendingClaims.length} claim(s) under review`,
      body: `${formatINR(total)} total`,
      at: now.toISOString(),
      foId,
    })
  }

  const openIncidents = incidents.filter((i) => i.foId === foId && i.status === 'OPEN')
  if (openIncidents.length > 0) {
    live.push({
      id: 'live-incidents',
      kind: 'incident',
      priority: 'urgent',
      icon: 'FiAlertTriangle',
      title: `${openIncidents.length} open ticket(s)`,
      body: openIncidents[0].title,
      at: now.toISOString(),
      foId,
    })
  }

  const expiringConsumables = consumables.filter((c) => {
    if (!c.expiry) return false
    const days = (new Date(c.expiry).getTime() - now.getTime()) / 86_400_000
    return days >= 0 && days < 30
  })
  if (expiringConsumables.length > 0) {
    live.push({
      id: 'live-consumables',
      kind: 'consum',
      priority: 'med',
      icon: 'FiPackage',
      title: `${expiringConsumables.length} consumable lot(s) expiring`,
      body: 'Use earliest expiry first (FIFO).',
      at: now.toISOString(),
      foId,
    })
  }

  const expiringCerts = training.filter((t) => {
    if (t.status !== 'VALID') return false
    const days = (new Date(t.expiresOn).getTime() - now.getTime()) / 86_400_000
    return days >= 0 && days < 30
  })
  if (expiringCerts.length > 0) {
    live.push({
      id: 'live-certs',
      kind: 'cert',
      priority: 'low',
      icon: 'FiAward',
      title: `${expiringCerts.length} certification(s) expiring soon`,
      body: 'Renew before expiry to stay eligible.',
      at: now.toISOString(),
      foId,
    })
  }

  return [...live, ...persisted].sort((a, b) => (a.at < b.at ? 1 : -1))
}

export const useFoClaims = () => {
  const queryClient = useQueryClient()
  const { data: claims = [], isLoading, error } = useQuery({ queryKey: ['fo', 'claims'], queryFn: service.getClaims })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fo', 'claims'] })

  const fileMutation = useMutation({
    mutationFn: ({ claim, status }: { claim: Omit<FoClaim, 'id' | 'filedOn' | 'status'>; status?: ClaimStatus }) =>
      service.fileClaim(claim, status),
    onSuccess: invalidate,
  })

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) => service.decideClaim(id, decision),
    onSuccess: invalidate,
  })

  return {
    claims,
    isLoading,
    error,
    fileClaim: (claim: Omit<FoClaim, 'id' | 'filedOn' | 'status'>, status?: ClaimStatus) => fileMutation.mutateAsync({ claim, status }),
    decideClaim: (id: string, decision: 'APPROVED' | 'REJECTED') => decideMutation.mutateAsync({ id, decision }),
  }
}

export const useFoTraining = (foId: string) => {
  const queryClient = useQueryClient()
  const { data: training = [], isLoading, error } = useQuery({
    queryKey: ['fo', 'training', foId],
    queryFn: () => service.getTraining(foId),
    enabled: !!foId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fo', 'training', foId] })

  const completeMutation = useMutation({
    mutationFn: (code: string) => service.markTrainingComplete(foId, code),
    onSuccess: invalidate,
  })

  return {
    training,
    isLoading,
    error,
    markComplete: (code: string) => completeMutation.mutateAsync(code),
  }
}

export const useFoLeaves = (foId?: string) => {
  const queryClient = useQueryClient()
  const { data: leaves = [], isLoading, error } = useQuery({
    queryKey: ['fo', 'leaves', foId ?? 'all'],
    queryFn: () => service.getLeaves(foId),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fo', 'leaves'] })

  const applyMutation = useMutation({
    mutationFn: (leave: Omit<LeaveRequest, 'id' | 'filedOn' | 'status'>) => service.applyLeave(leave),
    onSuccess: invalidate,
  })

  return {
    leaves,
    isLoading,
    error,
    applyLeave: (leave: Omit<LeaveRequest, 'id' | 'filedOn' | 'status'>) => applyMutation.mutateAsync(leave),
  }
}

export const useFoIncidents = (foId?: string) => {
  const queryClient = useQueryClient()
  const { data: incidents = [], isLoading, error } = useQuery({
    queryKey: ['fo', 'incidents', foId ?? 'all'],
    queryFn: () => service.getIncidents(foId),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fo', 'incidents'] })

  const raiseMutation = useMutation({
    mutationFn: (incident: Omit<Incident, 'id' | 'status' | 'createdAt'>) => service.raiseIncident(incident),
    onSuccess: invalidate,
  })

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) => service.setIncidentStatus(id, status),
    onSuccess: invalidate,
  })

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedToId, assignedToName, by }: { id: string; assignedToId: string; assignedToName: string; by: string }) =>
      service.assignIncident(id, assignedToId, assignedToName, by),
    onSuccess: invalidate,
  })

  const startMutation = useMutation({
    mutationFn: ({ id, by }: { id: string; by: string }) => service.startIncident(id, by),
    onSuccess: invalidate,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, by, notes, replacementDeviceId, replacementNotes }: { id: string; by: string; notes: string; replacementDeviceId?: string; replacementNotes?: string }) =>
      service.resolveIncident(id, by, notes, replacementDeviceId, replacementNotes),
    onSuccess: invalidate,
  })

  const closeMutation = useMutation({
    mutationFn: ({ id, by, notes }: { id: string; by: string; notes?: string }) => service.closeIncident(id, by, notes),
    onSuccess: invalidate,
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, by, reason }: { id: string; by: string; reason: string }) => service.cancelIncident(id, by, reason),
    onSuccess: invalidate,
  })

  return {
    incidents,
    isLoading,
    error,
    raiseIncident: (incident: Omit<Incident, 'id' | 'status' | 'createdAt'>) => raiseMutation.mutateAsync(incident),
    setIncidentStatus: (id: string, status: IncidentStatus) => setStatusMutation.mutateAsync({ id, status }),
    assignIncident: (id: string, assignedToId: string, assignedToName: string, by: string) => assignMutation.mutateAsync({ id, assignedToId, assignedToName, by }),
    startIncident: (id: string, by: string) => startMutation.mutateAsync({ id, by }),
    resolveIncident: (id: string, by: string, notes: string, replacementDeviceId?: string, replacementNotes?: string) =>
      resolveMutation.mutateAsync({ id, by, notes, replacementDeviceId, replacementNotes }),
    closeIncident: (id: string, by: string, notes?: string) => closeMutation.mutateAsync({ id, by, notes }),
    cancelIncident: (id: string, by: string, reason: string) => cancelMutation.mutateAsync({ id, by, reason }),
  }
}

export const useMachineFlags = () => {
  const queryClient = useQueryClient()
  const { data: flags = [], isLoading, error } = useQuery({ queryKey: ['fo', 'machineFlags'], queryFn: service.getMachineFlags })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fo', 'machineFlags'] })

  const flagMutation = useMutation({
    mutationFn: ({ deviceId, incidentId, notes }: { deviceId: string; incidentId: string; notes?: string }) =>
      service.flagMachineFaulty(deviceId, incidentId, notes),
    onSuccess: invalidate,
  })

  const clearMutation = useMutation({
    mutationFn: ({ deviceId, clearedBy }: { deviceId: string; clearedBy: string }) => service.clearMachineFlag(deviceId, clearedBy),
    onSuccess: invalidate,
  })

  return {
    flags,
    isLoading,
    error,
    isMachineFaulty: (deviceId: string) => service.isMachineFaulty(deviceId, flags as MachineFlag[]),
    flagMachineFaulty: (deviceId: string, incidentId: string, notes?: string) => flagMutation.mutateAsync({ deviceId, incidentId, notes }),
    clearMachineFlag: (deviceId: string, clearedBy: string) => clearMutation.mutateAsync({ deviceId, clearedBy }),
  }
}

export const useFoConsumables = (foId: string) => {
  const { data: consumables = [], isLoading, error } = useQuery({
    queryKey: ['fo', 'consumables', foId],
    queryFn: () => service.getConsumables(foId),
    enabled: !!foId,
  })

  return { consumables, isLoading, error }
}

// useFoNotifications — combines persisted broadcasts with the live-synthesized
// feed (buildLiveNotifications) and exposes unreadNotifCount. Live entries
// never carry readAt, so they always count as unread (matching the prototype).
export const useFoNotifications = (
  foId: string,
  camps: Camp[],
  claims: FoClaim[],
  incidents: Incident[],
  consumables: ConsumableLot[],
  training: (TrainingRecord & { status: TrainingStatus })[]
) => {
  const queryClient = useQueryClient()
  const { data: persisted = [], isLoading, error } = useQuery({
    queryKey: ['fo', 'notifications', foId],
    queryFn: () => service.getNotifications(foId),
    enabled: !!foId,
  })

  const markReadMutation = useMutation({
    mutationFn: () => service.markNotificationsRead(foId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fo', 'notifications', foId] }),
  })

  const notifications = buildLiveNotifications(foId, camps, claims, incidents, consumables, training, persisted)
  const unreadNotifCount = notifications.filter((n) => !n.readAt).length

  return {
    notifications,
    unreadNotifCount,
    isLoading,
    error,
    markAllRead: () => markReadMutation.mutateAsync(),
  }
}
