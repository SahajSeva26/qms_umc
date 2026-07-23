// FO Config Master's engine — project config CRUD, test master CRUD, the
// clinical interpretation engine, and the camp-execution config resolver.
// Shared by the FO Config Master admin screen and the Run Camp wizard.
// Mirrors fo-config-master.js's window.QMS_FO_CONFIG exactly.
// TODO: entirely mock/frontend-only — no backend endpoints exist yet.

import type { Camp } from '@/types/camp.types'
import type { ProjectEntity } from '@/types/project.types'
import { projectTenantName } from '@/features/projects/projects.utils'
import {
  type FoProjectConfig, type FoTestDef, type ConsumableMapEntry, type InterpretationResult,
  DEFAULT_PATIENT_FIELDS, DEFAULT_SETUP_PHOTOS, DEFAULT_ADDITIONAL_PHOTOS, DEFAULT_DELAY_REASONS,
  LEVEL_COLOR, SEED_TESTS, SEED_CONSUMABLE_MAP, defaultTestsForType,
} from '@/features/fo/foConfig.types'

const KEYS = {
  PROJECT_CONFIG: 'qms.fo.projectConfig',
  TEST_MASTER: 'qms.fo.testMaster',
  CONSUMABLE_MAP: 'qms.fo.consumableMap',
}

function load<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(seed))
}

function persist<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // demo persistence only
  }
}

function seedTestMaster(): Record<string, FoTestDef> {
  const map: Record<string, FoTestDef> = {}
  SEED_TESTS.forEach((t) => { map[t.id] = { ...t, updatedAt: new Date().toISOString() } })
  return map
}

export async function listTests(): Promise<FoTestDef[]> {
  const map = load(KEYS.TEST_MASTER, seedTestMaster())
  return Object.values(map)
}

export async function getTest(testId: string): Promise<FoTestDef | undefined> {
  const map = load(KEYS.TEST_MASTER, seedTestMaster())
  return map[testId]
}

export async function saveTest(def: FoTestDef): Promise<FoTestDef[]> {
  const map = load(KEYS.TEST_MASTER, seedTestMaster())
  map[def.id] = { ...def, updatedAt: new Date().toISOString() }
  persist(KEYS.TEST_MASTER, map)
  return Object.values(map)
}

export async function deleteTest(testId: string): Promise<FoTestDef[]> {
  const map = load(KEYS.TEST_MASTER, seedTestMaster())
  delete map[testId]
  persist(KEYS.TEST_MASTER, map)
  return Object.values(map)
}

export async function listProjectConfigs(): Promise<FoProjectConfig[]> {
  const map = load(KEYS.PROJECT_CONFIG, {} as Record<string, FoProjectConfig>)
  return Object.values(map)
}

export async function getProjectConfig(projectId: string): Promise<FoProjectConfig | undefined> {
  const map = load(KEYS.PROJECT_CONFIG, {} as Record<string, FoProjectConfig>)
  return map[projectId]
}

export async function saveProjectConfig(projectId: string, cfg: Partial<FoProjectConfig>): Promise<FoProjectConfig> {
  const map = load(KEYS.PROJECT_CONFIG, {} as Record<string, FoProjectConfig>)
  map[projectId] = { ...map[projectId], ...cfg, projectId, updatedAt: new Date().toISOString() } as FoProjectConfig
  persist(KEYS.PROJECT_CONFIG, map)
  return map[projectId]
}

export async function deleteProjectConfig(projectId: string): Promise<void> {
  const map = load(KEYS.PROJECT_CONFIG, {} as Record<string, FoProjectConfig>)
  delete map[projectId]
  persist(KEYS.PROJECT_CONFIG, map)
}

export function blankProjectConfig(project: ProjectEntity): FoProjectConfig {
  return {
    projectId: project.id,
    projectName: project.name,
    therapyArea: project.therapy,
    clientId: projectTenantName(project),
    patientFields: DEFAULT_PATIENT_FIELDS.slice(),
    tests: [],
    consent: { type: 'signature', mandatory: true, otpEnabled: true, uploadEnabled: true },
    setupPhotos: DEFAULT_SETUP_PHOTOS.slice(),
    additionalPhotos: DEFAULT_ADDITIONAL_PHOTOS.slice(),
    mandatoryReportOnClose: true,
    delayReasons: DEFAULT_DELAY_REASONS.slice(),
    checkinRadiusM: 300,
    faceMatch: true,
  }
}

export async function consumablesForTest(testId: string): Promise<ConsumableMapEntry[]> {
  const map = load(KEYS.CONSUMABLE_MAP, { ...SEED_CONSUMABLE_MAP })
  return map[testId] ?? []
}

export async function setConsumablesForTest(testId: string, list: ConsumableMapEntry[]): Promise<void> {
  const map = load(KEYS.CONSUMABLE_MAP, { ...SEED_CONSUMABLE_MAP })
  map[testId] = list
  persist(KEYS.CONSUMABLE_MAP, map)
}

// seedDemo(force) — exact port of fo-config-master.html's window.cmResetDemo's
// underlying CFG().seedDemo(false): only re-populates the test master when the
// store is empty (force=true always re-seeds). "Re-seed demo" in the admin UI
// calls this with force=false, so existing custom test edits are preserved,
// matching the button's own tooltip. React's project configs are always
// computed on-demand from blankProjectConfig() rather than static demo seed
// data, so there is no equivalent project-config store to re-seed here.
export async function seedDemo(force = false): Promise<void> {
  const tests = load(KEYS.TEST_MASTER, {} as Record<string, FoTestDef>)
  if (force || Object.keys(tests).length === 0) persist(KEYS.TEST_MASTER, seedTestMaster())
}

// Exact port of fo-config-master.html's window.cmExport — builds a real
// consumableMap keyed by test id (not an empty placeholder).
export async function exportConfigSnapshot(): Promise<{
  projectConfigs: FoProjectConfig[]
  testMaster: FoTestDef[]
  consumableMap: Record<string, ConsumableMapEntry[]>
  exportedAt: string
}> {
  const projectConfigs = await listProjectConfigs()
  const testMaster = await listTests()
  const consumableMap: Record<string, ConsumableMapEntry[]> = {}
  for (const t of testMaster) {
    consumableMap[t.id] = await consumablesForTest(t.id)
  }
  return { projectConfigs, testMaster, consumableMap, exportedAt: new Date().toISOString() }
}

// interpret() — first-match-wins clinical rule evaluation, exact port of
// fo-config-master.js:150-184.
export function interpret(test: FoTestDef | undefined, rawValue: string | number, patient?: { age?: number; gender?: string }): InterpretationResult | null {
  if (!test) return null
  const rules = test.rules ?? []
  const num = rawValue === '' || rawValue == null ? null : Number(rawValue)
  const pat = patient ?? {}
  for (const rule of rules) {
    if (!rule) continue
    if (rule.gender && pat.gender && String(rule.gender).toLowerCase() !== String(pat.gender).toLowerCase()) continue
    if (rule.ageMin != null && pat.age != null && Number(pat.age) < Number(rule.ageMin)) continue
    if (rule.ageMax != null && pat.age != null && Number(pat.age) > Number(rule.ageMax)) continue
    let match = false
    if (rule.op === 'eq_text') {
      match = String(rawValue ?? '').toLowerCase() === String(rule.value ?? '').toLowerCase()
    } else if (rule.op === 'between') {
      if (num != null && rule.from != null && rule.to != null) match = num >= Number(rule.from) && num <= Number(rule.to)
    } else if (num != null && rule.value != null) {
      const v = Number(rule.value)
      if (rule.op === '>') match = num > v
      if (rule.op === '>=') match = num >= v
      if (rule.op === '<') match = num < v
      if (rule.op === '<=') match = num <= v
      if (rule.op === '=') match = num === v
    }
    if (match) {
      return { level: rule.level || 'info', critical: rule.level === 'critical', message: rule.message || '', color: LEVEL_COLOR[rule.level] ?? LEVEL_COLOR.info }
    }
  }
  return null
}

// resolveForCamp() — the effective config for a camp: explicit project config
// if one exists, else a keyword-derived default. Exact port of
// fo-config-master.js:204-236.
export async function resolveForCamp(camp: Camp | undefined, project: ProjectEntity | undefined): Promise<FoProjectConfig & { source: 'project' | 'default' }> {
  if (camp?.projectId) {
    const proj = await getProjectConfig(camp.projectId)
    if (proj) return { ...proj, source: 'project' }
  }
  // project.type is a real backend array field now (a project can be more
  // than one type) — take the first entry as the keyword-match input,
  // matching this function's own "one representative type" contract.
  const type = camp?.type ?? project?.type?.[0] ?? 'General'
  return {
    projectId: camp?.projectId ?? '',
    patientFields: DEFAULT_PATIENT_FIELDS.slice(),
    tests: defaultTestsForType(type),
    consent: { type: 'signature', mandatory: true, otpEnabled: true, uploadEnabled: true },
    setupPhotos: DEFAULT_SETUP_PHOTOS.slice(),
    additionalPhotos: DEFAULT_ADDITIONAL_PHOTOS.slice(),
    mandatoryReportOnClose: true,
    delayReasons: DEFAULT_DELAY_REASONS.slice(),
    checkinRadiusM: 300,
    faceMatch: true,
    source: 'default',
  }
}
