export enum UserRole {
  ADMIN = 'admin',
  FACULTY = 'faculty',
  STUDENT = 'student',
  STAFF = 'staff',
  MAINTENANCE = 'maintenance'
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
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
}

export interface Event {
  id: number;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  organizer_id: number;
  status?: 'pending' | 'approved' | 'rejected';
  category?: string;
  created_at: string;
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
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
}


