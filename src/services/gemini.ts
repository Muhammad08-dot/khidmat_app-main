export interface ParsedIntent {
  category: string;
  urgency: 'low' | 'medium' | 'high';
  summary: string;
}

export const SPECIALTIES = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "AC Technician",
  "House Cleaner",
  "Appliance Repair",
  "Mechanic",
  "Gardener",
  "Movers & Packers",
  "Pest Control",
  "CCTV Technician",
  "Welder",
  "Mason",
  "Handyman",
  "Photographer",
  "Videographer",
  "Event Decorator",
  "DJ",
  "Caterer",
  "Waiter/Server"
];

/**
 * Fallback parser using basic keyword analysis.
 * Ensures the app works offline/without a configured key.
 */
const localFallbackParser = (text: string): ParsedIntent => {
  const lowercaseText = text.toLowerCase();
  
  // 1. Determine Category
  let category = "Handyman"; // default fallback category
  
  if (lowercaseText.match(/\b(wire|spark|electricity|meter|short|fan|switch|circuit|board|light)\b/)) {
    category = "Electrician";
  } else if (lowercaseText.match(/\b(leak|pipe|water|drain|plumb|basin|tap|commode|flush|sewer|toilet|sink)\b/)) {
    category = "Plumber";
  } else if (lowercaseText.match(/\b(wood|sofa|door|table|chair|bed|carpenter|cabinet|furniture|wardrobe)\b/)) {
    category = "Carpenter";
  } else if (lowercaseText.match(/\b(paint|wall|putty|distemper|brush|color|stain|weather|polish)\b/)) {
    category = "Painter";
  } else if (lowercaseText.match(/\b(ac|air conditioner|inverter|cooling|compressor|split|chiller|hvac)\b/)) {
    category = "AC Technician";
  } else if (lowercaseText.match(/\b(clean|sweep|dust|wash|broom|maid|mop|cleaner|vacuum|disinfect)\b/)) {
    category = "House Cleaner";
  } else if (lowercaseText.match(/\b(fridge|refrigerator|oven|microwave|washing|appliance|dryer|stove|freezer)\b/)) {
    category = "Appliance Repair";
  } else if (lowercaseText.match(/\b(car|bike|motorcycle|engine|brakes|mechanic|suspension|tire|puncture)\b/)) {
    category = "Mechanic";
  } else if (lowercaseText.match(/\b(garden|lawn|plant|flower|grass|tree|soil|pruning|seeds|nursery)\b/)) {
    category = "Gardener";
  } else if (lowercaseText.match(/\b(shift|pack|move|truck|carton|cargo|delivery|luggage|shifter)\b/)) {
    category = "Movers & Packers";
  } else if (lowercaseText.match(/\b(pest|termite|cockroach|insect|spray|bedbug|mosquito|fumigation|bugs)\b/)) {
    category = "Pest Control";
  } else if (lowercaseText.match(/\b(cctv|camera|dvr|ip camera|security camera|surveillance|nvr)\b/)) {
    category = "CCTV Technician";
  } else if (lowercaseText.match(/\b(weld|iron|gate|grill|railing|metal|fabricat|soldering)\b/)) {
    category = "Welder";
  } else if (lowercaseText.match(/\b(brick|mason|cement|plaster|concrete|marble|tile|slab|wall building)\b/)) {
    category = "Mason";
  } else if (lowercaseText.match(/\b(mount|hang|lock|drill|mirror|shelf|curtain|fixture|repair|installation)\b/)) {
    category = "Handyman";
  } else if (lowercaseText.match(/\b(photo|photography|shoot|portrait|lens|studio|camera shoot)\b/)) {
    category = "Photographer";
  } else if (lowercaseText.match(/\b(video|videography|drone|cinema|shoot|movie|reel|recording)\b/)) {
    category = "Videographer";
  } else if (lowercaseText.match(/\b(decor|decoration|stage|flower arrangements|balloon|theme|birthday|event|party)\b/)) {
    category = "Event Decorator";
  } else if (lowercaseText.match(/\b(dj|sound|music|speaker|audio|song|amplifier|mic|playlist)\b/)) {
    category = "DJ";
  } else if (lowercaseText.match(/\b(cater|catering|food|biryani|lunch|dinner|cooking|dish|korma|menu)\b/)) {
    category = "Caterer";
  } else if (lowercaseText.match(/\b(waiter|serve|staff|table service|serving boy|hospitality)\b/)) {
    category = "Waiter/Server";
  }

  // 2. Determine Urgency
  let urgency: 'low' | 'medium' | 'high' = 'low';
  if (lowercaseText.match(/\b(urgent|emergency|immediate|now|quick|flood|fire|spark|burst|danger|hazard|asap)\b/)) {
    urgency = 'high';
  } else if (lowercaseText.match(/\b(soon|tomorrow|broken|not working|damaged|repair|fix|leak|malfunction)\b/)) {
    urgency = 'medium';
  }

  // 3. Formulate Summary
  let summary = `Requested ${category} service.`;
  if (text.length > 5) {
    const cleanText = text.replace(/[.\n]/g, ' ').trim();
    // Cap summary at first 60 characters
    summary = cleanText.length > 60 ? cleanText.substring(0, 57) + '...' : cleanText;
  }

  return { category, urgency, summary };
};

/**
 * Parses user input using Google Gemini AI, with a fallback to local parsing.
 */
export const parseServiceIntent = async (userInput: string): Promise<ParsedIntent> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isKeyInvalid = !apiKey || apiKey === 'your_gemini_api_key_here';

  if (isKeyInvalid) {
    console.warn("[Gemini] API Key missing/placeholder. Falling back to local keyword parsing.");
    // Simulate minor lag for natural loading state feel
    await new Promise(resolve => setTimeout(resolve, 1500));
    return localFallbackParser(userInput);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are the AI Intent Parser for "Khidmat", an on-demand home services marketplace in Pakistan.
Analyze the following user service request: "${userInput}".

You MUST select exactly one category from the following 21 valid service categories:
${SPECIALTIES.join(", ")}

Map the request to the category that fits best. If none fit perfectly, pick the closest general category (like Handyman).
Determine the urgency level: "low" (general maintenance, planning), "medium" (needs fixing soon but not critical), or "high" (emergencies like leaks, broken locks, sparks, active hazards).
Provide a one-line concise summary of what the user needs.

Output your response as JSON matching this schema:
{
  "category": "exact category name from the list",
  "urgency": "low" | "medium" | "high",
  "summary": "concise description"
}`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                category: { 
                  type: "STRING", 
                  enum: SPECIALTIES 
                },
                urgency: { 
                  type: "STRING", 
                  enum: ["low", "medium", "high"] 
                },
                summary: { 
                  type: "STRING" 
                }
              },
              required: ["category", "urgency", "summary"]
            }
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsedJson = JSON.parse(responseText.trim()) as ParsedIntent;
    
    // Safety check that the category returned is indeed one of the 21 valid categories
    if (!SPECIALTIES.includes(parsedJson.category)) {
      parsedJson.category = "Handyman"; // fallback default
    }

    return parsedJson;

  } catch (error) {
    console.error("[Gemini] API Call failed. Falling back to local keyword parsing. Error:", error);
    return localFallbackParser(userInput);
  }
};

import { getDistanceKm, type LocationCoords } from '../utils/location';

interface RankedProviderResult {
  userId: string;
  reason: string;
}

export const rankProvidersWithAI = async (
  category: string,
  userCoords: LocationCoords,
  providersList: any[]
): Promise<RankedProviderResult[]> => {
  // 1. Prepare local fallback ranking
  const localRanked = providersList
    .map(p => {
      const distance = getDistanceKm(userCoords.lat, userCoords.lng, p.location.lat, p.location.lng);
      
      // Ranking score calculation
      let score = (p.rating * 15) - (distance * 2);
      if (p.tier === 'Platinum') score += 10;
      else if (p.tier === 'Gold') score += 6;
      else if (p.tier === 'Silver') score += 3;
      score += (p.totalJobs * 0.1);
      
      let reason = `${p.name} is highly recommended with a solid ${p.rating} rating and is located only ${distance} km away.`;
      if (p.tier === 'Platinum') {
        reason = `Top Choice: ${p.name} is a Platinum worker located ${distance} km away with an outstanding ${p.rating} rating and ${p.totalJobs} completed jobs.`;
      } else if (p.tier === 'Gold') {
        reason = `Expert match: ${p.name} holds a Gold tier status and offers reliable services just ${distance} km from your pinned location.`;
      } else if (distance < 1.5) {
        reason = `Nearby option: ${p.name} is a close neighbor, located only ${distance} km away, which guarantees very rapid travel times.`;
      }

      return {
        userId: p.userId,
        score,
        reason
      };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => ({ userId: item.userId, reason: item.reason }));

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isKeyInvalid = !apiKey || apiKey === 'your_gemini_api_key_here';

  if (isKeyInvalid || providersList.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 800)); // subtle loader feel
    return localRanked.slice(0, 5);
  }

  try {
    const simplifiedProviders = providersList.slice(0, 10).map(p => {
      const dist = getDistanceKm(userCoords.lat, userCoords.lng, p.location.lat, p.location.lng);
      return {
        userId: p.userId,
        name: p.name,
        rating: p.rating,
        totalJobs: p.totalJobs,
        tier: p.tier,
        basePrice: p.basePrice,
        bio: p.bio,
        distanceKm: dist
      };
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are the Provider Matcher AI for "Khidmat", an on-demand home services marketplace in Pakistan.
We have a customer looking for a "${category}" service.
Customer Location Coordinates: lat ${userCoords.lat}, lng ${userCoords.lng}.

Below is the list of available providers for this category:
${JSON.stringify(simplifiedProviders)}

Rank the top 3-5 providers from best to worst based on:
1. Proximity (distanceKm): Prioritize providers physically closer to the customer.
2. Competence: Prioritize higher ratings and tiers (Platinum, Gold, Silver, Bronze).
3. Experience: Total completed jobs.
4. Professionalism: Bio matching their needs.

For each ranked provider, write a custom, friendly, conversational one-sentence reason explaining why they were matched (in direct relation to the customer, e.g. "Matched as your top choice due to his high 4.9 rating and close 1.5 km proximity to you in Lahore"). Make sure it mentions their distance and rating.

Output your response as a JSON array of objects matching this schema:
[
  {
    "userId": "provider_userId_here",
    "reason": "direct friendly explanation sentence"
  }
]`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  userId: { type: "STRING" },
                  reason: { type: "STRING" }
                },
                required: ["userId", "reason"]
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsedJson = JSON.parse(responseText.trim()) as RankedProviderResult[];
    return parsedJson;

  } catch (error) {
    console.error("[Gemini] Provider ranking call failed. Falling back to local ranking. Error:", error);
    return localRanked.slice(0, 5);
  }
};

export interface PriceEstimateResult {
  minPrice: number;
  maxPrice: number;
  explanation: string;
}

export const estimateJobPriceWithAI = async (
  category: string,
  jobSummary: string,
  distanceKm: number
): Promise<PriceEstimateResult> => {
  // Determine standard base pricing by category
  let hourlyRate = 600;
  if (category === "AC Technician" || category === "Appliance Repair" || category === "Movers & Packers") {
    hourlyRate = 1200;
  } else if (category === "Gardener" || category === "House Cleaner" || category === "Waiter/Server") {
    hourlyRate = 450;
  } else if (category === "Photographer" || category === "Videographer" || category === "Event Decorator") {
    hourlyRate = 1800;
  }

  const travelAllowance = Math.round(100 + (distanceKm > 1 ? (distanceKm - 1) * 20 : 0));
  const estimatedMin = Math.round(hourlyRate + travelAllowance);
  const estimatedMax = Math.round(hourlyRate * 1.5 + travelAllowance + 150);

  const localPriceEstimate: PriceEstimateResult = {
    minPrice: Math.round(estimatedMin / 50) * 50,
    maxPrice: Math.round(estimatedMax / 50) * 50,
    explanation: `Calculated from typical PKR rates for ${category} tasks and includes a Rs. ${travelAllowance} travel allowance for a ${distanceKm} km trip.`
  };

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isKeyInvalid = !apiKey || apiKey === 'your_gemini_api_key_here';

  if (isKeyInvalid) {
    await new Promise(resolve => setTimeout(resolve, 600)); // natural delay
    return localPriceEstimate;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are the Pricing Specialist AI for "Khidmat", an on-demand home services marketplace in Pakistan.
Estimate a realistic price range in PKR (Pakistani Rupees) for this service call:
- Category: "${category}"
- Job Details: "${jobSummary}"
- Travel Distance: ${distanceKm} km

Consider typical Pakistani rates for local handymen:
- Base rates range from Rs. 400 to Rs. 2,000 per hour depending on complexity.
- Travel allowance (base Rs. 100 + Rs. 20/km) MUST be factored in for the ${distanceKm} km distance.
- Emergencies/high urgency might warrant a slight premium.

Provide:
1. A fair minimum estimated price in PKR (rounded to nearest 50).
2. A fair maximum estimated price in PKR (rounded to nearest 50).
3. A concise one-sentence explanation of how this price was estimated.

Output your response as JSON matching this schema:
{
  "minPrice": number,
  "maxPrice": number,
  "explanation": "concise explanation sentence"
}`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                minPrice: { type: "INTEGER" },
                maxPrice: { type: "INTEGER" },
                explanation: { type: "STRING" }
              },
              required: ["minPrice", "maxPrice", "explanation"]
            }
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsedJson = JSON.parse(responseText.trim()) as PriceEstimateResult;
    return parsedJson;

  } catch (error) {
    console.error("[Gemini] Job price estimation call failed. Falling back to local pricing. Error:", error);
    return localPriceEstimate;
  }
};

/**
 * Local fallback knowledge base for the site agent chatbot.
 * Provides useful answers even without an API connection.
 */
const localSiteAgentFallback = (question: string): string => {
  const q = question.toLowerCase();

  if (q.match(/\b(book|hire|find|search|get)\b/) && q.match(/\b(provider|worker|service|someone)\b/)) {
    return "To book a provider on Khidmat:\n1. Use the search bar on the home page — you can type or speak your problem.\n2. Our AI will match you with the right service category.\n3. Browse available providers, compare ratings and prices.\n4. Tap 'Book Now' to confirm your booking.\n5. Chat directly with the provider to coordinate details.";
  }
  if (q.match(/\b(pay|payment|cost|price|fee|charge|money)\b/)) {
    return "Khidmat currently supports Cash on Delivery (COD) payments. You pay the provider directly after the service is completed. Prices include an AI-estimated job cost plus a travel fee (Rs. 100 base + Rs. 20/km).";
  }
  if (q.match(/\b(categor|service|type|what.*offer)\b/)) {
    return "Khidmat offers 21 service categories: Electrician, Plumber, Carpenter, Painter, AC Technician, House Cleaner, Appliance Repair, Mechanic, Gardener, Movers & Packers, Pest Control, CCTV Technician, Welder, Mason, Handyman, Photographer, Videographer, Event Decorator, DJ, Caterer, and Waiter/Server.";
  }
  if (q.match(/\b(rating|review|tier|star|feedback)\b/)) {
    return "After each completed job, clients can leave a rating and review. Providers earn tiers based on their performance: Bronze → Silver → Gold → Platinum. Higher-tier providers appear first in search results.";
  }
  if (q.match(/\b(register|sign up|join|become.*worker|become.*provider)\b/)) {
    return "To become a worker on Khidmat:\n1. Create an account or log in.\n2. Go to your Profile page.\n3. Click 'Become a Worker' and fill in your skills, service category, bio, and hourly rate.\n4. You can switch between Worker and Client mode anytime from your profile!";
  }
  if (q.match(/\b(chat|message|inbox|contact|talk)\b/)) {
    return "Khidmat has real-time chat built in! After booking a provider, you can message them directly through the Inbox tab to discuss job details, timing, and any special requirements.";
  }
  if (q.match(/\b(safe|trust|verify|secure|scam)\b/)) {
    return "Khidmat prioritizes safety: providers are rated and reviewed by real customers, and the tier system (Bronze to Platinum) rewards consistently reliable workers. Always check provider ratings before booking.";
  }
  if (q.match(/\b(hello|hi|hey|salam|assalam|greet)\b/)) {
    return "Assalam-o-Alaikum! 👋 Welcome to Khidmat Support. I'm here to help you with anything related to our platform — booking services, finding providers, payments, and more. How can I assist you?";
  }
  if (q.match(/\b(thank|shukriya|thanks)\b/)) {
    return "You're welcome! 😊 If you have any more questions about Khidmat, feel free to ask anytime.";
  }

  return "I can help you with questions about Khidmat — our services, how to book a provider, payment methods, ratings, becoming a worker, and more. What would you like to know?";
};

export const askSiteAgent = async (question: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isKeyInvalid = !apiKey || apiKey === 'your_gemini_api_key_here';

  if (isKeyInvalid) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return localSiteAgentFallback(question);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are the Support Chatbot Agent for "Khidmat", an on-demand home services marketplace in Pakistan.
Your sole task is to provide information based strictly on the content of the Khidmat platform.

Khidmat Context:
- Khidmat is an on-demand platform matching customers with 21 categories of local workers in Pakistan (e.g. Electrician, Plumber, AC Technician, Videographer, DJ, Caterer, etc.).
- Payments are currently Cash on Delivery (COD).
- Features include: AI-powered intent parsing (describe your problem to find the right worker), speech-to-text search, automatic travel fee calculations based on distance (Rs 100 base + Rs 20/km), AI price estimation, and real-time chat between customer and provider.
- Providers can toggle themselves ONLINE or OFFLINE. Customers can review providers, affecting their tier (Bronze, Silver, Gold, Platinum).

Strict Platform & Supervision Rules:
1. ONLY answer questions directly related to Khidmat's features, services, policies, and usage.
2. If the user's question is off-topic (e.g., general knowledge, math, coding, translation, writing poems, creative writing, or non-Khidmat advice), you MUST politely decline and inform them that you are restricted to providing information only about Khidmat.
3. Do NOT mention or offer features/services that Khidmat does not support (e.g., credit card payment, bank transfer, online payment, tutoring, healthcare).
4. Be concise, friendly, and helpful.
5. Communicate in the exact same language or script (e.g., English, Roman Urdu, or Urdu) that the user used.

User Question: "${question}"`
            }]
          }]
        })
      }
    );

    if (response.status === 429) {
      console.warn("[Gemini] Rate limited (429) on askSiteAgent. Falling back to local knowledge base.");
      return localSiteAgentFallback(question);
    }

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    return responseText.trim();

  } catch (error) {
    console.error("[Gemini] Site Agent call failed. Error:", error);
    return localSiteAgentFallback(question);
  }
};
