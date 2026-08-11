export const isValidLatitude = (lat: number): boolean => {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
}

export const isValidLongitude = (lng: number): boolean => {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180
}
