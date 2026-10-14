import React, { useState, useEffect } from 'react';
import type { User, AdminUser, PlatformStats, UserRole } from '../types';
import { api } from '../services/api';
import {
  ShieldCheck,
  Users,
  UtensilsCrossed,
  TrendingUp,
  Search,
  RefreshCw,
  ChefHat,
  Bike,
  UserCheck,
  Trash2,
} from 'lucide-react';

interface Props {
  currentUser: User;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AdminView: React.FC<Props> = ({ currentUser, showToast }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [usersData, statsData] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load admin data', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (targetUser: AdminUser, newRole: UserRole) => {
    if (targetUser.role === newRole) return;

    if (targetUser.id === currentUser.id) {
      showToast('You cannot change your own Super Admin role.', 'warning');
      return;
    }

    try {
      setUpdatingUserId(targetUser.id);
      await api.updateUserRole(targetUser.id, newRole);
      showToast(
        `Successfully updated ${targetUser.name}'s role to ${newRole.replace('_', ' ').toUpperCase()}!`,
        'success'
      );
      // Reload admin data
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user role', 'warning');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (targetUser: AdminUser) => {
    if (targetUser.id === currentUser.id) {
      showToast('You cannot delete your own Super Admin account.', 'warning');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete user "${targetUser.name}" (${targetUser.email})? This will revoke access and clear their platform sessions.`
    );
    if (!confirmed) return;

    try {
      setDeletingUserId(targetUser.id);
      await api.deleteUser(targetUser.id);
      showToast(`User "${targetUser.name}" deleted successfully.`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'warning');
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    return true;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span
            style={{
              background: '#fef9c3',
              color: '#854d0e',
              border: '1px solid #fde047',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ShieldCheck size={13} /> SUPER ADMIN
          </span>
        );
      case 'restaurant_manager':
        return (
          <span
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ChefHat size={13} /> MANAGER
          </span>
        );
      case 'delivery_partner':
        return (
          <span
            style={{
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Bike size={13} /> DELIVERY RIDER
          </span>
        );
      default:
        return (
          <span
            style={{
              background: 'var(--bg-page)',
              color: 'var(--secondary)',
              border: '1px solid var(--border)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <UserCheck size={13} /> CUSTOMER
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
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
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: '#eab308',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.4rem' }}>Super Admin Control Panel</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Full administrative authority over platform users, role assignments, and platform health.
              </p>
            </div>
          </div>
        </div>

        <button
          className="btn btn-sm"
          onClick={loadAdminData}
          disabled={loading}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }
          }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Total Users
              </span>
              <Users size={18} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>
              {stats.total_users}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
              {stats.roles_distribution.customer} Customers • {stats.roles_distribution.restaurant_manager} Managers
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Active Delivery Riders
              </span>
              <Bike size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: '#10b981' }}>
              {stats.roles_distribution.delivery_partner}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
              Fleet ready for dispatch
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Restaurants
              </span>
              <UtensilsCrossed size={18} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: '#3b82f6' }}>
              {stats.total_restaurants}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
              Active dining partners
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Gross Revenue
              </span>
              <TrendingUp size={18} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: '#f59e0b' }}>
              ₹{stats.total_revenue.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
              Across {stats.total_orders} total orders
            </div>
          </div>
        </div>
      )}

      {/* Users Management Section */}
      <div className="card" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h3>Platform User Accounts & Role Permissions</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
              Promote customers to restaurant managers, dispatch riders, or super admins.
            </p>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
              />
              <input
                type="text"
                placeholder="Search user or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.85rem', padding: '9px 12px' }}
            >
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="restaurant_manager">Restaurant Managers</option>
              <option value="delivery_partner">Delivery Partners</option>
              <option value="super_admin">Super Admins</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>USER</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>CURRENT ROLE</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>ACTIVITY</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>PHONE / STATUS</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'right' }}>
                  ROLE & ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: isSelf ? '#f8fafc' : undefined }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.name}</div>
                        {isSelf && (
                          <span
                            style={{
                              background: '#e2e8f0',
                              color: '#334155',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{u.email}</div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {getRoleBadge(u.role)}
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {u.customer_orders_count > 0 && <div>🛒 {u.customer_orders_count} orders placed</div>}
                      {u.managed_restaurants_count > 0 && <div>🍳 Manages {u.managed_restaurants_count} kitchen(s)</div>}
                      {u.delivery_orders_count > 0 && <div>🛵 {u.delivery_orders_count} deliveries completed</div>}
                      {u.customer_orders_count === 0 && u.managed_restaurants_count === 0 && u.delivery_orders_count === 0 && (
                        <span>No activity yet</span>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '0.82rem' }}>
                      <div>{u.phone || 'No phone'}</div>
                      <div style={{ color: u.is_available ? 'var(--success)' : 'var(--muted)', fontWeight: 600 }}>
                        {u.is_available ? '🟢 Active' : '⚪ Inactive'}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <select
                          value={u.role}
                          disabled={updatingUserId === u.id || isSelf}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className="form-select"
                          title={isSelf ? 'You cannot change your own role' : 'Change user role'}
                          style={{
                            fontSize: '0.82rem',
                            padding: '6px 10px',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm)',
                            opacity: isSelf ? 0.6 : 1,
                            cursor: isSelf ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <option value="customer">Customer (Default)</option>
                          <option value="restaurant_manager">Restaurant Manager</option>
                          <option value="delivery_partner">Delivery Partner</option>
                          <option value="super_admin">Super Admin</option>
                        </select>

                        {!isSelf ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={deletingUserId === u.id}
                            className="btn btn-outline btn-sm"
                            title={`Delete ${u.name}'s account`}
                            style={{
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                              padding: '6px 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Trash2 size={14} />
                            {deletingUserId === u.id ? 'Deleting...' : 'Delete'}
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--muted)',
                              fontStyle: 'italic',
                              padding: '0 6px',
                            }}
                          >
                            Self Account
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
