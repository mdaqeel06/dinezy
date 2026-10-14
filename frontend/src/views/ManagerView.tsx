import React, { useState, useEffect } from 'react';
import type { User, Restaurant, MenuItem, Order } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { LocationPickerModal } from '../components/LocationPickerModal';
import {
  Check,
  X,
  UserPlus,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Utensils,
  ClipboardList,
  MapPin,
  Map,
} from 'lucide-react';

interface Props {
  currentUser: User;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

export const ManagerView: React.FC<Props> = ({ currentUser, showToast }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurantAddress, setRestaurantAddress] = useState<string>('');
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [deliveryPartners, setDeliveryPartners] = useState<User[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(false);

  // Assign Delivery Modal
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);

  // Add Menu Item Modal
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [isSubmittingDish, setIsSubmittingDish] = useState(false);
  const [newDish, setNewDish] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Biryani',
    image_url: '',
    is_veg: false,
  });

  useEffect(() => {
    loadManagerData();
  }, [currentUser.id]);

  const loadManagerData = async () => {
    try {
      let restData = await api.getRestaurantsByManager(currentUser.id);
      if (restData.length === 0) {
        // Automatically create a default restaurant kitchen for this manager if none exists
        try {
          const newRest = await api.createRestaurant({
            name: `${currentUser.name}'s Kitchen`,
            cuisine: 'Authentic Biryani & South Indian Specials',
            description: `Fresh delicious meals handcrafted by Chef ${currentUser.name}.`,
            address: currentUser.address || restaurantAddress || '100 Feet Road, T. Nagar, Chennai - 600017',
            lat: currentUser.lat,
            lon: currentUser.lon,
            rating: 4.8,
            delivery_time_mins: 25,
            manager_id: currentUser.id,
            image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
          });
          restData = [newRest];
        } catch (createErr) {
          console.error('Failed to auto-create restaurant for manager:', createErr);
        }
      }
      if (restData.length > 0) {
        setSelectedRestaurant(restData[0]);
        setRestaurantAddress(restData[0].address);
      }
      loadOrders();
      loadPartners();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to load manager kitchen data', 'warning');
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const data = await api.getOrders({ manager_id: currentUser.id });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadPartners = async () => {
    try {
      const partners = await api.getDeliveryPartners();
      setDeliveryPartners(partners);
      if (partners.length > 0) {
        setSelectedPartnerId(partners[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Order Actions
  const handleManagerAction = async (orderId: number, status: 'accepted' | 'rejected') => {
    try {
      await api.managerAction(orderId, status);
      showToast(`Order #${orderId} ${status === 'accepted' ? 'accepted!' : 'rejected.'}`, status === 'accepted' ? 'success' : 'warning');
      loadOrders();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'warning');
    }
  };

  const handleAssignDelivery = async () => {
    if (!assigningOrder || !selectedPartnerId) return;
    try {
      await api.assignDeliveryPartner(assigningOrder.id, selectedPartnerId);
      const partner = deliveryPartners.find((p) => p.id === selectedPartnerId);
      showToast(`Assigned Order #${assigningOrder.id} to ${partner?.name || 'Rider'}!`, 'success');
      setAssigningOrder(null);
      loadOrders();
    } catch (err: any) {
      showToast(err.message || 'Assignment failed', 'warning');
    }
  };

  // Menu Actions
  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await api.toggleMenuItemAvailability(item.id);
      showToast(`Updated '${item.name}' availability`, 'info');
      if (selectedRestaurant) {
        const updated = await api.getRestaurant(selectedRestaurant.id);
        setSelectedRestaurant(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'warning');
    }
  };

  const handleDeleteDish = async (itemId: number, name: string) => {
    if (!confirm(`Are you sure you want to remove '${name}' from the menu?`)) return;
    try {
      await api.deleteMenuItem(itemId);
      showToast(`Removed '${name}' from menu`, 'info');
      if (selectedRestaurant) {
        const updated = await api.getRestaurant(selectedRestaurant.id);
        setSelectedRestaurant(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'warning');
    }
  };

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();

    const dishName = newDish.name.trim();
    if (!dishName) {
      showToast('Please enter a dish name', 'warning');
      return;
    }

    const priceNum = parseFloat(newDish.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Please enter a valid price greater than ₹0', 'warning');
      return;
    }

    let targetRestaurant = selectedRestaurant;
    if (!targetRestaurant) {
      try {
        const restData = await api.getRestaurantsByManager(currentUser.id);
        if (restData.length > 0) {
          targetRestaurant = restData[0];
          setSelectedRestaurant(targetRestaurant);
        } else {
          // Auto-create a restaurant kitchen for this manager
          const newRest = await api.createRestaurant({
            name: `${currentUser.name}'s Kitchen`,
            cuisine: 'Authentic Biryani & South Indian Specials',
            description: `Fresh delicious meals handcrafted by Chef ${currentUser.name}.`,
            address: restaurantAddress || '100 Feet Road, T. Nagar, Chennai - 600017',
            rating: 4.8,
            delivery_time_mins: 25,
            manager_id: currentUser.id,
            image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
          });
          targetRestaurant = newRest;
          setSelectedRestaurant(newRest);
        }
      } catch (err: any) {
        showToast(`Could not link restaurant kitchen: ${err.message}`, 'warning');
        return;
      }
    }

    if (!targetRestaurant) {
      showToast('Restaurant kitchen profile not found. Please refresh the page.', 'warning');
      return;
    }

    // Sanitize image URL if provided
    let finalImageUrl = newDish.image_url.trim();
    if (finalImageUrl && !finalImageUrl.startsWith('http://') && !finalImageUrl.startsWith('https://') && !finalImageUrl.startsWith('data:')) {
      finalImageUrl = `https://${finalImageUrl}`;
    }
    if (!finalImageUrl) {
      finalImageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    }

    setIsSubmittingDish(true);
    try {
      await api.createMenuItem({
        restaurant_id: targetRestaurant.id,
        name: dishName,
        description: newDish.description.trim(),
        price: priceNum,
        category: newDish.category,
        image_url: finalImageUrl,
        is_veg: newDish.is_veg,
        is_available: true,
      });

      showToast(`Added '${dishName}' to the menu!`, 'success');
      setShowAddDishModal(false);
      setNewDish({
        name: '',
        description: '',
        price: '',
        category: 'Biryani',
        image_url: '',
        is_veg: false,
      });

      // Refresh restaurant menu
      const updated = await api.getRestaurant(targetRestaurant.id);
      setSelectedRestaurant(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to create item', 'warning');
    } finally {
      setIsSubmittingDish(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Restaurant Header */}
      <div
        className="card"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2>{selectedRestaurant?.name || 'Restaurant Manager Hub'}</h2>
            <span
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Manager: {currentUser.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
              {selectedRestaurant?.cuisine} • {restaurantAddress || selectedRestaurant?.address || 'Chennai, Tamil Nadu'}
            </span>
            <button
              type="button"
              onClick={() => setIsMapPickerOpen(true)}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--primary)',
                background: 'var(--primary-light)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #fed7aa',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Map size={11} /> Pick Kitchen on Map
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('orders')}
          >
            <ClipboardList size={18} />
            <span>Orders Dispatch</span>
            {orders.filter((o) => o.status === 'placed').length > 0 && (
              <span
                style={{
                  background: '#fff',
                  color: 'var(--primary)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                {orders.filter((o) => o.status === 'placed').length} NEW
              </span>
            )}
          </button>

          <button
            className={`btn ${activeTab === 'menu' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('menu')}
          >
            <Utensils size={18} />
            <span>Manage Menu Items</span>
          </button>

          <button
            className="btn btn-outline"
            onClick={loadOrders}
            title="Refresh Orders"
            style={{ padding: '10px' }}
          >
            <RefreshCw size={18} className={loadingOrders ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>Incoming Customer Orders ({orders.length})</h3>
            <span style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
              Tip: Accept order first, then assign an available delivery partner
            </span>
          </div>

          {orders.length === 0 ? (
            <div
              className="card"
              style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}
            >
              <ClipboardList size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <h3>No orders yet for this kitchen</h3>
              <p style={{ marginTop: '8px' }}>
                Switch to Customer persona to place an order and see it arrive here live!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="card"
                  style={{
                    padding: '20px 24px',
                    borderLeft:
                      order.status === 'placed'
                        ? '6px solid var(--warning)'
                        : order.status === 'accepted'
                        ? '6px solid var(--info)'
                        : '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ fontSize: '1.2rem' }}>Order #{order.id}</h4>
                        <StatusBadge status={order.status} />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          color: 'var(--muted)',
                          fontSize: '0.85rem',
                          marginTop: '4px',
                        }}
                      >
                        <span>Customer: <strong>{order.customer_name}</strong></span>
                        <span>• Placed at: {new Date(order.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                        ₹{order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div
                    style={{
                      background: 'var(--bg-page)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      margin: '14px 0',
                    }}
                  >
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
                            {it.quantity}x {it.item_name}
                          </span>
                          <span style={{ color: 'var(--muted)' }}>₹{it.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border)',
                        fontSize: '0.82rem',
                        color: 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <MapPin size={13} />
                      <span>Delivery To: {order.delivery_address}</span>
                      {order.notes && <span>• Note: "{order.notes}"</span>}
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    {/* Partner Assignment Info */}
                    <div>
                      {order.delivery_partner_name ? (
                        <div style={{ fontSize: '0.88rem', color: '#1e40af', fontWeight: 600 }}>
                          Assigned Rider: 🛵 {order.delivery_partner_name}
                        </div>
                      ) : order.status === 'accepted' ? (
                        <div style={{ fontSize: '0.88rem', color: 'var(--warning)', fontWeight: 600 }}>
                          ⚠️ Awaiting delivery partner assignment
                        </div>
                      ) : null}
                    </div>

                    {/* Action buttons based on status */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {order.status === 'placed' && (
                        <>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleManagerAction(order.id, 'accepted')}
                          >
                            <Check size={16} /> Accept Order
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleManagerAction(order.id, 'rejected')}
                          >
                            <X size={16} /> Reject Order
                          </button>
                        </>
                      )}

                      {order.status === 'accepted' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setAssigningOrder(order)}
                        >
                          <UserPlus size={16} /> Assign Delivery Partner
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MENU MANAGEMENT TAB */}
      {activeTab === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3>Menu Catalog ({selectedRestaurant?.menu_items?.length || 0} items)</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                Add new items, toggle live availability or remove out of stock items.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddDishModal(true)}>
              <Plus size={18} /> Add New Dish
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {(selectedRestaurant?.menu_items || []).map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  opacity: item.is_available ? 1 : 0.65,
                }}
              >
                <img
                  src={
                    item.image_url ||
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'
                  }
                  alt={item.name}
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'cover',
                  }}
                />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          color: 'var(--muted)',
                        }}
                      >
                        {item.category} • {item.is_veg ? '🌱 Veg' : '🍖 Non-veg'}
                      </span>
                      <h4 style={{ fontSize: '1rem', marginTop: '2px' }}>{item.name}</h4>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>₹{item.price.toFixed(2)}</span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--muted)',
                      marginTop: '4px',
                      lineHeight: 1.3,
                      flex: 1,
                    }}
                  >
                    {item.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '10px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: item.is_available ? 'var(--success)' : 'var(--danger)',
                      }}
                    >
                      {item.is_available ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{item.is_available ? 'Available' : 'Out of Stock'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteDish(item.id, item.name)}
                      style={{ color: 'var(--muted)', padding: '4px' }}
                      title="Delete dish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ASSIGN DELIVERY PARTNER MODAL */}
      {assigningOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Assign Delivery Partner</h3>
              <button onClick={() => setAssigningOrder(null)} style={{ color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '16px' }}>
                Select a registered delivery rider for <strong>Order #{assigningOrder.id}</strong> (Total: ₹{assigningOrder.total_amount.toFixed(2)})
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {deliveryPartners.map((p) => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: selectedPartnerId === p.id ? 'var(--primary-light)' : '#fff',
                      borderColor: selectedPartnerId === p.id ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="radio"
                        name="partner"
                        value={p.id}
                        checked={selectedPartnerId === p.id}
                        onChange={() => setSelectedPartnerId(p.id)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {p.phone || '+1 555-0333'} • {p.is_available ? '🟢 Online' : '⚪ Busy'}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                      Assign
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAssigningOrder(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAssignDelivery}>
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD DISH MODAL */}
      {showAddDishModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleCreateDish} noValidate>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.2rem' }}>Add New Menu Dish</h3>
                <button
                  type="button"
                  onClick={() => setShowAddDishModal(false)}
                  style={{ color: 'var(--muted)' }}
                  disabled={isSubmittingDish}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Dish Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Special Chicken Dum Biryani"
                    value={newDish.name}
                    onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="199.00"
                      value={newDish.price}
                      onChange={(e) => setNewDish({ ...newDish, price: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      value={newDish.category}
                      onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                      className="form-select"
                    >
                      <option value="Biryani">Biryani</option>
                      <option value="South Indian">South Indian</option>
                      <option value="Pizza">Pizza</option>
                      <option value="Pasta">Pasta</option>
                      <option value="Ramen">Ramen</option>
                      <option value="Burger">Burger</option>
                      <option value="Curry">Curry</option>
                      <option value="Sides">Sides</option>
                      <option value="Dessert">Dessert</option>
                      <option value="Drinks">Drinks</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Detailed ingredients, spices, style of cooking..."
                    value={newDish.description}
                    onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL (paste any link or web image)</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or paste image URL"
                    value={newDish.image_url}
                    onChange={(e) => setNewDish({ ...newDish, image_url: e.target.value })}
                    className="form-input"
                  />
                  {newDish.image_url.trim() && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={
                          newDish.image_url.trim().startsWith('http') || newDish.image_url.trim().startsWith('data:')
                            ? newDish.image_url.trim()
                            : `https://${newDish.image_url.trim()}`
                        }
                        alt="Preview"
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: 'var(--radius-sm)',
                          objectFit: 'cover',
                          border: '1px solid var(--border)',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        onLoad={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'block';
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Image Preview (will fall back to gourmet default if unavailable)
                      </span>
                    </div>
                  )}
                </div>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newDish.is_veg}
                    onChange={(e) => setNewDish({ ...newDish, is_veg: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#16a34a' }}
                  />
                  <span>🌱 Vegetarian Dish</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddDishModal(false)}
                  disabled={isSubmittingDish}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingDish}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmittingDish ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Saving to Menu...</span>
                    </>
                  ) : (
                    <span>Save to Menu</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restaurant Kitchen Location Picker on Map */}
      <LocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onSelectLocation={async (picked, lat, lon) => {
          setRestaurantAddress(picked);
          if (selectedRestaurant) {
            try {
              const updated = await api.updateRestaurant(selectedRestaurant.id, {
                address: picked,
                lat: lat,
                lon: lon,
              });
              setSelectedRestaurant(updated);
              showToast('Updated kitchen address & map coordinates!', 'success');
            } catch (err: any) {
              showToast(err.message || 'Failed to update kitchen location', 'warning');
            }
          }
        }}
        initialAddress={restaurantAddress || selectedRestaurant?.address}
        title="Set Restaurant Kitchen Location on Map (Chennai)"
      />
    </div>
  );
};
