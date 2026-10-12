const fs = require('fs');
let code = fs.readFileSync('app/(booking)/track/[id].tsx', 'utf8');

// 1. Add supabase client import
if (!code.includes('import { supabase }')) {
  code = code.replace(
    'import { useAuth } from "@/src/context/AuthContext";',
    'import { useAuth } from "@/src/context/AuthContext";\nimport { supabase } from "@/src/services/supabase/client";'
  );
}

// 2. Add state for live locations to separate it from the DB booking object
if (!code.includes('const [liveWorkerLocation')) {
  code = code.replace(
    'const [isSimulating, setIsSimulating] = useState(false);',
    'const [isSimulating, setIsSimulating] = useState(false);\n  const [liveWorkerLocation, setLiveWorkerLocation] = useState(null);\n  const [liveClientLocation, setLiveClientLocation] = useState(null);'
  );
}

// 3. Replace the location sharing useEffect
const oldTrackingLogicStart = code.indexOf('// GPS location sharing');
const oldTrackingLogicEndBracket = code.indexOf('}, [booking, user]);', oldTrackingLogicStart);

if (oldTrackingLogicStart !== -1 && oldTrackingLogicEndBracket !== -1) {
  const newLogic = `// Realtime GPS location sharing via Supabase Broadcast (No DB writes)
  useEffect(() => {
    if (!booking || !user) return;
    const isActive = booking.status === "confirmed" || booking.status === "in_progress";
    if (!isActive) return;

    // 1. Setup Realtime Channel for this specific booking
    const channel = supabase.channel(\`tracking_\${booking.bookingId}\`)
      .on('broadcast', { event: 'location_update' }, (payload) => {
        if (payload.payload.workerLocation) {
          setLiveWorkerLocation(payload.payload.workerLocation);
        }
        if (payload.payload.clientLocation) {
          setLiveClientLocation(payload.payload.clientLocation);
        }
      })
      .subscribe();

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      const coords = await getCurrentCoords();
      if (!coords || cancelled) return;

      const currentLat = coords.lat;
      const currentLng = coords.lng;
      const timestamp = new Date().toISOString();
      let heading = 0;
      if (previousCoordsRef.current) {
        const p1 = previousCoordsRef.current;
        const dy = currentLat - p1.lat;
        const dx = currentLng - p1.lng;
        if (dx !== 0 || dy !== 0) heading = Math.atan2(dy, dx) * (180 / Math.PI);
      }
      previousCoordsRef.current = { lat: currentLat, lng: currentLng };

      const isWorker = user.id === booking.providerId;
      const locationData = isWorker
        ? { workerLocation: { lat: currentLat, lng: currentLng, heading, speed: 0, timestamp } }
        : { clientLocation: { lat: currentLat, lng: currentLng, timestamp } };

      // Broadcast instead of saving to DB
      channel.send({
        type: 'broadcast',
        event: 'location_update',
        payload: locationData
      });
    }, 6000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  `;
  
  code = code.substring(0, oldTrackingLogicStart) + newLogic + code.substring(oldTrackingLogicEndBracket);
}

// 4. Update the Map render to use live locations instead of booking.workerLocation
code = code.replace(/workerLocation=\{booking\.workerLocation\}/g, 'workerLocation={liveWorkerLocation || booking?.workerLocation}');
code = code.replace(/clientLocation=\{booking\.clientLocation\}/g, 'clientLocation={liveClientLocation || booking?.clientLocation}');

fs.writeFileSync('app/(booking)/track/[id].tsx', code);
console.log('Successfully refactored Location Tracking to use Supabase Realtime Broadcast');
