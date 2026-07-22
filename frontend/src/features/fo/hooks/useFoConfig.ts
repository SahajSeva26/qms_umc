import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as foConfigService from '@/features/fo/foConfig.service'
import type { FoProjectConfig, FoTestDef, ConsumableMapEntry } from '@/features/fo/foConfig.types'
import type { Project } from '@/types/project.types'

// React Query wrapper around foConfig.service.ts (the FO Config Master
// engine). All CRUD/interpretation logic lives in the service — this hook
// only handles caching + invalidation.
export const useFoConfig = () => {
  const queryClient = useQueryClient()

  const projectConfigsQuery = useQuery({ queryKey: ['fo-config-projects'], queryFn: foConfigService.listProjectConfigs })
  const testsQuery = useQuery({ queryKey: ['fo-config-tests'], queryFn: foConfigService.listTests })

  const invalidateProjectConfigs = () => queryClient.invalidateQueries({ queryKey: ['fo-config-projects'] })
  const invalidateTests = () => queryClient.invalidateQueries({ queryKey: ['fo-config-tests'] })

  const saveProjectConfigMutation = useMutation({
    mutationFn: ({ projectId, cfg }: { projectId: string; cfg: Partial<FoProjectConfig> }) => foConfigService.saveProjectConfig(projectId, cfg),
    onSuccess: invalidateProjectConfigs,
  })

  const deleteProjectConfigMutation = useMutation({
    mutationFn: (projectId: string) => foConfigService.deleteProjectConfig(projectId),
    onSuccess: invalidateProjectConfigs,
  })

  const saveTestMutation = useMutation({
    mutationFn: (def: FoTestDef) => foConfigService.saveTest(def),
    onSuccess: invalidateTests,
  })

  const deleteTestMutation = useMutation({
    mutationFn: (testId: string) => foConfigService.deleteTest(testId),
    onSuccess: invalidateTests,
  })

  const setConsumablesForTestMutation = useMutation({
    mutationFn: ({ testId, list }: { testId: string; list: ConsumableMapEntry[] }) => foConfigService.setConsumablesForTest(testId, list),
  })

  const seedDemoMutation = useMutation({
    mutationFn: (force: boolean) => foConfigService.seedDemo(force),
    onSuccess: invalidateTests,
  })

  return {
    projectConfigs: projectConfigsQuery.data ?? [],
    tests: testsQuery.data ?? [],
    isLoading: projectConfigsQuery.isLoading || testsQuery.isLoading,
    error: projectConfigsQuery.error ?? testsQuery.error,

    saveProjectConfig: (projectId: string, cfg: Partial<FoProjectConfig>) => saveProjectConfigMutation.mutateAsync({ projectId, cfg }),
    deleteProjectConfig: (projectId: string) => deleteProjectConfigMutation.mutateAsync(projectId),
    saveTest: (def: FoTestDef) => saveTestMutation.mutateAsync(def),
    deleteTest: (testId: string) => deleteTestMutation.mutateAsync(testId),
    setConsumablesForTest: (testId: string, list: ConsumableMapEntry[]) => setConsumablesForTestMutation.mutateAsync({ testId, list }),
    seedDemo: (force = false) => seedDemoMutation.mutateAsync(force),
    exportConfigSnapshot: () => foConfigService.exportConfigSnapshot(),

    // Effective config for a project — explicit saved config if one exists,
    // else a blank default seeded from the project's own name/therapy/client.
    getProjectConfigOrBlank: async (project: Project): Promise<FoProjectConfig> => {
      const existing = await foConfigService.getProjectConfig(project.id)
      return existing ?? foConfigService.blankProjectConfig(project)
    },
  } as const
}
