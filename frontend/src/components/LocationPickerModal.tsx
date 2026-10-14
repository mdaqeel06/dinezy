import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  CHENNAI_DEFAULT_CENTER,
  CHENNAI_CUSTOMERS,
  reverseGeocode,
} from '../services/mapService';
import { MapPin, X, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (address: string, lat: number, lon: number) => void;
  initialAddress?: string;
  title?: string;
}

export const LocationPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialAddress = '',
  title = 'Pick Location on Map (Chennai)',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [selectedPos, setSelectedPos] = useState<[number, number]>(CHENNAI_DEFAULT_CENTER);
  const [resolvedAddress, setResolvedAddress] = useState<string>(
    initialAddress || 'T. Nagar, Chennai, Tamil Nadu'
  );
  const [loadingGeocode, setLoadingGeocode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Small timeout to ensure DOM container is rendered
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: selectedPos,
        zoom: 13,
      });

      // Standard OSM Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom marker icon
      const customPinIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            width: 38px;
            height: 38px;
            background: #ff521b;
            color: #fff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(255, 82, 27, 0.45);
            border: 3px solid #fff;
          ">
            <span style="transform: rotate(45deg); font-size: 16px; font-weight: bold;">📍</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
      });

      const marker = L.marker(selectedPos, {
        draggable: true,
        icon: customPinIcon,
      }).addTo(map);

      markerRef.current = marker;
      mapInstanceRef.current = map;

      // Handle map click
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setSelectedPos([lat, lng]);
        await updateAddress(lat, lng);
      });

      // Handle marker drag
      marker.on('dragend', async () => {
        const latLng = marker.getLatLng();
        setSelectedPos([latLng.lat, latLng.lng]);
        await updateAddress(latLng.lat, latLng.lng);
      });

      // Force layout calculation
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  const updateAddress = async (lat: number, lon: number) => {
    setLoadingGeocode(true);
    try {
      const addr = await reverseGeocode(lat, lon);
      setResolvedAddress(addr);
    } catch {
      setResolvedAddress(`Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}, Chennai`);
    } finally {
      setLoadingGeocode(false);
    }
  };

  const handleSelectPreset = async (loc: typeof CHENNAI_CUSTOMERS[0]) => {
    setSelectedPos([loc.lat, loc.lon]);
    setResolvedAddress(loc.address);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([loc.lat, loc.lon], 15);
      markerRef.current.setLatLng([loc.lat, loc.lon]);
    }
  };

  const handleConfirm = () => {
    onSelectLocation(resolvedAddress, selectedPos[0], selectedPos[1]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '750px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.2rem' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Selected Address Display Card */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg-page)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Selected Location:
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--secondary)' }}>
              {loadingGeocode ? 'Looking up address via Nominatim...' : resolvedAddress}
            </div>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--primary)',
              fontWeight: 700,
              background: 'var(--primary-light)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              whiteSpace: 'nowrap',
            }}
          >
            Click map to reposition
          </span>
        </div>

        {/* Quick Area Presets */}
        <div
          style={{
            padding: '8px 20px',
            background: '#fff',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            Popular Chennai Areas:
          </span>
          {CHENNAI_CUSTOMERS.slice(0, 6).map((loc) => (
            <button
              key={loc.name}
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleSelectPreset(loc)}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                whiteSpace: 'nowrap',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {loc.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Leaflet Map Box */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '380px',
            background: '#e2e8f0',
            position: 'relative',
          }}
        />

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Powered by <strong>OpenStreetMap</strong> & <strong>Nominatim</strong>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConfirm}
              disabled={loadingGeocode || !resolvedAddress}
            >
              <Check size={16} /> Confirm Address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
