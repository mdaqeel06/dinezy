import React from 'react';
import type { OrderStatus } from '../types';
import { ShoppingBag, ChefHat, Bike, CheckCircle } from 'lucide-react';

interface Props {
  status: OrderStatus;
}

export const OrderProgress: React.FC<Props> = ({ status }) => {
  if (status === 'PENDING_PAYMENT') {
    return (
      <div style={{ padding: '12px', background: '#fffbeb', borderRadius: 'var(--radius-md)', color: '#b45309', fontSize: '0.85rem', fontWeight: 600, marginTop: '12px', border: '1px solid #fef3c7' }}>
        ⏳ Payment pending. Please complete payment through Razorpay to send this order to the restaurant.
      </div>
    );
  }

  if (status === 'rejected' || status === 'delivery_rejected') {
    return (
      <div style={{ padding: '12px', background: 'var(--danger-light)', borderRadius: 'var(--radius-md)', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600, marginTop: '12px' }}>
        {status === 'rejected' ? 'This order was declined by the restaurant.' : 'Delivery partner declined the request. Awaiting reassignment.'}
      </div>
    );
  }

  const steps = [
    { key: 'placed', label: 'Order Placed', icon: <ShoppingBag size={16} /> },
    { key: 'accepted', label: 'Accepted', icon: <ChefHat size={16} /> },
    { key: 'assigned', label: 'Rider Assigned', icon: <Bike size={16} /> },
    { key: 'out_for_delivery', label: 'On The Way', icon: <Bike size={16} /> },
    { key: 'delivered', label: 'Delivered', icon: <CheckCircle size={16} /> },
  ];

  const getStepIndex = (st: OrderStatus): number => {
    switch (st) {
      case 'placed':
        return 0;
      case 'accepted':
        return 1;
      case 'assigned':
      case 'delivery_accepted':
        return 2;
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);
  const progressPercent = (currentIndex / (steps.length - 1)) * 100;

  return (
    <div className="stepper-container">
      <div className="stepper-progress-bg">
        <div className="stepper-progress-bar" style={{ width: `${progressPercent}%` }} />
      </div>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;

        return (
          <div key={step.key} className="stepper-step">
            <div className={`step-circle ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
              {step.icon}
            </div>
            <span className={`step-label ${isActive ? 'active' : ''}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
