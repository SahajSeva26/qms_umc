// Static QMS letterhead/company details for the printed tax invoice — fixed, non-transactional
// info that doesn't exist anywhere in the backend (no seller-side GST/bank/address module).
// Sourced verbatim from the reference sample invoice per explicit user confirmation (2026-11-04).
export const QMS_LETTERHEAD = {
  companyName: 'QMS MEDICAL ALLIED SERVICES LIMITED',
  corporateAddress:
    '1A-1B/2A-2B, Navkala Bharti Building, Plot No.16, Prabhat Colony, Road No.3, OPP. Bus Depo. Santacruz (East), Mumbai-400 055.',
  corporatePhone: '022-62881111',
  corporateEmail: 'info@qmsmas.com',
  godownAddress:
    'Prithvi Complex, Building No.A/5, Ground Floor Gala No.3,4,5,6,7, Kalher Village, Thane Road, Dist: Thane, Bhiwandi-421302.',
  godownPhone: '022-62881150',
  gstNo: '27AAACQ4954G1ZB',
  panNo: 'AAACQ4954G',
  drugLicenseNos: ['20B/TZ5-278551-21B/TZ5-278552', '20B/TZ3-497921-21B/TZ3-497922'],
  bank: {
    name: 'CITI BANK - CC557876006',
    branch: 'MUMBAI',
    accountType: 'CURRENT ACCOUNT',
    beneficiaryName: 'QMS MEDICAL ALLIED SERVICES LIMITED',
    ifscCode: 'CITI0100000',
    accountNo: '557876006',
  },
} as const
