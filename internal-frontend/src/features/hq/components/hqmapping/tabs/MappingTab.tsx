import { useState } from 'react'
import type { GeoFo } from '@/features/hq/hq.types'
import type { Camp } from '@/types/camp.types'
import { CLIENTS, DIVISIONS, MRS } from '@/types/client.types'
import CompaniesView from '@/features/hq/components/hqmapping/mapping/CompaniesView'
import CompanyView from '@/features/hq/components/hqmapping/mapping/CompanyView'
import DivisionView from '@/features/hq/components/hqmapping/mapping/DivisionView'
import MappingGenerateView from '@/features/hq/components/hqmapping/mapping/MappingGenerateView'
import ExpansionView from '@/features/hq/components/hqmapping/mapping/ExpansionView'

interface MappingTabProps {
  fos: GeoFo[]
  camps: Camp[]
  radiusKm: number
}

type MappingView = 'companies' | 'company' | 'division' | 'mapping' | 'expansion'

// Exact port of hq-mapping.js's own view-router (STATE.view / render(), lines
// 204-232) — Company → Division → HQ Mapping drill-down plus the Expansion
// recommender, reusing the shared classifyCity()/buildExpansion() engine.
// Source data: CLIENTS/DIVISIONS/MRS straight from types/client.types.ts (the
// shared cross-feature master this task specifies), not CRM's own mutable
// clients.service.ts store — this tab is a read-only drill-down/planning
// view, it never edits client/division/MR records.
const MappingTab = ({ fos, camps, radiusKm }: MappingTabProps) => {
  const [view, setView] = useState<MappingView>('companies')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)

  const openCompanies = () => setView('companies')
  const openCompany = (id: string) => { setCompanyId(id); setView('company') }
  const openDivision = (id: string) => {
    const d = DIVISIONS.find((x) => x.id === id)
    setDivisionId(id)
    if (d) setCompanyId(d.clientId)
    setView('division')
  }
  const openMapping = (id: string) => { setDivisionId(id); setView('mapping') }
  const openExpansion = () => setView('expansion')

  if (view === 'expansion') {
    return <ExpansionView camps={camps} mrs={MRS} fos={fos} onOpenCompanies={openCompanies} />
  }

  if (view === 'mapping' && divisionId) {
    const division = DIVISIONS.find((d) => d.id === divisionId)
    if (!division) return <CompaniesView clients={CLIENTS} divisions={DIVISIONS} mrs={MRS} fos={fos} onOpenCompany={openCompany} onOpenExpansion={openExpansion} />
    const client = CLIENTS.find((c) => c.id === division.clientId)
    return (
      <MappingGenerateView
        division={division}
        client={client}
        mrs={MRS}
        fos={fos}
        onOpenCompanies={openCompanies}
        onOpenCompany={openCompany}
        onOpenDivision={openDivision}
      />
    )
  }

  if (view === 'division' && divisionId) {
    const division = DIVISIONS.find((d) => d.id === divisionId)
    if (!division) return <CompaniesView clients={CLIENTS} divisions={DIVISIONS} mrs={MRS} fos={fos} onOpenCompany={openCompany} onOpenExpansion={openExpansion} />
    const client = CLIENTS.find((c) => c.id === division.clientId)
    return (
      <DivisionView
        division={division}
        client={client}
        mrs={MRS}
        fos={fos}
        onOpenCompanies={openCompanies}
        onOpenCompany={openCompany}
        onOpenMapping={openMapping}
      />
    )
  }

  if (view === 'company' && companyId) {
    const client = CLIENTS.find((c) => c.id === companyId)
    if (!client) return <CompaniesView clients={CLIENTS} divisions={DIVISIONS} mrs={MRS} fos={fos} onOpenCompany={openCompany} onOpenExpansion={openExpansion} />
    return (
      <CompanyView
        client={client}
        divisions={DIVISIONS}
        mrs={MRS}
        fos={fos}
        radiusKm={radiusKm}
        onOpenCompanies={openCompanies}
        onOpenDivision={openDivision}
      />
    )
  }

  return <CompaniesView clients={CLIENTS} divisions={DIVISIONS} mrs={MRS} fos={fos} onOpenCompany={openCompany} onOpenExpansion={openExpansion} />
}

export default MappingTab
