import { getDistanceKm } from '../location';

describe('location utils', () => {
  it('calculates distance correctly between two known points', () => {
    // Approx coordinates for Lahore to Islamabad
    const lat1 = 31.5204;
    const lon1 = 74.3587;
    const lat2 = 33.6844;
    const lon2 = 73.0479;
    
    const distance = getDistanceKm(lat1, lon1, lat2, lon2);
    // Should be around 270 km
    expect(distance).toBeGreaterThan(260);
    expect(distance).toBeLessThan(280);
  });
  
  it('returns 0 for the exact same point', () => {
    const lat = 31.5204;
    const lon = 74.3587;
    
    const distance = getDistanceKm(lat, lon, lat, lon);
    expect(distance).toBe(0);
  });
});
