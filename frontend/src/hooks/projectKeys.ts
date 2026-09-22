import { createEntityKeys } from '@/hooks/entityQueryKeys'
import type { SearchProjectQuery } from '@/types/project.types'

export const projectKeys = createEntityKeys<SearchProjectQuery>('projects', 'project')
