import { useState, useEffect } from 'react';
import type { User, MenuItem, Restaurant, CartItem, Order } from './types';
import { api, tokenStorage } from './services/api';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { CustomerView } from './views/CustomerView';
import { ManagerView } from './views/ManagerView';
import { DeliveryView } from './views/DeliveryView';
import { AdminView } from './views/AdminView';
import { CheckCircle2, AlertTriangle, Info, LogIn, UtensilsCrossed } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Customer specific state
  const [activeCustomerTab, setActiveCustomerTab] = useState<'browse' | 'orders'>('browse');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      setLoadingAuth(true);

      // Check if JWT token exists in localStorage
      const token = tokenStorage.get();
      if (token) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
        } catch {
          tokenStorage.clear();
          setCurrentUser(null);
          setIsAuthModalOpen(true);
        }
      } else {
        // Automatically open Auth Modal if not signed in
        setIsAuthModalOpen(true);
      }
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogout = () => {
    tokenStorage.clear();
    setCurrentUser(null);
    setCart([]);
    setIsAuthModalOpen(true);
    showToast('Signed out successfully', 'info');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  // Cart operations
  const handleAddToCart = (dish: MenuItem, restaurant: Restaurant) => {
    setCart((prev) => {
      if (prev.length > 0 && prev[0].restaurantId !== restaurant.id) {
        const confirmClear = window.confirm(
          `Your cart contains dishes from ${prev[0].restaurantName}. Clear your basket to order from ${restaurant.name}?`
        );
        if (!confirmClear) return prev;
        return [
          {
            menuItem: dish,
            quantity: 1,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
          },
        ];
      }

      const existingIndex = prev.findIndex((item) => item.menuItem.id === dish.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      } else {
        return [
          ...prev,
          {
            menuItem: dish,
            quantity: 1,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
          },
        ];
      }
    });

    showToast(`Added ${dish.name} to cart!`, 'success');
  };

  const handleUpdateQuantity = (itemId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.menuItem.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const launchRazorpayCheckout = (order: Order) => {
    if (!order.razorpay_key_id) {
      showToast('Razorpay key is not configured on the backend', 'warning');
      return;
    }

    if (!(window as any).Razorpay) {
      if (order.payment_link_url) {
        window.open(order.payment_link_url, '_blank');
        return;
      }
      showToast('Razorpay checkout SDK is still loading. Please retry in a few seconds.', 'warning');
      return;
    }

    const options = {
      key: order.razorpay_key_id,
      amount: Math.round(order.total_amount * 100),
      currency: order.currency || 'INR',
      name: 'Dinezy Delivery',
      description: `Order #${order.id} payment • ${order.restaurant_name || 'Kitchen'}`,
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=128&q=80',
      order_id: order.razorpay_order_id,
      prefill: {
        name: currentUser?.name || 'Customer',
        email: currentUser?.email || 'customer@dinezy.com',
        contact: currentUser?.phone || '+919876543210',
      },
      notes: {
        order_id: String(order.id),
      },
      theme: {
        color: '#ea580c',
      },
      modal: {
        ondismiss: () => {
          showToast('Payment window closed. Order remains pending under My Orders.', 'info');
          setActiveCustomerTab('orders');
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          showToast('Verifying payment with server...', 'info');
          await api.verifyPayment(order.id, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          setCart([]);
          setIsCartOpen(false);
          setActiveCustomerTab('orders');
          showToast(`🎉 Payment of ₹${order.total_amount.toFixed(2)} received! Order #${order.id} is confirmed.`, 'success');
        } catch (verifyErr: any) {
          showToast(`Payment verification error: ${verifyErr.message}`, 'warning');
        }
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', (failRes: any) => {
      showToast(`Payment failed: ${failRes.error?.description || 'Transaction cancelled'}`, 'warning');
    });
    rzp.open();
  };

  const handleCheckout = async (address: string, notes: string, lat?: number, lon?: number) => {
    if (!currentUser || cart.length === 0) return;
    try {
      setCheckoutLoading(true);
      const newOrder = await api.createOrder({
        customer_id: currentUser.id,
        restaurant_id: cart[0].restaurantId,
        delivery_address: address,
        delivery_lat: lat,
        delivery_lon: lon,
        notes: notes,
        items: cart.map((c) => ({
          menu_item_id: c.menuItem.id,
          quantity: c.quantity,
        })),
      });

      setIsCartOpen(false);

      if (newOrder.razorpay_order_id) {
        showToast(`Order #${newOrder.id} created! Redirecting to Razorpay checkout...`, 'info');
        launchRazorpayCheckout(newOrder);
      } else if (newOrder.payment_link_url) {
        window.open(newOrder.payment_link_url, '_blank');
        setActiveCustomerTab('orders');
      } else {
        setCart([]);
        setActiveCustomerTab('orders');
        showToast('🎉 Order placed successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to place order', 'warning');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loadingAuth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-page)',
          fontSize: '1.2rem',
          fontWeight: 600,
          color: 'var(--muted)',
        }}
      >
        Validating Dinezy session...
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Main Navbar with Authentication State */}
      <Navbar
        currentUser={currentUser}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        activeCustomerTab={activeCustomerTab}
        onChangeCustomerTab={(tab) => setActiveCustomerTab(tab)}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="main-content">
        {!currentUser ? (
          <div
            className="card"
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              maxWidth: '640px',
              margin: '40px auto',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, var(--primary), #ff8a00)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <UtensilsCrossed size={32} />
            </div>
            <h2>Welcome to Dinezy</h2>
            <p style={{ color: 'var(--muted)', marginTop: '8px', fontSize: '1rem', lineHeight: 1.6 }}>
              Please sign in with your email and password or register a new account to explore restaurants, manage kitchen orders, or dispatch deliveries.
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '24px', padding: '12px 28px' }}
              onClick={() => setIsAuthModalOpen(true)}
            >
              <LogIn size={18} />
              <span>Sign In / Register</span>
            </button>
          </div>
        ) : (
          <>
            {currentUser.role === 'customer' && (
              <CustomerView
                currentUser={currentUser}
                cart={cart}
                onAddToCart={handleAddToCart}
                onUpdateQuantity={handleUpdateQuantity}
                activeTab={activeCustomerTab}
                onPayOrder={launchRazorpayCheckout}
              />
            )}

            {currentUser.role === 'restaurant_manager' && (
              <ManagerView
                currentUser={currentUser}
                showToast={showToast}
              />
            )}

            {currentUser.role === 'delivery_partner' && (
              <DeliveryView
                currentUser={currentUser}
                showToast={showToast}
                onUserUpdated={(updated) => setCurrentUser(updated)}
              />
            )}

            {currentUser.role === 'super_admin' && (
              <AdminView
                currentUser={currentUser}
                showToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Cart Drawer for Customer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        defaultAddress={currentUser?.address}
        defaultLat={currentUser?.lat}
        defaultLon={currentUser?.lon}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => currentUser && setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        showToast={showToast}
      />

      {/* Floating Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
          >
            {toast.type === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
            {toast.type === 'warning' && <AlertTriangle size={18} color="var(--warning)" />}
            {toast.type === 'info' && <Info size={18} color="var(--info)" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
