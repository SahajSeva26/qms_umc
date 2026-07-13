import type { Camp, CampStatusMeta, CampTypeMeta, SlotMeta, Doctor } from '@/types/camp.types'

// TODO: entirely mock — no backend endpoints exist for camps yet.
// Values copied from the vanilla-JS prototype's camps-data.js so they match
// the design reference exactly. Dates are relative to "today" via dPlus().

export const CAMP_TYPES: CampTypeMeta[] = [
  { id: 'Screening', name: 'Screening Camp', icon: 'Tent', color: '#3b6dff' },
  { id: 'Diet', name: 'Diet Camp', icon: 'Apple', color: '#10b981' },
  { id: 'Lab', name: 'Lab Camp', icon: 'FlaskConical', color: '#8b5cf6' },
]

// Real colors from the prototype's CAMP_STATUSES table — these differ from
// CLAUDE.md §8's documented mapping, which does not match the actual code.
export const CAMP_STATUSES: CampStatusMeta[] = [
  { id: 'REQUESTED', name: 'Requested', color: '#94a3b8' },
  { id: 'CONFIRMED', name: 'Confirmed', color: '#3b6dff' },
  { id: 'SCHEDULED', name: 'Scheduled', color: '#0ea5e9' },
  { id: 'LIVE', name: 'Live', color: '#10b981' },
  { id: 'CLOSED', name: 'Closed', color: '#14b8a6' },
  { id: 'CANCELLED', name: 'Cancelled', color: '#f59e0b' },
  { id: 'CANCELLED_CHARGED', name: 'Cancelled (charged)', color: '#f43f5e' },
]

export const SLOTS: SlotMeta[] = [
  { id: '9-1', label: '9 AM – 1 PM' },
  { id: '10-2', label: '10 AM – 2 PM' },
  { id: '11-3', label: '11 AM – 3 PM' },
  { id: '6-10', label: '6 PM – 10 PM' },
]

function dPlus(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

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

export const CAMPS: Camp[] = [
  { id: 'C-9421', date: dPlus(0), slot: '10-2', type: 'Screening', status: 'LIVE', clientId: 'cli-sun', projectId: 'PRJ-441', divisionId: 'div-sun-cardio', doctorId: 'doc-001', city: 'Mumbai', state: 'MH', foId: 'p-ravi', patientsExpected: 60, patientsDone: 28, devicesAllocated: ['dev-bp', 'dev-spo', 'dev-ecg'], rxCount: 0, feedback: 0, foRating: 0, consentUrl: '/consents/c9421.pdf', notes: 'Andheri W clinic · cardiology focus' },
  { id: 'C-9425', date: dPlus(2), slot: '9-1', type: 'Screening', status: 'REQUESTED', clientId: 'cli-cipla', projectId: 'PRJ-432', divisionId: 'div-cipla-resp', doctorId: 'doc-007', city: 'Chennai', state: 'TN', foId: '', patientsExpected: 45, patientsDone: 0, devicesAllocated: ['dev-spirom', 'dev-spo'], rxCount: 0, feedback: 0, foRating: 0, consentUrl: '', notes: 'Pulmo focus · awaits FO assignment' },
  { id: 'C-9418', date: dPlus(-1), slot: '10-2', type: 'Screening', status: 'CLOSED', clientId: 'cli-sun', projectId: 'PRJ-441', divisionId: 'div-sun-cardio', doctorId: 'doc-001', city: 'Mumbai', state: 'MH', foId: 'p-ravi', patientsExpected: 60, patientsDone: 64, devicesAllocated: ['dev-bp', 'dev-spo', 'dev-ecg'], rxCount: 42, feedback: 4.6, foRating: 4.7, consentUrl: '/consents/c9418.pdf', notes: 'Closed · 64 screened', photos: ['/photos/c9418-1.jpg', '/photos/c9418-2.jpg'], patientCount: 64, submissionCompleted: true, checkInAt: `${dPlus(-1)}T10:00:00`, checkOutAt: `${dPlus(-1)}T14:20:00`, rating: { overall: 4.7, onTime: 5, attire: 5, communication: 4 }, closeOut: { male: 27, female: 37, riskBands: { NORMAL: 38, MILD: 16, MODERATE: 8, SEVERE: 2 } } },
  { id: 'C-9415', date: dPlus(-3), slot: '10-2', type: 'Screening', status: 'CANCELLED_CHARGED', clientId: 'cli-glenmark', projectId: 'PRJ-435', divisionId: 'div-glen-derm', doctorId: 'doc-005', city: 'Mumbai', state: 'MH', foId: '', patientsExpected: 35, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, consentUrl: '', notes: 'Cancelled <24h · charged', cancelReason: 'Doctor unavailable at short notice', cancelledAt: dPlus(-3) },
  { id: 'C-9414', date: dPlus(-2), slot: '9-1', type: 'Screening', status: 'CANCELLED', clientId: 'cli-lupin', projectId: 'PRJ-429', divisionId: null, doctorId: 'doc-010', city: 'Delhi', state: 'DL', foId: '', patientsExpected: 30, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, consentUrl: '', notes: 'Rescheduled at client request', cancelReason: 'Client requested reschedule', cancelledAt: dPlus(-2) },
  { id: 'C-9430', date: dPlus(4), slot: '11-3', type: 'Diet', status: 'CONFIRMED', clientId: 'cli-cipla', projectId: 'PRJ-438', divisionId: 'div-cipla-endo', doctorId: 'doc-002', city: 'Bengaluru', state: 'KA', foId: 'p-anita', dietitianId: 'diet-01', patientsExpected: 40, patientsDone: 0, devicesAllocated: ['dev-glucometer'], rxCount: 0, feedback: 0, foRating: 0, consentUrl: '', notes: 'Diet camp · BCA pending' },
  { id: 'C-9431', date: dPlus(1), slot: '10-2', type: 'Diet', status: 'LIVE', clientId: 'cli-cipla', projectId: 'PRJ-438', divisionId: 'div-cipla-endo', doctorId: 'doc-002', city: 'Bengaluru', state: 'KA', foId: 'p-anita', dietitianId: 'diet-01', patientsExpected: 38, patientsDone: 12, devicesAllocated: ['dev-glucometer'], rxCount: 0, feedback: 0, foRating: 0, notes: 'Diet camp live' },
  { id: 'C-9433', date: dPlus(-4), slot: '10-2', type: 'Diet', status: 'CLOSED', clientId: 'cli-cipla', projectId: 'PRJ-438', divisionId: 'div-cipla-endo', doctorId: 'doc-002', city: 'Bengaluru', state: 'KA', foId: 'p-anita', dietitianId: 'diet-01', patientsExpected: 40, patientsDone: 41, devicesAllocated: ['dev-glucometer'], rxCount: 18, feedback: 4.4, foRating: 4.5, notes: 'Closed · 41 counselled', photos: ['/photos/c9433-1.jpg'], patientCount: 41, submissionCompleted: true, rating: { overall: 4.5 }, closeOut: { male: 19, female: 22, riskBands: { NORMAL: 24, MILD: 11, MODERATE: 5, SEVERE: 1 } } },
  { id: 'C-9440', date: dPlus(5), slot: '9-1', type: 'Lab', status: 'REQUESTED', clientId: 'cli-abbott', projectId: 'PRJ-437', divisionId: 'div-abt-diab', doctorId: 'doc-004', city: 'Mumbai', state: 'MH', foId: '', patientsExpected: 50, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, notes: 'Lab camp · lab-tech TBD' },
  { id: 'C-9441', date: dPlus(3), slot: '10-2', type: 'Lab', status: 'CONFIRMED', clientId: 'cli-abbott', projectId: 'PRJ-437', divisionId: 'div-abt-diab', doctorId: 'doc-004', city: 'Mumbai', state: 'MH', foId: 'p-amit', patientsExpected: 45, patientsDone: 0, devicesAllocated: ['dev-lipid'], rxCount: 0, feedback: 0, foRating: 0, notes: 'Lab camp confirmed' },
  { id: 'C-9445', date: dPlus(-1), slot: '11-3', type: 'Screening', status: 'CLOSED', clientId: "cli-drreddys", projectId: 'PRJ-440', divisionId: 'div-drr-onco', doctorId: 'doc-003', city: 'Chennai', state: 'TN', foId: 'p-amit', patientsExpected: 55, patientsDone: 51, devicesAllocated: ['dev-bp', 'dev-spo'], rxCount: 22, feedback: 4.2, foRating: 4.3, notes: 'Closed but data pending', photos: [], patientCount: 0, closeOut: { male: 24, female: 27, riskBands: { NORMAL: 30, MILD: 13, MODERATE: 6, SEVERE: 2 } } },
  { id: 'C-9450', date: dPlus(6), slot: '6-10', type: 'Screening', status: 'REQUESTED', clientId: 'cli-sun', projectId: 'PRJ-441', divisionId: 'div-sun-cardio', doctorId: 'doc-001', city: 'Mumbai', state: 'MH', foId: '', teleConsult: true, teleChannel: 'VIDEO', patientsExpected: 25, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, notes: 'Teleconsultation camp' },
  { id: 'C-9451', date: dPlus(7), slot: '9-1', type: 'Screening', status: 'CONFIRMED', clientId: 'cli-glenmark', projectId: 'PRJ-435', divisionId: 'div-glen-derm', doctorId: 'doc-005', city: 'Mumbai', state: 'MH', foId: 'p-pooja', patientsExpected: 30, patientsDone: 0, devicesAllocated: ['dev-derm'], rxCount: 0, feedback: 0, foRating: 0, notes: 'Upcoming derm camp' },
  { id: 'C-9408', date: dPlus(-5), slot: '10-2', type: 'Screening', status: 'CANCELLED', clientId: 'cli-fortis', projectId: 'PRJ-422', divisionId: null, doctorId: 'doc-006', city: 'Pune', state: 'MH', foId: '', patientsExpected: 20, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, notes: 'Fortis paused engagement', cancelReason: 'Account on hold', cancelledAt: dPlus(-5) },
]
