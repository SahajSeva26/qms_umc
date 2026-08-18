import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'

// Shared "update one record" shape: on success, invalidates every key in
// `invalidateKeys` — usually [entity, id] plus the plural list.
export function useUpdateEntity<TPayload, TResult>(mutationFn: (payload: TPayload) => Promise<TResult>, invalidateKeys: QueryKey[]) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
