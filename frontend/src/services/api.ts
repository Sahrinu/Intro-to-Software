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


async function http<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    const err: any = new Error(body?.error || res.statusText);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Our unified Booking API — matches your backend routes
export const bookingsAPI = {
  // Get all bookings (admin sees all, normal users see their own)
  getAll: () => http<any[]>('/api/bookings'),

  // Get a single booking
  getById: (id: number) => http<any>(`/api/bookings/${id}`),

  // Create a booking
  create: (payload: {
    resource_type: string;
    resource_name: string;
    start_time: string;
    end_time: string;
    reason?: string;
  }) =>
    http('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Update an existing booking
  update: (id: number, payload: any) =>
    http(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Delete a booking
  delete: (id: number) =>
    http(`/api/bookings/${id}`, { method: 'DELETE' }),

  // Approve / reject / complete bookings (Admin/Staff only)
  setStatus: (
    id: number,
    status: 'pending' | 'approved' | 'rejected' | 'completed'
  ) =>
    http(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Check availability for a resource/time window
  getAvailability: (
    resourceName: string,
    start: string,
    end: string
  ) =>
    http<{
      resource_name: string;
      window: { start: string; end: string };
      busy: Array<{ id: number; start: string; end: string; status: string }>;
    }>(
      `/api/bookings/availability?resource_name=${encodeURIComponent(
        resourceName
      )}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    ),
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
