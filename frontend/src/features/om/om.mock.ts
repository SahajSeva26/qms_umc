import type { FoEnrollment, DietitianEnrollment } from '@/features/om/om.types'

// TODO: entirely mock — seeds a couple of pipeline (non-real) enrollment
// candidates alongside the real FO/Dietitian roster (types/people.mock.ts),
// matching om-data.js's foRoster()/dietitianApproved() split between real
// staff and pending applicants.

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
}

export const SEED_FO_ENROLL: FoEnrollment[] = [
  { id: 'enr-fo-001', name: 'Karan Mehta', phone: '+91 9820012340', email: 'karan.mehta@gmail.com', hq: 'Pune', states: ['MH'], appliedOn: daysAgo(6), detailsComplete: true, status: 'PENDING', pan: 'ABCDE1234F', aadhar: '1234-5678-9012', address: 'Kothrud, Pune' },
  { id: 'enr-fo-002', name: 'Divya Shetty', phone: '+91 9845012345', email: 'divya.shetty@gmail.com', hq: 'Bengaluru', states: ['KA'], appliedOn: daysAgo(3), detailsComplete: false, status: 'PENDING' },
]

export const SEED_DIET_ENROLL: DietitianEnrollment[] = [
  {
    id: 'enr-dt-001', name: 'Aarti Joshi', phone: '+91 9820098765', email: 'aarti.joshi@gmail.com', hq: 'Mumbai', states: ['MH'],
    specialty: 'Diabetes Nutrition', ratePerCamp: 2500, appliedOn: daysAgo(10), detailsComplete: true,
    pan: 'XYZAB5678C', aadhar: '9876-5432-1098', address: 'Bandra, Mumbai',
    bankAccounts: [{ accountName: 'Aarti Joshi', accountNumber: '123456789012', ifsc: 'HDFC0001234', chequeUrl: '/cheques/aarti.jpg' }],
    resumeUrl: '/resumes/aarti-joshi.pdf', deviceAlignment: ['dev-bdy'],
    interview: { scheduledAt: daysAgo(2) }, status: 'SUBMITTED',
  },
  {
    id: 'enr-dt-002', name: 'Nikhil Rane', phone: '+91 9910087654', email: 'nikhil.rane@gmail.com', hq: 'Delhi', states: ['DL'],
    specialty: 'Sports Nutrition', ratePerCamp: 2300, appliedOn: daysAgo(15), detailsComplete: true,
    pan: '', aadhar: '', address: '',
    bankAccounts: [], resumeUrl: '', deviceAlignment: [],
    status: 'PENDING',
  },
]
