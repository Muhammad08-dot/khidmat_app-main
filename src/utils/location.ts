export interface LocationCoords {
  lat: number;
  lng: number;
}

export const PAKISTAN_CITIES: Record<string, LocationCoords> = {
  "Karachi": { lat: 24.8607, lng: 67.0011 },
  "Lahore": { lat: 31.5204, lng: 74.3587 },
  "Islamabad": { lat: 33.6844, lng: 73.0479 },
  "Faisalabad": { lat: 31.4504, lng: 73.1350 },
  "Rawalpindi": { lat: 33.5651, lng: 73.0169 },
  "Peshawar": { lat: 34.0151, lng: 71.5249 },
  "Multan": { lat: 30.1575, lng: 71.5249 },
  "Quetta": { lat: 30.1798, lng: 66.9750 },
  "Sialkot": { lat: 32.4945, lng: 74.5229 },
  "Gujranwala": { lat: 32.1877, lng: 74.1945 }
};

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula. Returns distance in kilometers (km).
 */
export const getDistanceKm = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

/**
 * Estimates travel time in minutes based on distance in kilometers.
 * Assumes average city driving speed of approx 20-30 km/h (about 2-3 mins per km).
 */
export const estimateTravelTimeMinutes = (distanceKm: number): number => {
  if (distanceKm < 0.5) return 5; // minimum travel time
  const time = Math.round(distanceKm * 2.5 + 3); // 2.5 minutes per km plus a 3 min buffer
  return time;
};

/**
 * Calculates a travel allowance fee in PKR based on distance.
 * Base charge: Rs. 100, then Rs. 20 per km.
 */
export const calculateTravelFeePKR = (distanceKm: number): number => {
  if (distanceKm <= 1) return 100; // Flat base fee for very close jobs
  const fee = Math.round(100 + (distanceKm - 1) * 20);
  return Math.round(fee / 10) * 10; // Round to nearest 10 PKR
};
