import React, { useState, useEffect } from 'react';
import type { User, Restaurant, MenuItem, CartItem, Order } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { OrderProgress } from '../components/OrderProgress';
import { DeliveryTrackingMap } from '../components/DeliveryTrackingMap';
import {
  Search,
  MapPin,
  Plus,
  Minus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

interface Props {
  currentUser: User;
  cart: CartItem[];
  onAddToCart: (item: MenuItem, restaurant: Restaurant) => void;
  onUpdateQuantity: (menuItemId: number, delta: number) => void;
  activeTab: 'browse' | 'orders';
  onPayOrder?: (order: Order) => void;
}

export const CustomerView: React.FC<Props> = ({
  currentUser,
  cart,
  onAddToCart,
  onUpdateQuantity,
  activeTab,
  onPayOrder,
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Orders Tab State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadMyOrders();
    }
  }, [activeTab, currentUser.id]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const data = await api.getRestaurants();
      setRestaurants(data);
    } catch (err) {
      console.error('Failed to load restaurants', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyOrders = async () => {
    try {
      setLoadingOrders(true);
      const data = await api.getOrders({ customer_id: currentUser.id });
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Collect all menu items across restaurants or for selected restaurant
  const allDishesWithRestaurant = restaurants.flatMap((r) =>
    (r.menu_items || []).map((item) => ({ ...item, restaurant: r }))
  );

  const filteredDishes = allDishesWithRestaurant.filter((item) => {
    if (selectedRestaurantId !== 'all' && item.restaurant_id !== selectedRestaurantId) {
      return false;
    }
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false;
    }
    if (vegOnly && !item.is_veg) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q) || false;
      const matchRest = item.restaurant.name.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchRest) return false;
    }
    return true;
  });

  const allDishesCategories = Array.from(
    new Set([
      'Pizza',
      'Pasta',
      'Ramen',
      'Burger',
      'Biryani',
      'South Indian',
      'Curry',
      'Sides',
      'Dessert',
      'Drinks',
      ...restaurants.flatMap((r) => (r.menu_items || []).map((m) => m.category || 'Main')),
    ])
  );
  const categories = ['All', ...allDishesCategories];

  const getItemQuantityInCart = (itemId: number) => {
    const found = cart.find((c) => c.menuItem.id === itemId);
    return found ? found.quantity : 0;
  };

  if (activeTab === 'orders') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>My Orders & Live Tracking</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              Track your food preparation and delivery in real-time.
            </p>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={loadMyOrders}
            disabled={loadingOrders}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loadingOrders ? 'animate-spin' : ''} />
            Refresh Status
          </button>
        </div>

        {orders.length === 0 ? (
          <div
            className="card"
            style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}
          >
            <ShoppingBag size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <h3>No orders placed yet</h3>
            <p style={{ marginTop: '8px', fontSize: '0.95rem' }}>
              Explore dishes from our top-rated restaurants and place your first order!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {orders.map((order) => (
              <div key={order.id} className="card" style={{ padding: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '1.25rem' }}>Order #{order.id}</h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        color: 'var(--muted)',
                        fontSize: '0.88rem',
                        marginTop: '6px',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                        {order.restaurant_name}
                      </span>
                      <span>• Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      ₹{order.total_amount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Progress Stepper */}
                <div style={{ margin: '16px 0' }}>
                  <OrderProgress status={order.status} />
                </div>

                {/* Pending Payment Action Banner */}
                {order.status === 'PENDING_PAYMENT' && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                      border: '1.5px solid #fdba74',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#9a3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={18} color="#ea580c" />
                        Razorpay Payment Required
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#c2410c', marginTop: '2px' }}>
                        Order #{order.id} is pending payment of <strong>₹{order.total_amount.toFixed(2)}</strong>. Enter card details to confirm.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '8px 16px', fontWeight: 700 }}
                        onClick={() => onPayOrder?.(order)}
                      >
                        <CreditCard size={14} /> Pay ₹{order.total_amount.toFixed(2)}
                      </button>
                      {order.payment_link_url && (
                        <a
                          href={order.payment_link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '8px 12px', fontSize: '0.82rem', background: '#fff' }}
                        >
                          <ExternalLink size={13} /> Razorpay Tab
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Partner Info if assigned */}
                {order.delivery_partner_name && (
                  <div
                    style={{
                      background: 'var(--info-light)',
                      border: '1px solid #bfdbfe',
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1e40af' }}>🛵 Delivery Rider:</span>
                    <span>{order.delivery_partner_name}</span>
                  </div>
                )}

                {/* Items summary */}
                <div
                  style={{
                    background: 'var(--bg-page)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Items Ordered
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {order.items.map((it) => (
                      <div
                        key={it.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.88rem',
                        }}
                      >
                        <span>
                          {it.quantity}x <strong>{it.item_name}</strong>
                        </span>
                        <span>₹{it.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: '10px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <MapPin size={13} />
                    <span>Delivery Address: {order.delivery_address}</span>
                  </div>
                </div>

                {/* Live Animated Road Route Tracking Map when accepted or out for delivery */}
                {['delivery_accepted', 'out_for_delivery'].includes(order.status) && (
                  <DeliveryTrackingMap
                    orderId={order.id}
                    restaurantName={order.restaurant_name || 'Restaurant Kitchen'}
                    restaurantAddress={order.restaurant_address}
                    restaurantLat={order.restaurant_lat}
                    restaurantLon={order.restaurant_lon}
                    deliveryAddress={order.delivery_address}
                    deliveryLat={order.delivery_lat}
                    deliveryLon={order.delivery_lon}
                    customerName={currentUser.name}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 32px',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 82, 27, 0.2)',
              color: '#ff8a00',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '14px',
            }}
          >
            <Sparkles size={14} /> Hungry? Fast Delivery from Top Local Kitchens
          </div>
          <h1 style={{ color: '#fff', fontSize: '2.5rem', marginBottom: '12px' }}>
            Craving something delicious today?
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Order handcrafted pizzas, steaming authentic ramen bowls, smash burgers, and sweet desserts right to your doorstep.
          </p>
        </div>
      </div>

      {/* Restaurant quick pills */}
      <div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Featured Restaurants</h3>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px' }}>
          <button
            className={`btn btn-sm ${selectedRestaurantId === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedRestaurantId('all')}
          >
            All Restaurants ({restaurants.length})
          </button>
          {restaurants.map((r) => (
            <button
              key={r.id}
              className={`btn btn-sm ${selectedRestaurantId === r.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedRestaurantId(r.id)}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span>{r.name}</span>
              <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>★ {r.rating}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          background: '#fff',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: '1 1 280px',
            maxWidth: '400px',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search pizza, burger, ramen, or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ width: '100%', paddingLeft: '38px' }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-secondary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Veg Filter */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={vegOnly}
            onChange={(e) => setVegOnly(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#16a34a' }}
          />
          <span style={{ color: '#16a34a' }}>🌱 Veg Only</span>
        </label>
      </div>

      {/* Dishes Grid */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h3>
            Menu Catalog{' '}
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 }}>
              ({filteredDishes.length} dishes found)
            </span>
          </h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>Loading delicious dishes...</div>
        ) : filteredDishes.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}
          >
            <h3>No dishes match your filter</h3>
            <p style={{ marginTop: '8px' }}>Try resetting your category or search term.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredDishes.map((dish) => {
              const qty = getItemQuantityInCart(dish.id);

              return (
                <div key={dish.id} className="dish-card">
                  <div className="dish-img-wrapper">
                    <img
                      src={
                        dish.image_url ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={dish.name}
                      className="dish-img"
                      loading="lazy"
                    />
                    <div
                      className={`dish-veg-badge ${dish.is_veg ? 'dish-veg' : 'dish-non-veg'}`}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: dish.is_veg ? '#16a34a' : '#dc2626',
                        }}
                      />
                      {dish.is_veg ? 'VEG' : 'NON-VEG'}
                    </div>
                  </div>

                  <div className="dish-body">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <span className="dish-category">{dish.category}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                        {dish.restaurant.name}
                      </span>
                    </div>

                    <h4 className="dish-name">{dish.name}</h4>
                    <p className="dish-desc">{dish.description}</p>

                    <div className="dish-footer">
                      <span className="dish-price">₹{dish.price.toFixed(2)}</span>

                      {!dish.is_available ? (
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--danger)',
                            fontWeight: 700,
                            padding: '6px 12px',
                            background: 'var(--danger-light)',
                            borderRadius: 'var(--radius-md)',
                          }}
                        >
                          Sold Out
                        </span>
                      ) : qty > 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--primary-light)',
                            borderRadius: 'var(--radius-md)',
                            padding: '4px 8px',
                          }}
                        >
                          <button
                            onClick={() => onUpdateQuantity(dish.id, -1)}
                            style={{
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px',
                            }}
                          >
                            <Minus size={14} />
                          </button>
                          <span
                            style={{
                              fontWeight: 800,
                              color: 'var(--primary)',
                              fontSize: '0.9rem',
                              minWidth: '18px',
                              textAlign: 'center',
                            }}
                          >
                            {qty}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(dish.id, 1)}
                            style={{
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px',
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onAddToCart(dish, dish.restaurant)}
                        >
                          <Plus size={14} /> Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
