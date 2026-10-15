// Indian state -> zonal council region (MHA's 5-zone classification), a fixed geographic fact.
// Duplicated from Dashboard's own copy, not imported — features don't reach into each other's internals.
const STATE_TO_REGION: Record<string, string> = {
  Maharashtra: 'West', Gujarat: 'West', Goa: 'West',
  'Tamil Nadu': 'South', Karnataka: 'South', Kerala: 'South', 'Andhra Pradesh': 'South', Telangana: 'South',
  Puducherry: 'South',
  Delhi: 'North', 'Uttar Pradesh': 'North', Haryana: 'North', Punjab: 'North', Rajasthan: 'North',
  Uttarakhand: 'North', 'Himachal Pradesh': 'North', 'Jammu and Kashmir': 'North', Ladakh: 'North',
  Chandigarh: 'North',
  'West Bengal': 'East', Odisha: 'East', Bihar: 'East', Jharkhand: 'East',
  Assam: 'East', Sikkim: 'East', Tripura: 'East', Meghalaya: 'East', Manipur: 'East', Nagaland: 'East',
  Mizoram: 'East', 'Arunachal Pradesh': 'East',
  'Madhya Pradesh': 'Central', Chhattisgarh: 'Central',
}

export function regionForState(state: string): string {
  return STATE_TO_REGION[state.trim()] ?? 'Other'
}
