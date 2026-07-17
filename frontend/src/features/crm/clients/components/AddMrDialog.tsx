import { useState } from 'react'
import type { ClientMr, MrDesignation } from '@/types/client.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { mrSchema } from '@/features/crm/clients/schemas'
import { parseCityList } from '@/features/crm/clients/clients.utils'

interface AddMrDialogProps {
  clientId: string
  divisionId: string
  onClose: () => void
  onSave: (mr: ClientMr) => void | Promise<void>
}

const REGIONS = ['West', 'South', 'North']

const FieldLabel = ({ children }: { children: string }) => (
  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
    {children}
  </Label>
)

const AddMrDialog = ({ clientId, divisionId, onClose, onSave }: AddMrDialogProps) => {
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState<MrDesignation>('MR')
  const [hq, setHq] = useState('')
  const [region, setRegion] = useState('West')
  const [manager, setManager] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [screeningCities, setScreeningCities] = useState('')
  const [dietCities, setDietCities] = useState('')
  const [labCities, setLabCities] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const result = mrSchema.safeParse({
      name, designation, hq, region, manager, phone, email, screeningCities, dietCities, labCities,
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Name and HQ are required.')
      return
    }
    const mr: ClientMr = {
      id: `mr-${Date.now()}`,
      clientId,
      divisionId,
      name: result.data.name,
      empCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      designation: result.data.designation,
      hq: result.data.hq,
      region: result.data.region,
      manager: result.data.manager,
      phone: result.data.phone,
      email: result.data.email,
      serviceability: {
        screening: { cities: parseCityList(result.data.screeningCities) },
        diet: { cities: parseCityList(result.data.dietCities) },
        lab: { cities: parseCityList(result.data.labCities) },
      },
      campsBooked: 0,
      doctorsMapped: 0,
    }
    await onSave(mr)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Add MR</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Name *</FieldLabel>
            <Input value={name} onChange={(e) => { setName(e.target.value); setError(null) }} placeholder="Full name" className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>Designation</FieldLabel>
            <Select value={designation} onValueChange={(v) => setDesignation(v as MrDesignation)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sr MR">Sr MR</SelectItem>
                <SelectItem value="MR">MR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>HQ *</FieldLabel>
            <Input value={hq} onChange={(e) => { setHq(e.target.value); setError(null) }} placeholder="e.g. Mumbai" className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>Region</FieldLabel>
            <Select value={region} onValueChange={(v) => setRegion(v as string)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Manager (ASM)</FieldLabel>
            <Input value={manager} onChange={(e) => setManager(e.target.value)} placeholder="Manager name" className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." className="text-[13px]" />
          </div>
          <div className="col-span-2">
            <FieldLabel>Email</FieldLabel>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="text-[13px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <FieldLabel>Screening cities (comma-separated)</FieldLabel>
            <Input value={screeningCities} onChange={(e) => setScreeningCities(e.target.value)} placeholder="Mumbai, Thane, Pune" className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>Diet cities (comma-separated)</FieldLabel>
            <Input value={dietCities} onChange={(e) => setDietCities(e.target.value)} placeholder="Mumbai, Thane" className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>Lab cities (comma-separated)</FieldLabel>
            <Input value={labCities} onChange={(e) => setLabCities(e.target.value)} placeholder="Mumbai" className="text-[13px]" />
          </div>
        </div>

        {error && <p className="text-[11px] text-danger">{error}</p>}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Add MR</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddMrDialog
