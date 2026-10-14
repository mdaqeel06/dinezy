import React, { useState } from 'react';
import type { CartItem } from '../types';
import { LocationPickerModal } from './LocationPickerModal';
import { X, Plus, Minus, ShoppingBag, MapPin, FileText, ArrowRight, Map } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  defaultAddress?: string;
  defaultLat?: number;
  defaultLon?: number;
  onUpdateQuantity: (menuItemId: number, delta: number) => void;
  onCheckout: (address: string, notes: string, lat?: number, lon?: number) => Promise<void>;
  loading: boolean;
}

export const CartDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  cart,
  defaultAddress,
  defaultLat,
  defaultLon,
  onUpdateQuantity,
  onCheckout,
  loading,
}) => {
  const [address, setAddress] = useState(defaultAddress || '4th Main Road, Besant Nagar, Chennai - 600090');
  const [deliveryLat, setDeliveryLat] = useState<number | undefined>(defaultLat);
  const [deliveryLon, setDeliveryLon] = useState<number | undefined>(defaultLon);
  const [notes, setNotes] = useState('');
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  React.useEffect(() => {
    if (defaultAddress) {
      setAddress(defaultAddress);
    }
    if (defaultLat != null) {
      setDeliveryLat(defaultLat);
    }
    if (defaultLon != null) {
      setDeliveryLon(defaultLon);
    }
  }, [defaultAddress, defaultLat, defaultLon]);

  if (!isOpen) return null;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );
  const deliveryFee = cart.length > 0 ? 40 : 0;
  const tax = cart.length > 0 ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
  const grandTotal = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

  const restaurantName = cart.length > 0 ? cart[0].restaurantName : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      alert('Please provide a delivery address');
      return;
    }
    onCheckout(address, notes, deliveryLat, deliveryLon);
  };

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.2rem' }}>Your Basket</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            <ShoppingBag size={54} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h4>Your cart is empty</h4>
            <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
              Browse delicious food from our restaurants and add items to your cart!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Restaurant indicator */}
            <div
              style={{
                padding: '10px 24px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderBottom: '1px solid #fed7aa',
              }}
            >
              Ordering from: {restaurantName}
            </div>

            {/* Item List */}
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.menuItem.id} className="cart-item">
                  <img
                    src={
                      item.menuItem.image_url ||
                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={item.menuItem.name}
                    style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.menuItem.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      ₹{item.menuItem.price.toFixed(2)} each
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.menuItem.id, -1)}
                      style={{
                        padding: '4px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#fff',
                        border: '1px solid var(--border)',
                        display: 'flex',
                      }}
                    >
                      <Minus size={13} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '16px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.menuItem.id, 1)}
                      style={{
                        padding: '4px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#fff',
                        border: '1px solid var(--border)',
                        display: 'flex',
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <div style={{ fontWeight: 800, fontSize: '0.95rem', minWidth: '55px', textAlign: 'right' }}>
                    ₹{(item.menuItem.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}

              {/* Delivery Details */}
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0 }}>
                      <MapPin size={14} color="var(--primary)" /> Delivery Address (Chennai) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(true)}
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'var(--primary-light)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #fed7aa',
                      }}
                    >
                      <Map size={12} /> Pick on Map
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="form-input"
                    placeholder="Enter street, area in Chennai..."
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} /> Notes for Kitchen / Driver
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Extra napkins, ring the doorbell..."
                  />
                </div>
              </div>
            </div>

            {/* Summary & Checkout Button */}
            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>₹{deliveryFee.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>GST Taxes (5%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total Amount</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px', padding: '14px' }}
                disabled={loading}
              >
                {loading ? (
                  'Initiating Razorpay...'
                ) : (
                  <>
                    <span>Proceed to Pay • ₹{grandTotal.toFixed(2)}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Interactive Location Picker Modal */}
      <LocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onSelectLocation={(pickedAddress, lat, lon) => {
          setAddress(pickedAddress);
          setDeliveryLat(lat);
          setDeliveryLon(lon);
        }}
        initialAddress={address}
        title="Pick Delivery Destination on Map (Chennai)"
      />
    </div>
  );
};
