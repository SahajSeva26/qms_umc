import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'

// Shared "create one record" shape used across every entity: on success,
// invalidates that entity's list query so the new record shows up without a
// manual refetch.
export function useCreateEntity<TPayload, TResult>(mutationFn: (payload: TPayload) => Promise<TResult>, listKey: QueryKey) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
}
