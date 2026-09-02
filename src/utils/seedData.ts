import { isMockFirebase, writeDocument, getCollectionDocs } from '../services/firebase';
import { PAKISTAN_CITIES, type LocationCoords } from './location';

export interface Provider {
  userId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  location: LocationCoords;
  category: string;
  basePrice: number;
  rating: number;
  totalJobs: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  bio: string;
  available: boolean;
  photoURL?: string;
  totalEarnings?: number;
}

// Generate offset coordinates relative to city center for realism (spread around town)
const getOffsetLocation = (cityName: string, offsetMultiplier = 1): LocationCoords => {
  const center = PAKISTAN_CITIES[cityName] || { lat: 31.5204, lng: 74.3587 };
  // +/- 0.015 degrees is roughly within 1.5 - 2 km radius
  const latOffset = (Math.random() - 0.5) * 0.025 * offsetMultiplier;
  const lngOffset = (Math.random() - 0.5) * 0.025 * offsetMultiplier;
  return {
    lat: Math.round((center.lat + latOffset) * 10000) / 10000,
    lng: Math.round((center.lng + lngOffset) * 10000) / 10000
  };
};

const determineTier = (rating: number, totalJobs: number): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' => {
  if (rating >= 4.8 && totalJobs >= 20) return 'Platinum';
  if (rating >= 4.6) return 'Gold';
  if (rating >= 4.4) return 'Silver';
  return 'Bronze';
};

export const RAW_PROVIDERS = [
  {
    name: "Muhammad Bilal",
    category: "Electrician",
    city: "Lahore",
    basePrice: 800,
    rating: 4.85,
    totalJobs: 24,
    bio: "Certified home wiring and industrial electrician with 8+ years of experience. Expert in short circuits and solar panels.",
    phone: "+923001234501"
  },
  {
    name: "Tariq Mahmood",
    category: "Plumber",
    city: "Lahore",
    basePrice: 700,
    rating: 4.65,
    totalJobs: 18,
    bio: "Experienced plumber specializing in leak repairs, geyser installations, and complete bathroom sanitary fittings.",
    phone: "+923001234502"
  },
  {
    name: "Zubair Ahmad",
    category: "Carpenter",
    city: "Karachi",
    basePrice: 900,
    rating: 4.9,
    totalJobs: 32,
    bio: "Expert carpenter with specialized experience in modular kitchens, custom wardrobes, wood polish, and sofa repairs.",
    phone: "+923001234503"
  },
  {
    name: "Ahmad Ali",
    category: "Painter",
    city: "Faisalabad",
    basePrice: 600,
    rating: 4.35,
    totalJobs: 8,
    bio: "Interior and exterior wall painter. Proficient in wall putty, texture paints, weather sheets, and wallpaper application.",
    phone: "+923001234504"
  },
  {
    name: "Sajid Khan",
    category: "AC Technician",
    city: "Islamabad",
    basePrice: 1200,
    rating: 4.8,
    totalJobs: 21,
    bio: "DAE qualified HVAC technician. Specialist in inverter AC installation, gas charging, leak diagnostics, and deep servicing.",
    phone: "+923001234505"
  },
  {
    name: "Yasmeen Bibi",
    category: "House Cleaner",
    city: "Lahore",
    basePrice: 500,
    rating: 4.75,
    totalJobs: 15,
    bio: "Professional home and office cleaner. Expert in deep disinfection, carpet cleaning, window cleaning, and organization.",
    phone: "+923001234506"
  },
  {
    name: "Naveed Iqbal",
    category: "Appliance Repair",
    city: "Rawalpindi",
    basePrice: 1000,
    rating: 4.5,
    totalJobs: 14,
    bio: "Master technician for automatic washing machines, microwave ovens, double-door refrigerators, and food processors.",
    phone: "+923001234507"
  },
  {
    name: "Muhammad Ahmed",
    category: "Mechanic",
    city: "Karachi",
    basePrice: 1500,
    rating: 4.8,
    totalJobs: 28,
    bio: "EFI car auto-mechanic. Specialist in engine rebuilds, computer diagnostics, hybrid batteries, suspension tuning, and brakes.",
    phone: "+923001234508"
  },
  {
    name: "Ghulam Rasool",
    category: "Gardener",
    city: "Islamabad",
    basePrice: 550,
    rating: 4.45,
    totalJobs: 9,
    bio: "Passionate landscaper and gardener. Expert in lawn mowing, hedge trimming, plant nursery setups, and pesticide application.",
    phone: "+923001234509"
  },
  {
    name: "Faisal Cargo & Packers",
    category: "Movers & Packers",
    city: "Faisalabad",
    basePrice: 2000,
    rating: 4.95,
    totalJobs: 41,
    bio: "Local cargo and home moving crew. We bring packaging sheets, cartons, bubble wrap, and loading trucks for hassle-free shifting.",
    phone: "+923001234510"
  },
  {
    name: "Zafar Pest Solutions",
    category: "Pest Control",
    city: "Multan",
    basePrice: 1200,
    rating: 4.25,
    totalJobs: 5,
    bio: "Certified pest elimination service. Specialized in termite control, bedbugs treatment, cockroaches gel, and fumigation.",
    phone: "+923001234511"
  },
  {
    name: "Asif Mahmood",
    category: "CCTV Technician",
    city: "Lahore",
    basePrice: 850,
    rating: 4.7,
    totalJobs: 17,
    bio: "Network and CCTV installation expert. Installs IP cameras, analog DVR/NVR, optical fiber splicing, and WiFi routers setups.",
    phone: "+923001234512"
  },
  {
    name: "Riaz Hussain",
    category: "Welder",
    city: "Gujranwala",
    basePrice: 750,
    rating: 4.55,
    totalJobs: 12,
    bio: "Expert arc and gas welder. Fabricator for iron gates, security grills, staircase railings, and custom metal sheets.",
    phone: "+923001234513"
  },
  {
    name: "Kamran Mason",
    category: "Mason",
    city: "Sialkot",
    basePrice: 950,
    rating: 4.6,
    totalJobs: 22,
    bio: "Experienced builder and bricklayer. Specialist in marble laying, wall plastering, foundation structures, and concrete work.",
    phone: "+923001234514"
  },
  {
    name: "Waqar Younas",
    category: "Handyman",
    city: "Peshawar",
    basePrice: 600,
    rating: 4.4,
    totalJobs: 11,
    bio: "Your neighborhood helper. Expert in wall TV mounts, door handles fitting, curtain hanging, locks replacement, and minor fixes.",
    phone: "+923001234515"
  },
  {
    name: "Shahnawaz Studio",
    category: "Photographer",
    city: "Islamabad",
    basePrice: 1800,
    rating: 4.88,
    totalJobs: 29,
    bio: "Professional portrait, event, and commercial photographer. Custom studio lighting and high-end mirrorless gear.",
    phone: "+923001234516"
  },
  {
    name: "Farhan Production",
    category: "Videographer",
    city: "Lahore",
    basePrice: 2000,
    rating: 4.78,
    totalJobs: 16,
    bio: "Wedding cinematography, drone footages, promotional videos, and corporate reels. Full high-quality gimbal stabilization.",
    phone: "+923001234517"
  },
  {
    name: "Elegant Decors",
    category: "Event Decorator",
    city: "Karachi",
    basePrice: 2500,
    rating: 4.9,
    totalJobs: 30,
    bio: "High-end birthday theme designs, wedding stage decorators, floral arrangements, and premium lighting displays.",
    phone: "+923001234518"
  },
  {
    name: "DJ Zeeshan",
    category: "DJ",
    city: "Lahore",
    basePrice: 1500,
    rating: 4.65,
    totalJobs: 25,
    bio: "Professional sound system rentals, party DJ, subwoofers, and moving head lights for mehndi nights, birthdays, and parties.",
    phone: "+923001234519"
  },
  {
    name: "Shahi Caterers",
    category: "Caterer",
    city: "Faisalabad",
    basePrice: 1800,
    rating: 4.8,
    totalJobs: 27,
    bio: "Specialists in gourmet Biryani, Korma, Seekh Kabab, and traditional Pakistani desserts for guest gatherings of 50 to 500.",
    phone: "+923001234520"
  },
  {
    name: "Zeeshan & Team",
    category: "Waiter/Server",
    city: "Quetta",
    basePrice: 500,
    rating: 4.5,
    totalJobs: 19,
    bio: "Polite and professionally dressed wait staff for catering events, private dinners, and large wedding halls.",
    phone: "+923001234521"
  },
  
  // Extra listings to give overlap in popular cities and check filtering
  {
    name: "Kamran Abbas",
    category: "Plumber",
    city: "Faisalabad",
    basePrice: 650,
    rating: 4.75,
    totalJobs: 21,
    bio: "Faisalabad expert plumber. Quick home calls, fixing taps, geysers, motor pumps, and sewer cleaning.",
    phone: "+923001234522"
  },
  {
    name: "Zahid Electrician",
    category: "Electrician",
    city: "Karachi",
    basePrice: 750,
    rating: 4.58,
    totalJobs: 13,
    bio: "Karachi local electrician. Safe repair of fans, wiring, distribution boxes, and UPS backups.",
    phone: "+923001234523"
  },
  {
    name: "Amjad AC Services",
    category: "AC Technician",
    city: "Lahore",
    basePrice: 1100,
    rating: 4.92,
    totalJobs: 35,
    bio: "Lahore premier AC service. Cleaning filters, compressor repairing, leakage fixes, gas top-ups.",
    phone: "+923001234524"
  },
  {
    name: "Aslam Movers",
    category: "Movers & Packers",
    city: "Karachi",
    basePrice: 2200,
    rating: 4.88,
    totalJobs: 33,
    bio: "Safe household shifting service in Karachi. Fast packaging, loading, transportation, and setup.",
    phone: "+923001234525"
  },
  {
    name: "Bano Cleaning Services",
    category: "House Cleaner",
    city: "Karachi",
    basePrice: 550,
    rating: 4.7,
    totalJobs: 19,
    bio: "Trustworthy domestic cleaning group. Standard sweeping, deep kitchen cleaning, bathroom disinfection.",
    phone: "+923001234526"
  },
  {
    name: "Shabbir Painters",
    category: "Painter",
    city: "Lahore",
    basePrice: 700,
    rating: 4.4,
    totalJobs: 10,
    bio: "Lahore color decorators. Neat ceiling design, enamel coats, wall textures, wood polishing.",
    phone: "+923001234527"
  }
];

export const seedDatabase = async () => {
  try {
    // 1. Check if providers are already seeded
    let existingProviders: any[] = [];
    if (isMockFirebase) {
      const items = JSON.parse(localStorage.getItem('mock_db_providers') || '{}');
      existingProviders = Object.values(items);
    } else {
      existingProviders = await getCollectionDocs('providers');
    }

    if (existingProviders.length > 0) {
      console.log("[Seeding] Providers already present. Skipping seeding.");
      return;
    }

    console.log("[Seeding] Database is empty. Starting to seed 27 providers across Pakistan...");

    // 2. Map and write each provider record
    for (let i = 0; i < RAW_PROVIDERS.length; i++) {
      const rp = RAW_PROVIDERS[i];
      const providerId = `mock_provider_uid_${100 + i}`;
      const email = `${rp.name.toLowerCase().replace(/\s+/g, '')}@khidmat.com`;
      const location = getOffsetLocation(rp.city);
      const tier = determineTier(rp.rating, rp.totalJobs);

      const providerData: Provider = {
        userId: providerId,
        name: rp.name,
        email,
        phone: rp.phone,
        city: rp.city,
        location,
        category: rp.category,
        basePrice: rp.basePrice,
        rating: rp.rating,
        totalJobs: rp.totalJobs,
        tier,
        bio: rp.bio,
        available: true
      };

      // Write provider record
      await writeDocument('providers', providerId, providerData);
      
      // Also seed a corresponding user profile in the users collection
      const userProfilePayload = {
        name: rp.name,
        email,
        phone: rp.phone,
        city: rp.city,
        role: 'provider' as const,
        location,
        category: rp.category,
        bio: rp.bio,
        basePrice: rp.basePrice,
        rating: rp.rating,
        totalJobs: rp.totalJobs,
        tier,
        available: true,
        createdAt: new Date().toISOString()
      };
      await writeDocument('users', providerId, userProfilePayload);
    }

    console.log(`[Seeding] Seeding successful. ${RAW_PROVIDERS.length} providers loaded into database.`);
  } catch (error) {
    console.error("[Seeding] Error seeding database:", error);
  }
};
