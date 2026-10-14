export interface GeoLocation {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

export interface RouteData {
  coordinates: [number, number][]; // [lat, lng] for Leaflet
  distanceKm: number;
  durationMins: number;
}

// Curated authentic Chennai food hubs & restaurants
export const CHENNAI_RESTAURANTS: GeoLocation[] = [
  {
    name: 'Annalakshmi Restaurant',
    address: 'Mayor Ramanathan Salai, Spur Tank Road, Egmore, Chennai - 600008',
    lat: 13.0732,
    lon: 80.2609,
  },
  {
    name: 'Murugan Idli Shop',
    address: '77/1, G.N. Chetty Road, T. Nagar, Chennai - 600017',
    lat: 13.0418,
    lon: 80.2341,
  },
  {
    name: 'Amethyst Cafe',
    address: 'Whites Road, Royapettah, Chennai - 600014',
    lat: 13.0569,
    lon: 80.2573,
  },
  {
    name: 'Toscano Italian Kitchen',
    address: 'Khader Nawaz Khan Road, Nungambakkam, Chennai - 600034',
    lat: 13.0602,
    lon: 80.2415,
  },
  {
    name: 'Sangeetha Veg Gourmet',
    address: '7 Gandhi Nagar, 2nd Main Road, Adyar, Chennai - 600020',
    lat: 13.0064,
    lon: 80.2575,
  },
  {
    name: 'Dindigul Thalappakatti',
    address: '2nd Avenue, Anna Nagar East, Chennai - 600102',
    lat: 13.085,
    lon: 80.2101,
  },
  {
    name: 'Barbeque Nation',
    address: '100 Feet Bypass Road, Velachery, Chennai - 600042',
    lat: 12.9815,
    lon: 80.218,
  },
];

// Curated residential delivery destinations across Chennai
export const CHENNAI_CUSTOMERS: GeoLocation[] = [
  {
    name: 'Besant Nagar Promenade',
    address: '4th Main Road, Elliot Beach, Besant Nagar, Chennai - 600090',
    lat: 13.0003,
    lon: 80.2667,
  },
  {
    name: 'Adyar River View Apartments',
    address: 'Canal Bank Road, Gandhi Nagar, Adyar, Chennai - 600020',
    lat: 13.0112,
    lon: 80.252,
  },
  {
    name: 'Panagal Park Residency',
    address: 'Usman Road, T. Nagar, Chennai - 600017',
    lat: 13.0405,
    lon: 80.2335,
  },
  {
    name: 'Anna Nagar Shanthi Colony',
    address: 'AH Block, 3rd Avenue, Shanthi Colony, Anna Nagar, Chennai - 600040',
    lat: 13.089,
    lon: 80.2155,
  },
  {
    name: 'Velachery Phoenix Park View',
    address: 'Velachery Bypass Road, Vijayanagar, Chennai - 600042',
    lat: 12.978,
    lon: 80.2212,
  },
  {
    name: 'Alwarpet TTK Enclave',
    address: 'TTK Road, Austin Nagar, Alwarpet, Chennai - 600018',
    lat: 13.0335,
    lon: 80.2536,
  },
  {
    name: 'Mylapore Temple Gate',
    address: 'Kutchery Road, Kapaleeshwarar Nagar, Mylapore, Chennai - 600004',
    lat: 13.0339,
    lon: 80.2687,
  },
  {
    name: 'Thiruvanmiyur Coastal Villa',
    address: 'Kamaraj Nagar, ECR Junction, Thiruvanmiyur, Chennai - 600041',
    lat: 12.983,
    lon: 80.259,
  },
];

export const CHENNAI_DEFAULT_CENTER: [number, number] = [13.0827, 80.2707];

/**
 * Pick a random Chennai restaurant and customer location for live routing
 */
export function getRandomChennaiPair(): { restaurant: GeoLocation; customer: GeoLocation } {
  const restIndex = Math.floor(Math.random() * CHENNAI_RESTAURANTS.length);
  let custIndex = Math.floor(Math.random() * CHENNAI_CUSTOMERS.length);
  // Ensure some geographic separation
  if (custIndex === restIndex) {
    custIndex = (custIndex + 1) % CHENNAI_CUSTOMERS.length;
  }
  return {
    restaurant: CHENNAI_RESTAURANTS[restIndex],
    customer: CHENNAI_CUSTOMERS[custIndex],
  };
}

/**
 * Reverse geocode latitude and longitude into human-readable address using Nominatim (with fallback)
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        // Format concise address
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.suburb || '';
        const neighborhood = addr.neighbourhood || addr.suburb || addr.city_district || '';
        const city = addr.city || addr.town || 'Chennai';
        const postcode = addr.postcode ? ` - ${addr.postcode}` : '';

        if (road || neighborhood) {
          const parts = [road, neighborhood, city + postcode].filter(Boolean);
          return parts.join(', ');
        }
        return data.display_name.split(',').slice(0, 4).join(', ');
      }
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode lookup failed, using local Chennai landmark matcher:', err);
  }

  // Fallback: match nearest landmark from known Chennai catalog
  let closest = CHENNAI_CUSTOMERS[0];
  let minDistance = Number.MAX_VALUE;

  for (const loc of [...CHENNAI_CUSTOMERS, ...CHENNAI_RESTAURANTS]) {
    const d = Math.hypot(loc.lat - lat, loc.lon - lon);
    if (d < minDistance) {
      minDistance = d;
      closest = loc;
    }
  }

  return `Near ${closest.name}, ${closest.address}`;
}

export const CHENNAI_NEIGHBORHOODS: Record<string, { lat: number; lon: number }> = {
  'anna nagar': { lat: 13.085, lon: 80.2101 },
  't. nagar': { lat: 13.0418, lon: 80.2341 },
  't nagar': { lat: 13.0418, lon: 80.2341 },
  'adyar': { lat: 13.0064, lon: 80.2575 },
  'velachery': { lat: 12.9815, lon: 80.218 },
  'besant nagar': { lat: 13.0003, lon: 80.2667 },
  'egmore': { lat: 13.0732, lon: 80.2609 },
  'nungambakkam': { lat: 13.0602, lon: 80.2415 },
  'alwarpet': { lat: 13.0335, lon: 80.2536 },
  'mylapore': { lat: 13.0339, lon: 80.2687 },
  'royapettah': { lat: 13.0569, lon: 80.2573 },
  'thiruvanmiyur': { lat: 12.983, lon: 80.259 },
  'guindy': { lat: 13.0067, lon: 80.203 },
  'porur': { lat: 13.0359, lon: 80.1588 },
  'vadapalani': { lat: 13.05, lon: 80.2121 },
  'kodambakkam': { lat: 13.0524, lon: 80.2255 },
  'kilpauk': { lat: 13.0784, lon: 80.2415 },
  'triplicane': { lat: 13.0587, lon: 80.2757 },
  'kotturpuram': { lat: 13.0224, lon: 80.2418 },
  'ra puram': { lat: 13.0285, lon: 80.2588 },
  'r.a. puram': { lat: 13.0285, lon: 80.2588 },
  'sholinganallur': { lat: 12.901, lon: 80.2279 },
  'omr': { lat: 12.9249, lon: 80.2312 },
  'perambur': { lat: 13.1075, lon: 80.2434 },
  'tambaram': { lat: 12.9249, lon: 80.1 },
  'chromepet': { lat: 12.9516, lon: 80.1462 },
  'ecr': { lat: 12.89, lon: 80.245 },
  'marina beach': { lat: 13.05, lon: 80.2824 },
};

/**
 * Geocode text query using coordinates detection, Nominatim, and neighborhood catalog
 */
export async function geocodeAddress(query: string): Promise<{ lat: number; lon: number } | null> {
  if (!query || !query.trim()) {
    return { lat: CHENNAI_DEFAULT_CENTER[0], lon: CHENNAI_DEFAULT_CENTER[1] };
  }

  // 1. Check if raw coordinates are directly embedded in query (e.g. "13.0827, 80.2707")
  const coordMatch = query.match(/(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/);
  if (coordMatch) {
    const parsedLat = parseFloat(coordMatch[1]);
    const parsedLon = parseFloat(coordMatch[2]);
    if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
      return { lat: parsedLat, lon: parsedLon };
    }
  }

  // 2. Query Nominatim OpenStreetMap
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const q = query.toLowerCase().includes('chennai') ? query : `${query}, Chennai, Tamil Nadu, India`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
      {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim forward search failed:', err);
  }

  // 3. Match against known Chennai neighborhoods dictionary
  const lower = query.toLowerCase();
  for (const [key, coords] of Object.entries(CHENNAI_NEIGHBORHOODS)) {
    if (lower.includes(key)) {
      return coords;
    }
  }

  // 4. Fallback matching against known catalog
  for (const loc of [...CHENNAI_RESTAURANTS, ...CHENNAI_CUSTOMERS]) {
    if (lower.includes(loc.name.toLowerCase()) || lower.includes(loc.address.toLowerCase())) {
      return { lat: loc.lat, lon: loc.lon };
    }
  }

  return { lat: CHENNAI_DEFAULT_CENTER[0], lon: CHENNAI_DEFAULT_CENTER[1] };
}

/**
 * Request real road routing between two coordinates using OSRM
 * Returns array of [lat, lon] tuples for Leaflet polyline, distance in km, and duration in mins
 */
export async function getOsrmRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<RouteData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // OSRM expects {longitude},{latitude}
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM geojson coordinates are [lon, lat], Leaflet needs [lat, lon]
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMins = Math.max(1, Math.round(route.duration / 60));

        return {
          coordinates,
          distanceKm,
          durationMins,
        };
      }
    }
  } catch (err) {
    console.warn('OSRM route fetch failed, generating realistic fallback street trajectory:', err);
  }

  // Fallback: Generate an interpolated 15-step realistic path with street curves
  const steps = 24;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Add realistic road curve deviation
    const curveDeviation = Math.sin(t * Math.PI) * 0.006;
    const lat = startLat + (endLat - startLat) * t + curveDeviation;
    const lon = startLon + (endLon - startLon) * t - curveDeviation * 0.5;
    coords.push([lat, lon]);
  }

  const directDist = Math.hypot(endLat - startLat, endLon - startLon) * 111; // rough km
  const roadDist = Math.round(directDist * 1.35 * 10) / 10;
  const duration = Math.max(5, Math.round(roadDist * 2.8));

  return {
    coordinates: coords,
    distanceKm: roadDist,
    durationMins: duration,
  };
}
