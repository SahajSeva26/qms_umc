const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance in km between two [lng, lat] (GeoJSON order) points. */
export function haversineDistanceKm(a: [number, number], b: [number, number]): number {
  const [lngA, latA] = a
  const [lngB, latB] = b
  const dLat = toRad(latB - latA)
  const dLng = toRad(lngB - lngA)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}
