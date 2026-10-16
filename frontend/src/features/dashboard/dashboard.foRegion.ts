// Indian state -> zonal council region (MHA's standard 5-zone classification) — a fixed
// geographic fact, not a business metric, used to bucket real camps by camp.location.state.
const STATE_TO_REGION: Record<string, string> = {
  // West
  Maharashtra: 'West', Gujarat: 'West', Goa: 'West',
  // South
  'Tamil Nadu': 'South', Karnataka: 'South', Kerala: 'South', 'Andhra Pradesh': 'South', Telangana: 'South',
  Puducherry: 'South',
  // North
  Delhi: 'North', 'Uttar Pradesh': 'North', Haryana: 'North', Punjab: 'North', Rajasthan: 'North',
  Uttarakhand: 'North', 'Himachal Pradesh': 'North', 'Jammu and Kashmir': 'North', Ladakh: 'North',
  Chandigarh: 'North',
  // East
  'West Bengal': 'East', Odisha: 'East', Bihar: 'East', Jharkhand: 'East',
  Assam: 'East', Sikkim: 'East', Tripura: 'East', Meghalaya: 'East', Manipur: 'East', Nagaland: 'East',
  Mizoram: 'East', 'Arunachal Pradesh': 'East',
  // Central
  'Madhya Pradesh': 'Central', Chhattisgarh: 'Central',
}

export function regionForState(state: string): string {
  return STATE_TO_REGION[state.trim()] ?? 'Other'
}
