import React from 'react';
import type { User } from '../types';
import { UserCheck, ChefHat, Bike, ArrowRightLeft } from 'lucide-react';

interface Props {
  users: User[];
  currentUser: User | null;
  onSelectUser: (user: User) => void;
}

export const RoleSwitcher: React.FC<Props> = ({ users, currentUser, onSelectUser }) => {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'restaurant_manager':
        return <ChefHat size={15} />;
      case 'delivery_partner':
        return <Bike size={15} />;
      default:
        return <UserCheck size={15} />;
    }
  };

  const formatRoleName = (role: string) => {
    switch (role) {
      case 'restaurant_manager':
        return 'Restaurant Manager';
      case 'delivery_partner':
        return 'Delivery Partner';
      default:
        return 'Customer';
    }
  };

  return (
    <aside aria-label="Demo Persona Switcher" className="persona-banner">
      <div className="persona-banner-inner">
        <div className="persona-left">
          <span className="persona-tag">Role Simulator</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
            <ArrowRightLeft size={14} /> Switch Persona:
          </span>
        </div>

        <div className="persona-options">
          {users.map((u) => {
            const isActive = currentUser?.id === u.id;
            return (
              <button
                key={u.id}
                className={`persona-btn ${isActive ? 'active' : ''}`}
                onClick={() => onSelectUser(u)}
                title={`Switch to ${u.name} (${formatRoleName(u.role)})`}
              >
                {getRoleIcon(u.role)}
                <span>{u.name}</span>
                <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>• {formatRoleName(u.role)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
