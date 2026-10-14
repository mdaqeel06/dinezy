export type UserRole = 'customer' | 'restaurant_manager' | 'delivery_partner' | 'super_admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  lat?: number;
  lon?: number;
  is_available?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DemoAccount {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  default_password?: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  is_available?: boolean;
  created_at?: string;
  customer_orders_count: number;
  delivery_orders_count: number;
  managed_restaurants_count: number;
}

export interface PlatformStats {
  total_users: number;
  roles_distribution: {
    customer: number;
    restaurant_manager: number;
    delivery_partner: number;
    super_admin: number;
  };
  total_restaurants: number;
  total_orders: number;
  total_revenue: number;
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_veg: boolean;
  is_available: boolean;
}

export interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  description?: string;
  image_url?: string;
  address: string;
  lat?: number;
  lon?: number;
  rating: number;
  delivery_time_mins: number;
  manager_id?: number;
  menu_items?: MenuItem[];
}

export interface OrderItem {
  id: number;
  menu_item_id?: number;
  item_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'placed'
  | 'accepted'
  | 'rejected'
  | 'assigned'
  | 'delivery_accepted'
  | 'delivery_rejected'
  | 'out_for_delivery'
  | 'delivered';

export interface PaymentVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface Order {
  id: number;
  customer_id: number;
  restaurant_id: number;
  delivery_partner_id?: number | null;
  status: OrderStatus;
  order_status?: string;
  payment_status?: 'PENDING' | 'PAID' | 'FAILED';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_key_id?: string;
  payment_link_url?: string;
  currency?: string;
  total_amount: number;
  delivery_address: string;
  delivery_lat?: number | null;
  delivery_lon?: number | null;
  restaurant_address?: string;
  restaurant_lat?: number | null;
  restaurant_lon?: number | null;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  restaurant_name?: string;
  delivery_partner_name?: string | null;
  items: OrderItem[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  restaurantId: number;
  restaurantName: string;
}

