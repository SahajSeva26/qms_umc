import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { EngagementBand } from '@/features/doctors/doctors.types'

const BANDS: (EngagementBand | 'ALL')[] = ['ALL', 'CHAMPION', 'ACTIVE', 'DORMANT', 'INACTIVE', 'NEW']

export interface DoctorFilters {
  specialty: string
  city: string
  band: EngagementBand | 'ALL'
  search: string
}

interface DoctorFilterBarProps {
  filters: DoctorFilters
  onChange: (patch: Partial<DoctorFilters>) => void
  specialties: string[]
  cities: string[]
}

const DoctorFilterBar = ({ filters, onChange, specialties, cities }: DoctorFilterBarProps) => (
  <div className="flex flex-wrap items-center gap-2 mb-3">
    <Select value={filters.specialty} onValueChange={(v) => onChange({ specialty: v as string })}>
      <SelectTrigger className="w-44 text-[12.5px]"><SelectValue placeholder="Specialty" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All specialties</SelectItem>
        {specialties.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
      </SelectContent>
    </Select>

    <Select value={filters.city} onValueChange={(v) => onChange({ city: v as string })}>
      <SelectTrigger className="w-40 text-[12.5px]"><SelectValue placeholder="City" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All cities</SelectItem>
        {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
      </SelectContent>
    </Select>

    <Select value={filters.band} onValueChange={(v) => onChange({ band: v as EngagementBand | 'ALL' })}>
      <SelectTrigger className="w-36 text-[12.5px]"><SelectValue placeholder="Band" /></SelectTrigger>
      <SelectContent>
        {BANDS.map((b) => <SelectItem key={b} value={b}>{b === 'ALL' ? 'All bands' : b}</SelectItem>)}
      </SelectContent>
    </Select>

    <Input
      value={filters.search}
      onChange={(e) => onChange({ search: e.target.value })}
      placeholder="Search name · code · email · phone · city"
      className="text-[12.5px] w-72"
    />
  </div>
)

export default DoctorFilterBar
