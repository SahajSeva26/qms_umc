import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ClientMr, PurchaseOrder } from '@/types/client.types'
import * as clientsService from '@/features/crm/clients/clients.service'
import type { BookCampInput, ClientsData } from '@/features/crm/clients/clients.service'

const EMPTY: ClientsData = {
  clients: [],
  divisions: [],
  mrs: [],
  projects: [],
  invoices: [],
  doctors: [],
  camps: [],
}

export const useClientsData = () => {
  const queryClient = useQueryClient()

  const { data = EMPTY, isLoading, error } = useQuery({ queryKey: ['clients-data'], queryFn: clientsService.getData })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clients-data'] })

  const addPoMutation = useMutation({
    mutationFn: ({ projectId, po }: { projectId: string; po: PurchaseOrder }) => clientsService.addPo(projectId, po),
    onSuccess: invalidate,
  })

  const updatePoMutation = useMutation({
    mutationFn: ({ projectId, po }: { projectId: string; po: PurchaseOrder }) => clientsService.updatePo(projectId, po),
    onSuccess: invalidate,
  })

  const addMrMutation = useMutation({
    mutationFn: (mr: ClientMr) => clientsService.addMr(mr),
    onSuccess: invalidate,
  })

  const addDoctorMutation = useMutation({
    mutationFn: (input: { name: string; specialty: string; city: string }) => clientsService.addDoctor(input),
    onSuccess: invalidate,
  })

  const bookCampMutation = useMutation({
    mutationFn: (input: BookCampInput) => clientsService.bookCamp(input),
    onSuccess: invalidate,
  })

  return {
    ...data,
    isLoading,
    error,
    addPo: (projectId: string, po: PurchaseOrder) => addPoMutation.mutateAsync({ projectId, po }),
    updatePo: (projectId: string, po: PurchaseOrder) => updatePoMutation.mutateAsync({ projectId, po }),
    addMr: (mr: ClientMr) => addMrMutation.mutateAsync(mr),
    addDoctor: (input: { name: string; specialty: string; city: string }) => addDoctorMutation.mutateAsync(input),
    bookCamp: (input: BookCampInput) => bookCampMutation.mutateAsync(input),
  }
}
