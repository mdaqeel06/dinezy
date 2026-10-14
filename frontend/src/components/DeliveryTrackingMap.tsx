import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  getRandomChennaiPair,
  getOsrmRoute,
  geocodeAddress,
  CHENNAI_DEFAULT_CENTER,
  type GeoLocation,
  type RouteData,
} from '../services/mapService';
import {
  Bike,
  Play,
  Pause,
  RotateCcw,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  orderId: number;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantLat?: number | null;
  restaurantLon?: number | null;
  deliveryAddress?: string;
  deliveryLat?: number | null;
  deliveryLon?: number | null;
  customerName?: string;
}

export const DeliveryTrackingMap: React.FC<Props> = ({
  orderId,
  restaurantName,
  restaurantAddress,
  restaurantLat,
  restaurantLon,
  deliveryAddress,
  deliveryLat,
  deliveryLon,
  customerName = 'Customer',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [locations, setLocations] = useState<{ restaurant: GeoLocation; customer: GeoLocation } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  // Animation states
  const [progress, setProgress] = useState(0); // 0 to 1
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isFinished, setIsFinished] = useState(false);

  // References for mutable animation state
  const progressRef = useRef(0);
  const isPlayingRef = useRef(true);
  const speedRef = useRef(1);
  const routeCoordsRef = useRef<[number, number][]>([]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  // Step 1: Initialize exact or geocoded Chennai restaurant & customer locations
  useEffect(() => {
    let isCancelled = false;

    async function initLocationsAndRoute() {
      setLoadingRoute(true);

      // 1. Resolve Restaurant Location (Priority: exact lat/lon -> geocode address -> default)
      let restGeo: GeoLocation;
      if (restaurantLat != null && restaurantLon != null && !isNaN(restaurantLat) && !isNaN(restaurantLon)) {
        restGeo = {
          name: restaurantName,
          address: restaurantAddress || 'Restaurant Kitchen, Chennai',
          lat: restaurantLat,
          lon: restaurantLon,
        };
      } else if (restaurantAddress && restaurantAddress.trim().length > 3) {
        const geo = await geocodeAddress(restaurantAddress);
        restGeo = {
          name: restaurantName,
          address: restaurantAddress,
          lat: geo?.lat ?? CHENNAI_DEFAULT_CENTER[0],
          lon: geo?.lon ?? CHENNAI_DEFAULT_CENTER[1],
        };
      } else {
        const fallback = getRandomChennaiPair();
        restGeo = {
          name: restaurantName || fallback.restaurant.name,
          address: fallback.restaurant.address,
          lat: fallback.restaurant.lat,
          lon: fallback.restaurant.lon,
        };
      }

      // 2. Resolve Customer Location (Priority: exact lat/lon -> geocode address -> default)
      let custGeo: GeoLocation;
      if (deliveryLat != null && deliveryLon != null && !isNaN(deliveryLat) && !isNaN(deliveryLon)) {
        custGeo = {
          name: `${customerName}'s Address`,
          address: deliveryAddress || 'Customer Destination, Chennai',
          lat: deliveryLat,
          lon: deliveryLon,
        };
      } else if (deliveryAddress && deliveryAddress.trim().length > 3) {
        const geo = await geocodeAddress(deliveryAddress);
        custGeo = {
          name: `${customerName}'s Address`,
          address: deliveryAddress,
          lat: geo?.lat ?? (restGeo.lat + 0.02),
          lon: geo?.lon ?? (restGeo.lon + 0.02),
        };
      } else {
        const fallback = getRandomChennaiPair();
        custGeo = {
          name: `${customerName}'s Address`,
          address: fallback.customer.address,
          lat: fallback.customer.lat,
          lon: fallback.customer.lon,
        };
      }

      // Prevent identical start and destination coordinates
      if (Math.abs(restGeo.lat - custGeo.lat) < 0.0005 && Math.abs(restGeo.lon - custGeo.lon) < 0.0005) {
        custGeo.lat += 0.015;
        custGeo.lon += 0.012;
      }

      const pair = { restaurant: restGeo, customer: custGeo };
      if (isCancelled) return;
      setLocations(pair);

      // Fetch OSRM road route
      const route = await getOsrmRoute(
        pair.restaurant.lat,
        pair.restaurant.lon,
        pair.customer.lat,
        pair.customer.lon
      );

      if (isCancelled) return;
      setRouteData(route);
      routeCoordsRef.current = route.coordinates;
      setLoadingRoute(false);
    }

    initLocationsAndRoute();

    return () => {
      isCancelled = true;
    };
  }, [orderId, restaurantAddress, restaurantLat, restaurantLon, deliveryAddress, deliveryLat, deliveryLon]);

  // Step 2: Initialize Leaflet map and markers once route data is ready
  useEffect(() => {
    if (!mapContainerRef.current || !routeData || !locations) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const startPos = locations.restaurant;
    const endPos = locations.customer;

    // Create map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    });

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | OSRM Engine',
      maxZoom: 19,
    }).addTo(map);

    // Restaurant marker icon
    const restIcon = L.divIcon({
      className: 'custom-rest-icon',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #0f172a;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.4);
          border: 3px solid #ff521b;
          font-size: 18px;
        ">
          🍳
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    L.marker([startPos.lat, startPos.lon], { icon: restIcon })
      .addTo(map)
      .bindPopup(`<b>${startPos.name}</b><br/>${startPos.address}`);

    // Customer marker icon
    const custIcon = L.divIcon({
      className: 'custom-cust-icon',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #10b981;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          border: 3px solid #fff;
          font-size: 18px;
        ">
          🏠
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    L.marker([endPos.lat, endPos.lon], { icon: custIcon })
      .addTo(map)
      .bindPopup(`<b>${custIcon ? customerName : 'Destination'}</b><br/>${endPos.address}`);

    // Route polyline (glow underlay + sharp road line)
    L.polyline(routeData.coordinates, {
      color: '#ff521b',
      weight: 8,
      opacity: 0.35,
    }).addTo(map);

    L.polyline(routeData.coordinates, {
      color: '#ff521b',
      weight: 4,
      opacity: 0.95,
      dashArray: '8, 8',
    }).addTo(map);

    // Fit map bounds to show complete route
    const bounds = L.latLngBounds(routeData.coordinates);
    map.fitBounds(bounds, { padding: [40, 40] });

    // Animated Delivery Rider Marker
    const riderIcon = L.divIcon({
      className: 'custom-rider-icon',
      html: `
        <div style="position: relative;">
          <div style="
            position: absolute;
            top: -12px;
            left: -12px;
            width: 58px;
            height: 58px;
            border-radius: 50%;
            background: rgba(255, 82, 27, 0.25);
            animation: pulse-ring 1.8s infinite;
          "></div>
          <div style="
            position: relative;
            z-index: 2;
            width: 44px;
            height: 44px;
            background: #ff521b;
            color: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(255, 82, 27, 0.6);
            border: 3px solid #fff;
            font-size: 20px;
          ">
            🛵
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const initialCoord = routeData.coordinates[0];
    const riderMarker = L.marker(initialCoord, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
    riderMarker.bindTooltip('🛵 Delivery Partner (Live)', { permanent: true, direction: 'top', offset: [0, -20] });
    riderMarkerRef.current = riderMarker;

    mapInstanceRef.current = map;

    // Start animation loop
    progressRef.current = 0;
    setProgress(0);
    setIsFinished(false);

    let lastTimestamp = performance.now();
    const durationTotalMs = 30000; // 30 seconds base for complete trip simulation

    const animate = (timestamp: number) => {
      const deltaMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (isPlayingRef.current && routeCoordsRef.current.length > 1) {
        const step = (deltaMs / durationTotalMs) * speedRef.current;
        progressRef.current = Math.min(1, progressRef.current + step);
        setProgress(progressRef.current);

        // Calculate point along road coordinates
        const coords = routeCoordsRef.current;
        const totalPoints = coords.length;
        const exactIndex = progressRef.current * (totalPoints - 1);
        const lowIndex = Math.floor(exactIndex);
        const highIndex = Math.min(totalPoints - 1, lowIndex + 1);
        const segmentProgress = exactIndex - lowIndex;

        const p1 = coords[lowIndex];
        const p2 = coords[highIndex];

        const currentLat = p1[0] + (p2[0] - p1[0]) * segmentProgress;
        const currentLon = p1[1] + (p2[1] - p1[1]) * segmentProgress;

        if (riderMarkerRef.current) {
          riderMarkerRef.current.setLatLng([currentLat, currentLon]);
        }

        if (progressRef.current >= 1) {
          setIsFinished(true);
          setIsPlaying(false);
          return;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [routeData, locations]);

  const handleRestart = () => {
    progressRef.current = 0;
    setProgress(0);
    setIsFinished(false);
    setIsPlaying(true);
    if (riderMarkerRef.current && routeData && routeData.coordinates.length > 0) {
      riderMarkerRef.current.setLatLng(routeData.coordinates[0]);
    }
  };

  const remainingDistance = routeData
    ? Math.max(0, Math.round(routeData.distanceKm * (1 - progress) * 10) / 10)
    : 0;

  const remainingDuration = routeData
    ? Math.max(0, Math.round(routeData.durationMins * (1 - progress)))
    : 0;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        marginTop: '16px',
      }}
    >
      {/* Top Banner with Real-time Trip Header */}
      <div
        style={{
          padding: '14px 20px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bike size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              Live Delivery Route Map (Chennai Road Network)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              OSM Map Tiles • OSRM Driving Engine • Nominatim Geocoding
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isFinished ? (
            <span
              style={{
                background: 'var(--success)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={13} /> Arrived at Destination
            </span>
          ) : (
            <span
              style={{
                background: 'rgba(255, 82, 27, 0.25)',
                color: '#ff8a00',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ff521b',
                  animation: 'pulse-glow 1.5s infinite',
                }}
              />
              Rider In Transit
            </span>
          )}
        </div>
      </div>

      {/* Progress Line */}
      <div style={{ height: '4px', background: '#e2e8f0', width: '100%', position: 'relative' }}>
        <div
          style={{
            height: '100%',
            background: isFinished ? 'var(--success)' : 'var(--primary)',
            width: `${Math.round(progress * 100)}%`,
            transition: 'width 0.15s ease',
          }}
        />
      </div>

      {/* Live Map Box */}
      <div style={{ position: 'relative' }}>
        {loadingRoute && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 500,
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid #ff521b',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--secondary)' }}>
              Calculating Chennai road route via OSRM...
            </span>
          </div>
        )}

        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '380px',
            background: '#f1f5f9',
          }}
        />

        {/* Floating Telemetry Box */}
        {locations && routeData && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(6px)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              padding: '12px 16px',
              zIndex: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              border: '1px solid var(--border)',
            }}
          >
            {/* Route summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 260px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  FROM KITCHEN
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{locations.restaurant.name}</div>
              </div>

              <div style={{ color: 'var(--muted)' }}>➔</div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  TO CUSTOMER
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{locations.customer.name}</div>
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Distance Left
                </div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--secondary)' }}>
                  {remainingDistance} km
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Est. Arrival
                </div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                  {remainingDuration} mins
                </div>
              </div>

              {/* Simulation Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: '6px 8px' }}
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? 'Pause simulation' : 'Resume simulation'}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: '6px 8px' }}
                  onClick={handleRestart}
                  title="Replay delivery run"
                >
                  <RotateCcw size={14} />
                </button>

                {/* Speed Multiplier */}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 800 }}
                  onClick={() => {
                    const next = speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 5 : 1;
                    setSpeedMultiplier(next);
                  }}
                  title="Adjust travel animation speed"
                >
                  <Zap size={11} style={{ display: 'inline', marginRight: '2px' }} />
                  {speedMultiplier}x
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
