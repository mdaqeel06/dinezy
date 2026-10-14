import type {
  User,
  Restaurant,
  MenuItem,
  Order,
  OrderStatus,
  AuthResponse,
  DemoAccount,
  AdminUser,
  PlatformStats,
  UserRole,
  PaymentVerifyPayload,
} from '../types';

const API_BASE = 'http://localhost:8000/api';
const TOKEN_KEY = 'dinezy_jwt_token';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

function getAuthHeaders(): Record<string, string> {
  const token = tokenStorage.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const err = await res.json();
      errorDetail = err.detail || JSON.stringify(err);
    } catch {
      errorDetail = res.statusText;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Auth & Account
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<AuthResponse>(res);
    tokenStorage.set(data.access_token);
    return data;
  },

  register: async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    address?: string,
    lat?: number,
    lon?: number
  ): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, address, lat, lon }),
    });
    const data = await handleResponse<AuthResponse>(res);
    tokenStorage.set(data.access_token);
    return data;
  },

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    return handleResponse<User>(res);
  },

  getDemoAccounts: async (): Promise<DemoAccount[]> => {
    const res = await fetch(`${API_BASE}/auth/demo-accounts`);
    return handleResponse<DemoAccount[]>(res);
  },

  toggleAvailability: async (userId: number): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/availability`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
      },
    });
    return handleResponse<User>(res);
  },

  // Super Admin Endpoints
  getAdminUsers: async (): Promise<AdminUser[]> => {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    return handleResponse<AdminUser[]>(res);
  },

  updateUserRole: async (userId: number, newRole: UserRole): Promise<User> => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ role: newRole }),
    });
    return handleResponse<User>(res);
  },

  deleteUser: async (userId: number): Promise<{ message: string; id: number }> => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    return handleResponse<{ message: string; id: number }>(res);
  },

  getAdminStats: async (): Promise<PlatformStats> => {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    return handleResponse<PlatformStats>(res);
  },

  // Restaurants
  getRestaurants: async (): Promise<Restaurant[]> => {
    const res = await fetch(`${API_BASE}/restaurants`);
    return handleResponse<Restaurant[]>(res);
  },

  getRestaurant: async (id: number): Promise<Restaurant> => {
    const res = await fetch(`${API_BASE}/restaurants/${id}`);
    return handleResponse<Restaurant>(res);
  },

  getRestaurantsByManager: async (managerId: number): Promise<Restaurant[]> => {
    const res = await fetch(`${API_BASE}/restaurants/manager/${managerId}`);
    return handleResponse<Restaurant[]>(res);
  },

  createRestaurant: async (data: Partial<Restaurant> & { name: string; cuisine: string; address: string; manager_id?: number }): Promise<Restaurant> => {
    const res = await fetch(`${API_BASE}/restaurants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Restaurant>(res);
  },

  updateRestaurant: async (id: number, data: Partial<Restaurant>): Promise<Restaurant> => {
    const res = await fetch(`${API_BASE}/restaurants/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Restaurant>(res);
  },

  // Menu Items
  createMenuItem: async (item: Partial<MenuItem> & { restaurant_id: number }): Promise<MenuItem> => {
    const res = await fetch(`${API_BASE}/menu-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(item),
    });
    return handleResponse<MenuItem>(res);
  },

  updateMenuItem: async (id: number, item: Partial<MenuItem>): Promise<MenuItem> => {
    const res = await fetch(`${API_BASE}/menu-items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(item),
    });
    return handleResponse<MenuItem>(res);
  },

  toggleMenuItemAvailability: async (id: number): Promise<MenuItem> => {
    const res = await fetch(`${API_BASE}/menu-items/${id}/toggle-availability`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
      },
    });
    return handleResponse<MenuItem>(res);
  },

  deleteMenuItem: async (id: number): Promise<{ message: string; id: number }> => {
    const res = await fetch(`${API_BASE}/menu-items/${id}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    return handleResponse<{ message: string; id: number }>(res);
  },

  // Orders
  createOrder: async (data: {
    customer_id: number;
    restaurant_id: number;
    delivery_address: string;
    delivery_lat?: number;
    delivery_lon?: number;
    notes?: string;
    items: { menu_item_id: number; quantity: number }[];
  }): Promise<Order> => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Order>(res);
  },

  verifyPayment: async (orderId: number, data: PaymentVerifyPayload): Promise<Order> => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Order>(res);
  },

  getOrders: async (params?: {
    customer_id?: number;
    restaurant_id?: number;
    manager_id?: number;
    delivery_partner_id?: number;
    status?: string;
  }): Promise<Order[]> => {
    const query = new URLSearchParams();
    if (params?.customer_id) query.append('customer_id', params.customer_id.toString());
    if (params?.restaurant_id) query.append('restaurant_id', params.restaurant_id.toString());
    if (params?.manager_id) query.append('manager_id', params.manager_id.toString());
    if (params?.delivery_partner_id) query.append('delivery_partner_id', params.delivery_partner_id.toString());
    if (params?.status) query.append('status', params.status);

    const res = await fetch(`${API_BASE}/orders?${query.toString()}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    return handleResponse<Order[]>(res);
  },

  managerAction: async (orderId: number, status: 'accepted' | 'rejected'): Promise<Order> => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/manager-action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse<Order>(res);
  },

  assignDeliveryPartner: async (orderId: number, deliveryPartnerId: number): Promise<Order> => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/assign-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ delivery_partner_id: deliveryPartnerId }),
    });
    return handleResponse<Order>(res);
  },

  deliveryAction: async (orderId: number, status: OrderStatus): Promise<Order> => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/delivery-action`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse<Order>(res);
  },

  // Delivery
  getDeliveryPartners: async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/delivery/partners`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    return handleResponse<User[]>(res);
  },

  getPartnerOrders: async (partnerId: number): Promise<Order[]> => {
    const res = await fetch(`${API_BASE}/delivery/my-orders/${partnerId}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    return handleResponse<Order[]>(res);
  },
};
