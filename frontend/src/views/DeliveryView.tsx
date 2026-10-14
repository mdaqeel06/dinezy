import React, { useState, useEffect } from 'react';
import type { User, Order, OrderStatus } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { DeliveryTrackingMap } from '../components/DeliveryTrackingMap';
import {
  Bike,
  Check,
  X,
  MapPin,
  PackageCheck,
  Navigation,
  RefreshCw,
} from 'lucide-react';

interface Props {
  currentUser: User;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  onUserUpdated: (user: User) => void;
}

export const DeliveryView: React.FC<Props> = ({ currentUser, showToast, onUserUpdated }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDeliveryOrders();
  }, [currentUser.id]);

  const loadDeliveryOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getPartnerOrders(currentUser.id);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      const updated = await api.toggleAvailability(currentUser.id);
      onUserUpdated(updated);
      showToast(
        `You are now ${updated.is_available ? 'ONLINE & ready for deliveries' : 'OFFLINE'}`,
        updated.is_available ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', 'warning');
    }
  };

  const handleOrderAction = async (orderId: number, status: OrderStatus) => {
    try {
      await api.deliveryAction(orderId, status);
      if (status === 'delivery_accepted') {
        showToast(`Accepted Order #${orderId}! Head to restaurant for pickup.`, 'success');
      } else if (status === 'delivery_rejected') {
        showToast(`Declined Order #${orderId}. Sent back to kitchen.`, 'info');
      } else if (status === 'out_for_delivery') {
        showToast(`Order #${orderId} picked up! Out for customer delivery.`, 'success');
      } else if (status === 'delivered') {
        showToast(`Delivered Order #${orderId}! ₹50.00 earned.`, 'success');
      }
      loadDeliveryOrders();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'warning');
    }
  };

  // Group orders
  const pendingRequests = orders.filter((o) => o.status === 'assigned');
  const activeDeliveries = orders.filter((o) =>
    ['delivery_accepted', 'out_for_delivery'].includes(o.status)
  );
  const completedDeliveries = orders.filter((o) => o.status === 'delivered');

  const totalEarnings = completedDeliveries.length * 50.0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Delivery Rider Header */}
      <div
        className="card"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Bike size={24} />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.4rem' }}>{currentUser.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                <span>Delivery Partner</span>
                <span>• {currentUser.phone || '+1 555-0333'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats & Online Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', padding: '0 16px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Completed
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>
              {completedDeliveries.length}
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '0 16px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Earnings
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>
              ₹{totalEarnings.toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-sm"
              onClick={handleToggleOnline}
              style={{
                background: currentUser.is_available ? '#16a34a' : 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: currentUser.is_available ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: currentUser.is_available ? '0 2px 8px rgba(34, 197, 94, 0.35)' : 'none',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: currentUser.is_available ? '#86efac' : '#94a3b8',
                  boxShadow: currentUser.is_available ? '0 0 8px #4ade80' : 'none',
                }}
              />
              <span>{currentUser.is_available ? 'Status: ONLINE' : 'Status: OFFLINE'}</span>
            </button>

            <button
              className="btn btn-sm"
              onClick={loadDeliveryOrders}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
              title="Refresh deliveries"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: INCOMING DELIVERY REQUESTS */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <h3>New Delivery Assignment Requests</h3>
          {pendingRequests.length > 0 && (
            <span
              style={{
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {pendingRequests.length} PENDING
            </span>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: '0.95rem',
            }}
          >
            No pending delivery requests right now. New dispatch jobs from restaurant managers will show up here.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {pendingRequests.map((order) => (
              <div
                key={order.id}
                className="card"
                style={{
                  padding: '20px',
                  border: '2px solid var(--primary)',
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>Order #{order.id}</div>
                  <span
                    style={{
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    Est. Pay: ₹50.00
                  </span>
                </div>

                <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem' }}>
                    <MapPin size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Pickup From:
                      </div>
                      <strong>{order.restaurant_name}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem' }}>
                    <Navigation size={16} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Deliver To:
                      </div>
                      <span>{order.delivery_address}</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleOrderAction(order.id, 'delivery_rejected')}
                  >
                    <X size={16} /> Decline
                  </button>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleOrderAction(order.id, 'delivery_accepted')}
                  >
                    <Check size={16} /> Accept Job
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: ACTIVE DELIVERIES IN PROGRESS */}
      <div>
        <h3 style={{ marginBottom: '14px' }}>Active Deliveries ({activeDeliveries.length})</h3>

        {activeDeliveries.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              color: 'var(--muted)',
            }}
          >
            No active trips in progress.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeDeliveries.map((order) => (
              <div
                key={order.id}
                className="card"
                style={{
                  padding: '24px',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '14px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ fontSize: '1.2rem' }}>Order #{order.id}</h4>
                      <StatusBadge status={order.status} />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>
                      Customer: <strong>{order.customer_name}</strong> • Total Value: ₹{order.total_amount.toFixed(2)}
                    </p>
                  </div>

                  {/* Trip Progression Button */}
                  <div>
                    {order.status === 'delivery_accepted' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleOrderAction(order.id, 'out_for_delivery')}
                      >
                        <Bike size={18} /> Pick Up & Start Delivery
                      </button>
                    )}

                    {order.status === 'out_for_delivery' && (
                      <button
                        className="btn btn-success"
                        onClick={() => handleOrderAction(order.id, 'delivered')}
                      >
                        <PackageCheck size={18} /> Confirm Handover & Complete
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivery route info */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px',
                    marginTop: '16px',
                  }}
                >
                  <div
                    style={{
                      background: '#fff',
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      Step 1: Restaurant Kitchen
                    </div>
                    <div style={{ fontWeight: 700, marginTop: '4px' }}>{order.restaurant_name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      Items: {order.items.map((i) => `${i.quantity}x ${i.item_name}`).join(', ')}
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#fff',
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      Step 2: Customer Address
                    </div>
                    <div style={{ fontWeight: 700, marginTop: '4px' }}>{order.delivery_address}</div>
                    {order.notes && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--primary)', marginTop: '2px' }}>
                        Customer Note: "{order.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Leaflet OSRM Route Map with Animated Rider */}
                <DeliveryTrackingMap
                  orderId={order.id}
                  restaurantName={order.restaurant_name || 'Restaurant Kitchen'}
                  restaurantAddress={order.restaurant_address}
                  restaurantLat={order.restaurant_lat}
                  restaurantLon={order.restaurant_lon}
                  deliveryAddress={order.delivery_address}
                  deliveryLat={order.delivery_lat}
                  deliveryLon={order.delivery_lon}
                  customerName={order.customer_name}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: COMPLETED DELIVERIES HISTORY */}
      <div>
        <h3 style={{ marginBottom: '14px' }}>Completed Deliveries ({completedDeliveries.length})</h3>

        {completedDeliveries.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
            Completed deliveries and delivery earnings will be recorded here.
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>ORDER</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>RESTAURANT</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>CUSTOMER</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>PAYOUT</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {completedDeliveries.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>#{d.id}</td>
                    <td style={{ padding: '12px 16px' }}>{d.restaurant_name}</td>
                    <td style={{ padding: '12px 16px' }}>{d.customer_name}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--success)' }}>
                      +₹50.00
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status="delivered" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
