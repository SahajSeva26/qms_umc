import { useMemo } from 'react'
import type { Camp } from '@/types/camp.types'
import type { ScopedDietitianRollup } from '@/features/diet/dietitians.types'
import { useCampsData } from '@/hooks/useCampsData'
import { useDietPayments } from '@/features/diet/hooks/useDietitianPayments'
import { dietitianRoster } from '@/features/diet/services/dietitianRoster.service'
import { dietitianExpenseFrom } from '@/features/diet/services/dietitianRates.service'
import {
  loadRollupIndex, campPaymentStatusFrom, paymentsByDietitianFrom,
  bankCompleteFrom, dietitianDetailsFrom,
} from '@/features/diet/services/dietitianPayment.service'
import { resolveCoordinatorId, isCoordCamp } from '@/features/diet/services/dietScope.service'
import { useDietPermissions } from '@/features/diet/hooks/useDietPermissions'

interface UseDietitianPaymentRollupArgs {
  role: string
  userName: string
}

// Derives role scoping, per-dietitian rollup rows, and KPI totals. Each
// backing store is parsed once via DietitianRollupIndex; don't replace the
// *From() helpers with per-item equivalents — that reintroduces the N+1.
export const useDietitianPaymentRollup = ({ role, userName }: UseDietitianPaymentRollupArgs) => {
  const { camps } = useCampsData()
  const { data: payments = [] } = useDietPayments()

  // Authorization goes through the feature seam, not a role list read inline.
  const { canManagePayments: adminLike } = useDietPermissions(role)
  const coordId = !adminLike ? resolveCoordinatorId(userName) : null
  const isCoordOnly = (role === 'diet_camp_coord' || role === 'camp_coord') && !adminLike

  const scopedDietCamps = useMemo((): Camp[] => {
    const dietCamps = camps.filter((c) => c.type === 'Diet' && !/CANCEL/i.test(c.status))
    if (adminLike) return dietCamps
    if (isCoordOnly) {
      if (!coordId) return dietCamps // fail-open
      return dietCamps.filter((c) => isCoordCamp(c, coordId))
    }
    return dietCamps
  }, [camps, adminLike, isCoordOnly, coordId])

  const scopeCampIds = useMemo(() => new Set(scopedDietCamps.map((c) => c.id)), [scopedDietCamps])

  const dietitiansInScope = useMemo(() => {
    const ids = Array.from(new Set(scopedDietCamps.map((c) => c.dietitianId).filter((id): id is string => !!id)))
    // One roster read for the whole list, avoiding a re-parse per dietitian.
    const rosterById = new Map(dietitianRoster().map((d) => [d.id, d]))
    return ids.map((id) => rosterById.get(id) ?? { id, name: id, real: false, phone: '', email: '', hq: '', states: [], ratePerCamp: 0, status: 'ENROLLED' as const, detailsComplete: false, appliedOn: '' })
  }, [scopedDietCamps])

  const rows = useMemo((): ScopedDietitianRollup[] => {
    const ix = loadRollupIndex()

    // Group in-scope camps by dietitian in one pass instead of filtering per dietitian.
    const campsByDietitian = new Map<string, Camp[]>()
    camps.forEach((c) => {
      if (c.type !== 'Diet' || !c.dietitianId) return
      if (!scopeCampIds.has(c.id)) return
      if (/CANCEL/i.test(c.status)) return
      const list = campsByDietitian.get(c.dietitianId)
      if (list) list.push(c)
      else campsByDietitian.set(c.dietitianId, [c])
    })

    const list: ScopedDietitianRollup[] = dietitiansInScope.map((d) => {
      const myCamps = campsByDietitian.get(d.id) ?? []
      let ready = 0, paid = 0, pendingReports = 0, eligibleAmount = 0, upcomingAmount = 0
      myCamps.forEach((c) => {
        const e = dietitianExpenseFrom(c, ix)
        const st = campPaymentStatusFrom(c, ix)
        if (st === 'READY') { eligibleAmount += e.total; ready++ }
        if (st === 'PAID') paid++
        if (st === 'PENDING') { upcomingAmount += e.total; pendingReports++ }
      })
      const paidAmount = paymentsByDietitianFrom(d.id, ix).reduce((s, p) => s + Number(p.amount || 0), 0)
      const det = dietitianDetailsFrom(d.id, ix)
      return {
        dietitianId: d.id,
        dietitianName: d.name,
        hq: d.hq,
        states: d.states,
        totalCamps: myCamps.length,
        readyCamps: ready,
        paidCamps: paid,
        pendingReports,
        eligibleAmount,
        upcomingAmount,
        paidAmount,
        toBePaid: Math.max(0, eligibleAmount),
        bankComplete: bankCompleteFrom(d.id, ix),
        printingCharge: det.printingChargePerCamp ?? 150,
      }
    })
    return list.sort((a, b) => b.toBePaid - a.toBePaid)
    // `payments` isn't referenced by name, but loadRollupIndex() reads the
    // same ledger store it's backed by — kept as a dep so cache refetches invalidate this memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dietitiansInScope, camps, scopeCampIds, payments])

  const kpi = useMemo(() => {
    const reportsPending = rows.reduce((s, r) => s + r.pendingReports, 0)
    const released = rows.reduce((s, r) => s + r.paidAmount, 0)
    const ready = rows.reduce((s, r) => s + r.toBePaid, 0)
    const upcoming = rows.reduce((s, r) => s + r.upcomingAmount, 0)
    const missingBank = rows.filter((r) => !r.bankComplete).length
    return { reportsPending, released, ready, upcoming, missingBank }
  }, [rows])

  return { camps, payments, adminLike, isCoordOnly, scopedDietCamps, rows, kpi }
}
