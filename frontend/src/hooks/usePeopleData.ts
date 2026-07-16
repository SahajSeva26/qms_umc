import { useQuery } from '@tanstack/react-query'
import type { Person, PersonRole } from '@/types/people.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import { PEOPLE, DEVICE_CATALOG } from '@/types/people.mock'

// Shared read-only staff/device master — Operations screens (Ops Manager,
// Dedicated Ops, Diet Camps) all read Field Officers/Dietitians/Coordinators
// and the device catalog from here rather than each owning a competing copy.
// No feature folder owns this data (mirrors useAuth.ts/useCampsData.ts's
// pattern of a top-level shared hook over a cross-cutting master).
// TODO: replace with real API calls once a backend people/device endpoint exists.

async function getPeople(): Promise<Person[]> {
  return PEOPLE
}

async function getDevices(): Promise<DeviceCatalogItem[]> {
  return DEVICE_CATALOG
}

export const usePeopleData = (role?: PersonRole) => {
  const { data: people = [], isLoading: peopleLoading, error: peopleError } = useQuery({ queryKey: ['people'], queryFn: getPeople })
  const { data: devices = [], isLoading: devicesLoading, error: devicesError } = useQuery({ queryKey: ['devices'], queryFn: getDevices })

  return {
    people: role ? people.filter((p) => p.role === role) : people,
    devices,
    isLoading: peopleLoading || devicesLoading,
    error: peopleError || devicesError,
  }
}

export function personName(people: Person[], id?: string): string {
  if (!id) return ''
  return people.find((p) => p.id === id)?.name ?? id
}
