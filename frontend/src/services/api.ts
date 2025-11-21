const API_BASE_URL = '/api';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Booking {
  id: number;
  user_id: number;
  resource_type: string;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface Event {
  id: number;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  organizer_id: number;
  category?: string;
  created_at: string;
  organizer_name?: string;
}

export interface MaintenanceRequest {
  id: number;
  user_id: number;
  title: string;
  description: string;
  location: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: number;
  created_at: string;
  updated_at: string;
  requester_name?: string;
  requester_email?: string;
  assigned_name?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'Network error');
  }
}

export const authAPI = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string, role: string): Promise<void> =>
    apiRequest<void>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),
};

export const bookingsAPI = {
  getAll: (): Promise<Booking[]> => apiRequest<Booking[]>('/bookings'),
  getById: (id: number): Promise<Booking> => apiRequest<Booking>(`/bookings/${id}`),
  create: (data: {
    resource_type: string;
    resource_name: string;
    start_time: string;
    end_time: string;
  }): Promise<Booking> =>
    apiRequest<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: {
    resource_type: string;
    resource_name: string;
    start_time: string;
    end_time: string;
  }): Promise<Booking> =>
    apiRequest<Booking>(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: number, status: string): Promise<Booking> =>
    apiRequest<Booking>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  delete: (id: number): Promise<void> =>
    apiRequest<void>(`/bookings/${id}`, {
      method: 'DELETE',
    }),
};

export const eventsAPI = {
  getAll: (): Promise<Event[]> => apiRequest<Event[]>('/events'),
  getById: (id: number): Promise<Event> => apiRequest<Event>(`/events/${id}`),
  create: (data: {
    title: string;
    description?: string;
    location?: string;
    start_time: string;
    end_time: string;
    category?: string;
  }): Promise<Event> =>
    apiRequest<Event>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Event>): Promise<Event> =>
    apiRequest<Event>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number): Promise<void> =>
    apiRequest<void>(`/events/${id}`, {
      method: 'DELETE',
    }),
};

export const maintenanceAPI = {
  getAll: (): Promise<MaintenanceRequest[]> =>
    apiRequest<MaintenanceRequest[]>('/maintenance'),
  getById: (id: number): Promise<MaintenanceRequest> =>
    apiRequest<MaintenanceRequest>(`/maintenance/${id}`),
  create: (data: {
    title: string;
    description: string;
    location: string;
    priority: string;
  }): Promise<MaintenanceRequest> =>
    apiRequest<MaintenanceRequest>('/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: number, status: string): Promise<MaintenanceRequest> =>
    apiRequest<MaintenanceRequest>(`/maintenance/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  assign: (id: number, assigned_to: number): Promise<MaintenanceRequest> =>
    apiRequest<MaintenanceRequest>(`/maintenance/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to }),
    }),
};

export const usersAPI = {
  getMaintenanceStaff: (): Promise<User[]> =>
    apiRequest<User[]>('/users/maintenance-staff'),
};

export const assistantAPI = {
  chat: (message: string): Promise<{ response: string; source: string }> =>
    apiRequest<{ response: string; source: string }>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

