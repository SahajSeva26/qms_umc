import type {
  Client,
  ClientInvoice,
  ClientMr,
  ClientProject,
  Division,
} from '@/types/client.types'

// TODO: entirely mock — no backend endpoints exist for client management yet.
// IDs and project numbers line up with camps.mock.ts / dashboard.mock.ts so the
// modules read as one dataset.

export const CLIENTS: Client[] = [
  { id: 'cli-sun', name: 'Sun Pharma', type: 'PHARMA', city: 'Mumbai', state: 'MH', logo: 'S', color: '#f59e0b', status: 'ACTIVE', contact: 'Rajesh Khanna', email: 'rajesh.khanna@sunpharma.com', phone: '+91 98200 11223' },
  { id: 'cli-cipla', name: 'Cipla', type: 'PHARMA', city: 'Mumbai', state: 'MH', logo: 'C', color: '#0ea5e9', status: 'ACTIVE', contact: 'Sneha Kulkarni', email: 'sneha.kulkarni@cipla.com', phone: '+91 98200 22334' },
  { id: 'cli-drr', name: "Dr Reddy's", type: 'PHARMA', city: 'Hyderabad', state: 'TS', logo: 'D', color: '#a855f7', status: 'ACTIVE', contact: 'Venkat Raman', email: 'venkat.raman@drreddys.com', phone: '+91 99490 33445' },
  { id: 'cli-lupin', name: 'Lupin', type: 'PHARMA', city: 'Mumbai', state: 'MH', logo: 'L', color: '#10b981', status: 'TRIAL', contact: 'Priya Nair', email: 'priya.nair@lupin.com', phone: '+91 98200 44556' },
  { id: 'cli-zydus', name: 'Zydus', type: 'PHARMA', city: 'Ahmedabad', state: 'GJ', logo: 'Z', color: '#f43f5e', status: 'INACTIVE', contact: 'Hardik Shah', email: 'hardik.shah@zyduslife.com', phone: '+91 98790 55667' },
  { id: 'cli-abbott', name: 'Abbott India', type: 'PHARMA', city: 'Mumbai', state: 'MH', logo: 'A', color: '#3b6dff', status: 'ACTIVE', contact: 'Kavita Rao', email: 'kavita.rao@abbott.com', phone: '+91 98200 66778' },
  { id: 'cli-fortis', name: 'Fortis Healthcare', type: 'HOSPITAL', city: 'Gurugram', state: 'HR', logo: 'F', color: '#14b8a6', status: 'PAUSED', contact: 'Amitabh Sinha', email: 'amitabh.sinha@fortishealthcare.com', phone: '+91 98110 77889' },
  { id: 'cli-glenmark', name: 'Glenmark', type: 'PHARMA', city: 'Mumbai', state: 'MH', logo: 'G', color: '#6366f1', status: 'ACTIVE', contact: 'Deepa Iyer', email: 'deepa.iyer@glenmark.com', phone: '+91 98200 88990' },
]

export const DIVISIONS: Division[] = [
  { id: 'div-sun-cardio', clientId: 'cli-sun', name: 'Cardio Care', therapy: 'Cardiology' },
  { id: 'div-sun-diabeto', clientId: 'cli-sun', name: 'DiabetoMax', therapy: 'Diabetes' },
  { id: 'div-cipla-resp', clientId: 'cli-cipla', name: 'Respiratory Care', therapy: 'Pulmonology' },
  { id: 'div-cipla-endo', clientId: 'cli-cipla', name: 'Endo Plus', therapy: 'Endocrinology' },
  { id: 'div-drr-onco', clientId: 'cli-drr', name: 'OncoCare', therapy: 'Oncology' },
  { id: 'div-drr-derma', clientId: 'cli-drr', name: 'DermaShield', therapy: 'Dermatology' },
  { id: 'div-zyd-cardio', clientId: 'cli-zydus', name: 'CardiaCare', therapy: 'Cardiology' },
  { id: 'div-abt-diab', clientId: 'cli-abbott', name: 'Diabetes Care', therapy: 'Diabetes' },
  { id: 'div-glen-derm', clientId: 'cli-glenmark', name: 'Dermatology', therapy: 'Dermatology' },
]

const noService = { screening: { cities: [] }, diet: { cities: [] }, lab: { cities: [] } }

export const MRS: ClientMr[] = [
  {
    id: 'mr-sun-cardio-1', clientId: 'cli-sun', divisionId: 'div-sun-cardio', name: 'Suresh Patil', empCode: 'SUN-0412',
    designation: 'Sr MR', hq: 'Mumbai', region: 'West', manager: 'Anil Joshi', phone: '+91 98220 10011', email: 'suresh.patil@sunpharma.com',
    serviceability: { screening: { cities: ['Mumbai', 'Thane', 'Pune'] }, diet: { cities: ['Mumbai', 'Thane'] }, lab: { cities: ['Mumbai'] } },
    campsBooked: 14, doctorsMapped: 46,
  },
  {
    id: 'mr-sun-cardio-2', clientId: 'cli-sun', divisionId: 'div-sun-cardio', name: 'Kiran Deshmukh', empCode: 'SUN-0587',
    designation: 'MR', hq: 'Pune', region: 'West', manager: 'Anil Joshi', phone: '+91 98220 10022', email: 'kiran.deshmukh@sunpharma.com',
    serviceability: { screening: { cities: ['Pune'] }, diet: { cities: ['Pune'] }, lab: { cities: [] } },
    campsBooked: 8, doctorsMapped: 22,
  },
  {
    id: 'mr-sun-diabeto-1', clientId: 'cli-sun', divisionId: 'div-sun-diabeto', name: 'Meena Kulkarni', empCode: 'SUN-0731',
    designation: 'MR', hq: 'Nashik', region: 'West', manager: 'Prakash Rane', phone: '+91 98220 10033', email: 'meena.kulkarni@sunpharma.com',
    serviceability: noService, // non-serviceable — no mapped cities yet
    campsBooked: 0, doctorsMapped: 12,
  },
  {
    id: 'mr-cipla-resp-1', clientId: 'cli-cipla', divisionId: 'div-cipla-resp', name: 'Arjun Reddy', empCode: 'CIP-1104',
    designation: 'Sr MR', hq: 'Chennai', region: 'South', manager: 'Suresh Menon', phone: '+91 97910 20011', email: 'arjun.reddy@cipla.com',
    serviceability: { screening: { cities: ['Chennai', 'Coimbatore'] }, diet: { cities: ['Chennai'] }, lab: { cities: ['Chennai'] } },
    campsBooked: 11, doctorsMapped: 34,
  },
  {
    id: 'mr-cipla-resp-2', clientId: 'cli-cipla', divisionId: 'div-cipla-resp', name: 'Farhan Shaikh', empCode: 'CIP-1382',
    designation: 'MR', hq: 'Madurai', region: 'South', manager: 'Suresh Menon', phone: '+91 97910 20022', email: 'farhan.shaikh@cipla.com',
    serviceability: noService, // non-serviceable — no mapped cities yet
    campsBooked: 2, doctorsMapped: 9,
  },
  {
    id: 'mr-cipla-endo-1', clientId: 'cli-cipla', divisionId: 'div-cipla-endo', name: 'Divya Hegde', empCode: 'CIP-1245',
    designation: 'Sr MR', hq: 'Bengaluru', region: 'South', manager: 'Ramesh Gowda', phone: '+91 98450 20033', email: 'divya.hegde@cipla.com',
    serviceability: { screening: { cities: ['Bengaluru', 'Mysuru'] }, diet: { cities: ['Bengaluru', 'Mysuru'] }, lab: { cities: ['Bengaluru'] } },
    campsBooked: 16, doctorsMapped: 51,
  },
  {
    id: 'mr-drr-onco-1', clientId: 'cli-drr', divisionId: 'div-drr-onco', name: 'Srinivas Rao', empCode: 'DRR-0218',
    designation: 'Sr MR', hq: 'Hyderabad', region: 'South', manager: 'Venkat Iyer', phone: '+91 99490 30011', email: 'srinivas.rao@drreddys.com',
    serviceability: { screening: { cities: ['Hyderabad', 'Vijayawada'] }, diet: { cities: [] }, lab: { cities: ['Hyderabad'] } },
    campsBooked: 9, doctorsMapped: 28,
  },
  {
    id: 'mr-drr-onco-2', clientId: 'cli-drr', divisionId: 'div-drr-onco', name: 'Kavya Nair', empCode: 'DRR-0356',
    designation: 'MR', hq: 'Visakhapatnam', region: 'South', manager: 'Venkat Iyer', phone: '+91 99490 30022', email: 'kavya.nair@drreddys.com',
    serviceability: { screening: { cities: ['Visakhapatnam'] }, diet: { cities: [] }, lab: { cities: [] } },
    campsBooked: 4, doctorsMapped: 15,
  },
  {
    id: 'mr-abt-diab-1', clientId: 'cli-abbott', divisionId: 'div-abt-diab', name: 'Rohit Malhotra', empCode: 'ABT-2041',
    designation: 'MR', hq: 'Mumbai', region: 'West', manager: 'Sanjay Kapoor', phone: '+91 98200 40011', email: 'rohit.malhotra@abbott.com',
    serviceability: { screening: { cities: ['Mumbai', 'Thane'] }, diet: { cities: ['Mumbai'] }, lab: { cities: ['Mumbai', 'Navi Mumbai'] } },
    campsBooked: 12, doctorsMapped: 39,
  },
  {
    id: 'mr-abt-diab-2', clientId: 'cli-abbott', divisionId: 'div-abt-diab', name: 'Neha Sharma', empCode: 'ABT-2288',
    designation: 'MR', hq: 'Indore', region: 'North', manager: 'Sanjay Kapoor', phone: '+91 98930 40022', email: 'neha.sharma@abbott.com',
    serviceability: noService, // non-serviceable — no mapped cities yet
    campsBooked: 1, doctorsMapped: 7,
  },
  {
    id: 'mr-glen-derm-1', clientId: 'cli-glenmark', divisionId: 'div-glen-derm', name: 'Vishal Jain', empCode: 'GLN-0904',
    designation: 'Sr MR', hq: 'Mumbai', region: 'West', manager: 'Deepak Mehta', phone: '+91 98200 50011', email: 'vishal.jain@glenmark.com',
    serviceability: { screening: { cities: ['Mumbai'] }, diet: { cities: ['Mumbai'] }, lab: { cities: ['Mumbai', 'Pune'] } },
    campsBooked: 10, doctorsMapped: 31,
  },
]

export const PROJECTS: ClientProject[] = [
  {
    id: 'PRJ-441', name: 'Sun Pharma · Cardio Care · Mumbai', clientId: 'cli-sun', divisionId: 'div-sun-cardio',
    type: 'Screening', poNo: 'PO/SUN/2026/0418', poValueInr: 8420000, poDate: '2026-01-12',
    campsTarget: 120, campsDone: 84, status: 'LIVE',
    pos: [
      { id: 'po-sun-0418', poNo: 'PO/SUN/2026/0418', confirmationType: 'PO', poDate: '2026-01-12', poExpiry: '2026-12-31', campCount: 120, value: 8420000, status: 'ACTIVE' },
    ],
  },
  {
    id: 'PRJ-438', name: 'Cipla · Endo Plus · South India', clientId: 'cli-cipla', divisionId: 'div-cipla-endo',
    type: 'Diet', poNo: 'PO/CIP/2026/0233', poValueInr: 3210000, poDate: '2026-02-03',
    campsTarget: 90, campsDone: 62, status: 'LIVE', pos: [],
  },
  {
    id: 'PRJ-440', name: "Dr Reddy's · OncoCare · National", clientId: 'cli-drr', divisionId: 'div-drr-onco',
    type: 'Screening', poNo: 'AGR/DRR/2026/0107', poValueInr: 4850000, poDate: '2026-01-20',
    campsTarget: 80, campsDone: 51, status: 'LIVE', pos: [],
  },
  {
    id: 'PRJ-437', name: 'Abbott · Diabetes Care · Tier-2', clientId: 'cli-abbott', divisionId: 'div-abt-diab',
    type: 'Screening', poNo: 'PO/ABT/2026/0342', poValueInr: 5840000, poDate: '2026-02-14',
    campsTarget: 75, campsDone: 48, status: 'LIVE', pos: [],
  },
  {
    id: 'PRJ-435', name: 'Glenmark · Dermatology · West', clientId: 'cli-glenmark', divisionId: 'div-glen-derm',
    type: 'Lab', poNo: 'PO/GLN/2026/0289', poValueInr: 2240000, poDate: '2026-03-02',
    campsTarget: 40, campsDone: 22, status: 'LIVE', pos: [],
  },
  {
    id: 'PRJ-432', name: 'Cipla · Respiratory Care · Pan India', clientId: 'cli-cipla', divisionId: 'div-cipla-resp',
    type: 'Diet', poNo: 'PO/CIP/2026/0198', poValueInr: 3000000, poDate: '2026-01-28',
    campsTarget: 36, campsDone: 14, status: 'LIVE', pos: [],
  },
  {
    id: 'PRJ-429', name: 'Lupin · Cardio Excellence · North', clientId: 'cli-lupin', divisionId: null,
    type: 'Screening', poNo: 'MAIL/LUP/2026/0075', poValueInr: 1840000, poDate: '2026-03-18',
    campsTarget: 30, campsDone: 14, status: 'PILOT', pos: [],
  },
  {
    id: 'PRJ-422', name: 'Fortis Healthcare · Gastro Pro', clientId: 'cli-fortis', divisionId: null,
    type: 'Lab', poNo: 'PO/FRT/2025/0512', poValueInr: 1840000, poDate: '2025-11-06',
    campsTarget: 20, campsDone: 0, status: 'PAUSED', pos: [],
  },
]

// NOTE: invoices join to clients by NAME (not id) — this mirrors the vanilla-JS
// prototype's billing data quirk. Keep the name join when computing billing /
// outstanding KPIs so the numbers match the design reference.
export const INVOICES: ClientInvoice[] = [
  { id: 'inv-9001', clientName: 'Sun Pharma', divisionId: 'div-sun-cardio', amount: 2450000, status: 'PAID', date: '2026-05-18', project: 'Sun Pharma · Cardio Care · Mumbai', due: '2026-06-17', age: 0 },
  { id: 'inv-9002', clientName: 'Sun Pharma', divisionId: 'div-sun-cardio', amount: 1840000, status: 'SENT', date: '2026-06-22', project: 'Sun Pharma · Cardio Care · Mumbai', due: '2026-07-22', age: 0 },
  { id: 'inv-9003', clientName: 'Sun Pharma', divisionId: 'div-sun-diabeto', amount: 720000, status: 'OVERDUE', date: '2026-05-05', project: 'Sun Pharma · DiabetoMax', due: '2026-06-04', age: 39 },
  { id: 'inv-9004', clientName: 'Cipla', divisionId: 'div-cipla-endo', amount: 1210000, status: 'PAID', date: '2026-05-28', project: 'Cipla · Endo Plus · South India', due: '2026-06-27', age: 0 },
  { id: 'inv-9005', clientName: 'Cipla', divisionId: 'div-cipla-resp', amount: 980000, status: 'OVERDUE', date: '2026-04-30', project: 'Cipla · Respiratory Care · Pan India', due: '2026-05-30', age: 44 },
  { id: 'inv-9006', clientName: "Dr Reddy's", divisionId: 'div-drr-onco', amount: 1620000, status: 'SENT', date: '2026-06-30', project: "Dr Reddy's · OncoCare · National", due: '2026-07-30', age: 0 },
  { id: 'inv-9007', clientName: 'Abbott India', divisionId: 'div-abt-diab', amount: 2140000, status: 'PAID', date: '2026-05-12', project: 'Abbott · Diabetes Care · Tier-2', due: '2026-06-11', age: 0 },
  { id: 'inv-9008', clientName: 'Abbott India', divisionId: 'div-abt-diab', amount: 1410000, status: 'SENT', date: '2026-06-25', project: 'Abbott · Diabetes Care · Tier-2', due: '2026-07-25', age: 0 },
  { id: 'inv-9009', clientName: 'Glenmark', divisionId: 'div-glen-derm', amount: 860000, status: 'OVERDUE', date: '2026-04-15', project: 'Glenmark · Dermatology · West', due: '2026-05-15', age: 59 },
]

// Same slot ids the Camps module uses ('qms.master.camps' records store the id).
export const SLOT_OPTIONS = [
  { id: '9-1', label: '9 AM – 1 PM' },
  { id: '10-2', label: '10 AM – 2 PM' },
  { id: '11-3', label: '11 AM – 3 PM' },
  { id: '6-10', label: '6 PM – 10 PM' },
]
