import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'

// On success, invalidates the entity's list query so the new record shows up without a manual refetch.
export function useCreateEntity<TPayload, TResult>(mutationFn: (payload: TPayload) => Promise<TResult>, listKey: QueryKey) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
}
