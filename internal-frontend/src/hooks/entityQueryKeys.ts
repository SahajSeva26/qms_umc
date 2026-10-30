// Generic key-factory for the list/detail shape shared by
// useEntityQuery/useGetEntity/useCreateEntity/useUpdateEntity.
export interface EntityKeys<TQuery extends object = object> {
  /** Root segment — spread this to build any additional variant. */
  all: readonly [string]
  list: (query: TQuery) => readonly [string, TQuery]
  detail: (id: string) => readonly [string, string]
}

export function createEntityKeys<TQuery extends object = object>(
  name: string,
  singular: string = name,
): EntityKeys<TQuery> {
  return {
    all: [name] as const,
    list: (query: TQuery) => [name, query] as const,
    detail: (id: string) => [singular, id] as const,
  }
}
