import React from 'react';
import type { User } from '../types';
import { UtensilsCrossed, ShoppingBag, ChefHat, Bike, User as UserIcon, ShieldCheck, LogOut, LogIn } from 'lucide-react';

interface Props {
  currentUser: User | null;
  cartCount: number;
  onOpenCart: () => void;
  activeCustomerTab: 'browse' | 'orders';
  onChangeCustomerTab: (tab: 'browse' | 'orders') => void;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentUser,
  cartCount,
  onOpenCart,
  activeCustomerTab,
  onChangeCustomerTab,
  onLogout,
  onOpenAuth,
}) => {
  const getRoleIcon = () => {
    switch (currentUser?.role) {
      case 'super_admin':
        return <ShieldCheck size={16} color="#eab308" />;
      case 'restaurant_manager':
        return <ChefHat size={16} color="#3b82f6" />;
      case 'delivery_partner':
        return <Bike size={16} color="#10b981" />;
      default:
        return <UserIcon size={16} color="var(--primary)" />;
    }
  };

  const getRoleLabel = () => {
    switch (currentUser?.role) {
      case 'super_admin':
        return 'Super Admin Dashboard';
      case 'restaurant_manager':
        return 'Restaurant Manager Portal';
      case 'delivery_partner':
        return 'Delivery Partner Dashboard';
      default:
        return 'Customer Portal';
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand">
          <div className="brand-logo">
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <div className="brand-title">
              dine<span>zy</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '-2px' }}>
              {getRoleLabel()}
            </div>
          </div>
        </div>

        {currentUser?.role === 'customer' && (
          <nav aria-label="Customer Navigation" style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn btn-sm ${activeCustomerTab === 'browse' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => onChangeCustomerTab('browse')}
            >
              Browse Food
            </button>
            <button
              className={`btn btn-sm ${activeCustomerTab === 'orders' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => onChangeCustomerTab('orders')}
            >
              My Orders
            </button>
          </nav>
        )}

        <div className="navbar-actions">
          {currentUser ? (
            <>
              <div className="nav-role-badge">
                {getRoleIcon()}
                <span>{currentUser.name}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted)',
                    textTransform: 'capitalize',
                    background: 'rgba(0,0,0,0.05)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>

              {currentUser.role === 'customer' && (
                <button
                  className="btn btn-primary"
                  style={{ position: 'relative', padding: '10px 16px' }}
                  onClick={onOpenCart}
                >
                  <ShoppingBag size={18} />
                  <span>Cart</span>
                  {cartCount > 0 && (
                    <span
                      style={{
                        background: '#fff',
                        color: 'var(--primary)',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 7px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        marginLeft: '4px',
                      }}
                    >
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              <button
                className="btn btn-outline btn-sm"
                onClick={onLogout}
                title="Sign out of your account"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', borderColor: '#fecaca' }}
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onOpenAuth}>
              <LogIn size={18} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
