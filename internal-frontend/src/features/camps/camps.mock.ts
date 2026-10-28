import type { Doctor } from '@/types/camp.types'

// TODO: entirely mock — no backend endpoints exist for camps yet.
// Values copied from the vanilla-JS prototype's camps-data.js so they match
// the design reference exactly.

// Promoted to types/camp.types.ts — Diet Camps/Inventory read these through
// the shared types layer instead of reaching into this feature's internals.
export { SLOTS, CAMPS } from '@/types/camp.types'

export const DOCTORS: Doctor[] = [
  { id: 'doc-001', code: 'SUN-CP-2418', name: 'Dr Ramesh Sharma', specialty: 'Cardiologist', email: 'r.sharma@hotmail.com', phone: '+91 9820011111', city: 'Mumbai', state: 'MH', pincode: '400053', gmap: 'https://maps.google.com/?q=Andheri+W+Mumbai' },
  { id: 'doc-002', code: 'CIP-END-1187', name: 'Dr Anjali Rao', specialty: 'Endocrinologist', email: 'anjali.rao@gmail.com', phone: '+91 9845022222', city: 'Bengaluru', state: 'KA', pincode: '560034' },
  { id: 'doc-003', code: 'DRR-GP-3025', name: 'Dr Vikram Nair', specialty: 'GP', email: 'v.nair@yahoo.com', phone: '+91 9791033333', city: 'Chennai', state: 'TN', pincode: '600028' },
  { id: 'doc-004', code: 'ABT-CAR-0921', name: 'Dr Kavita Menon', specialty: 'Cardiologist', email: 'kavita.menon@gmail.com', phone: '+91 9820044444', city: 'Mumbai', state: 'MH', pincode: '400058' },
  { id: 'doc-005', code: 'GLN-DER-1502', name: 'Dr Rahul Kulkarni', specialty: 'Others', email: 'r.kulkarni@hotmail.com', phone: '+91 9820055555', city: 'Mumbai', state: 'MH', pincode: '400001' },
  { id: 'doc-006', code: 'SUN-ORT-0734', name: 'Dr Sameer Joshi', specialty: 'Orthopedic', email: 's.joshi@gmail.com', phone: '+91 9820066666', city: 'Pune', state: 'MH', pincode: '411001' },
  { id: 'doc-007', code: 'CIP-PUL-1855', name: 'Dr Priya Iyer', specialty: 'Pulmonologist', email: 'priya.iyer@yahoo.com', phone: '+91 9791077777', city: 'Chennai', state: 'TN', pincode: '600020' },
  { id: 'doc-008', code: 'DRR-NEU-2094', name: 'Dr Arvind Bose', specialty: 'Neurologist', email: 'a.bose@gmail.com', phone: '+91 9831088888', city: 'Kolkata', state: 'WB', pincode: '700019' },
  { id: 'doc-009', code: 'ABT-GYN-1467', name: 'Dr Sunita Verma', specialty: 'Gynecologist', email: 'sunita.verma@hotmail.com', phone: '+91 9910099999', city: 'Delhi', state: 'DL', pincode: '110016' },
  { id: 'doc-010', code: 'LUP-CP-0562', name: 'Dr Manish Gupta', specialty: 'Cardiologist', email: 'manish.gupta@gmail.com', phone: '+91 9910011122', city: 'Delhi', state: 'DL', pincode: '110024' },
]

