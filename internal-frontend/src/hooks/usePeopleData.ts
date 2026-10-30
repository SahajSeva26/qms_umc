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

interface UsePeopleDataOptions {
  /**
   * Fetch the device catalog alongside people. Defaults to `true` — every
   * existing caller keeps its current behaviour unchanged. Pass `false` when
   * a screen only reads `people` (e.g. Dedicated Ops, Ops Manager's
   * AuditTab, Reminders) so its route doesn't pay for a fetch it never
   * touches. Today `getDevices()` is a synchronous mock read, so this is
   * free either way — the point is to keep the query from becoming a real,
   * wasted network round-trip once a backend device endpoint lands.
   */
  devices?: boolean
}

export const usePeopleData = (role?: PersonRole, options: UsePeopleDataOptions = {}) => {
  const wantDevices = options.devices ?? true
  const { data: people = [], isLoading: peopleLoading, error: peopleError } = useQuery({ queryKey: ['people'], queryFn: getPeople })
  const { data: devices = [], isLoading: devicesLoading, error: devicesError } = useQuery({ queryKey: ['devices'], queryFn: getDevices, enabled: wantDevices })

  return {
    people: role ? people.filter((p) => p.role === role) : people,
    devices,
    isLoading: peopleLoading || (wantDevices && devicesLoading),
    error: peopleError || (wantDevices ? devicesError : null),
  }
}

export function personName(people: Person[], id?: string): string {
  if (!id) return ''
  return people.find((p) => p.id === id)?.name ?? id
}
