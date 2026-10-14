import React from 'react';
import type { OrderStatus } from '../types';
import { Clock, CheckCircle2, XCircle, UserCheck, Bike, CheckCheck, CreditCard } from 'lucide-react';

interface Props {
  status: OrderStatus;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return {
          label: 'Payment Pending',
          className: 'status-rejected',
          icon: <CreditCard size={13} />,
        };
      case 'placed':
        return {
          label: 'Order Placed',
          className: 'status-placed',
          icon: <Clock size={13} />,
        };
      case 'accepted':
        return {
          label: 'Restaurant Accepted',
          className: 'status-accepted',
          icon: <CheckCircle2 size={13} />,
        };
      case 'rejected':
        return {
          label: 'Rejected by Restaurant',
          className: 'status-rejected',
          icon: <XCircle size={13} />,
        };
      case 'assigned':
        return {
          label: 'Partner Assigned',
          className: 'status-assigned',
          icon: <UserCheck size={13} />,
        };
      case 'delivery_accepted':
        return {
          label: 'Delivery Accepted',
          className: 'status-delivery_accepted',
          icon: <Bike size={13} />,
        };
      case 'delivery_rejected':
        return {
          label: 'Partner Declined',
          className: 'status-delivery_rejected',
          icon: <XCircle size={13} />,
        };
      case 'out_for_delivery':
        return {
          label: 'Out for Delivery',
          className: 'status-out_for_delivery',
          icon: <Bike size={13} />,
        };
      case 'delivered':
        return {
          label: 'Delivered',
          className: 'status-delivered',
          icon: <CheckCheck size={13} />,
        };
      default:
        return {
          label: status,
          className: 'status-placed',
          icon: <Clock size={13} />,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span className={`status-badge ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
};
