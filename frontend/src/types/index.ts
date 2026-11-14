export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: 'citizen' | 'officer' | 'admin';
  department_id?: string;
  department_name?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  department_id: string;
  department_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface ComplaintUpdate {
  id: string;
  complaint_id: string;
  officer_id?: string;
  officer_name?: string;
  previous_status?: string;
  new_status: string;
  note?: string;
  resolution_image_url?: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  tracking_id: string;
  citizen_id: string;
  citizen_name?: string;
  citizen_phone?: string;
  category_id: string;
  category_name?: string;
  department_id: string;
  department_name?: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Submitted' | 'Under Review' | 'In Progress' | 'Resolved' | 'Rejected' | 'Reopened';
  latitude?: number;
  longitude?: number;
  address?: string;
  image_url: string;
  ai_detected: boolean;
  ai_confidence?: 'Low' | 'Medium' | 'High';
  ai_reasoning_summary?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  updates?: ComplaintUpdate[];
}

export interface AIAnalysisResponse {
  success: boolean;
  issue_detected: boolean;
  title?: string;
  category?: string;
  category_id?: string;
  department?: string;
  department_id?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence?: 'Low' | 'Medium' | 'High';
  reasoning_summary?: string;
  raw_message?: string;
  is_demo?: boolean;
}

export interface PublicStats {
  total_complaints: number;
  resolved_complaints: number;
  in_progress_complaints: number;
  departments_count: number;
  resolution_rate: number;
  recent_resolved: Array<{
    tracking_id: string;
    title: string;
    category: string;
    department: string;
    image_url: string;
    resolved_at: string;
  }>;
}

export interface DepartmentDashboardStats {
  total: number;
  submitted: number;
  under_review: number;
  in_progress: number;
  resolved: number;
  rejected: number;
  reopened: number;
  priority_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  recent_trend: Array<{ date: string; complaints: number }>;
}
