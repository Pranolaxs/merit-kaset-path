// Extended role types for the application
// Matching the app_role enum in the database

export type AppRole = 
  | 'student'
  | 'department_head'
  | 'associate_dean'
  | 'dean'
  | 'student_affairs'
  | 'committee_member'
  | 'committee_chairman'
  | 'president'
  | 'system_admin';

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  student: 'นิสิต',
  department_head: 'หัวหน้าภาควิชา',
  associate_dean: 'รองคณบดี',
  dean: 'คณบดี',
  student_affairs: 'เจ้าหน้าที่กองพัฒนานิสิต',
  committee_member: 'คณะกรรมการนิสิตดีเด่น',
  committee_chairman: 'ประธานคณะกรรมการ',
  president: 'อธิการบดี / ผู้แทน',
  system_admin: 'ผู้ดูแลระบบ',
};

export const APP_ROLE_ORDER: AppRole[] = [
  'student',
  'department_head',
  'associate_dean',
  'dean',
  'student_affairs',
  'committee_member',
  'committee_chairman',
  'president',
  'system_admin',
];

export interface Campus {
  id: string;
  campus_code: string;
  campus_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  campus_id: string | null;
  faculty_id: string | null;
  department_id: string | null;
  created_at?: string;
  updated_at?: string;
  // Relations
  campus?: Campus;
  faculty?: { id: string; faculty_name: string };
  department?: { id: string; dept_name: string };
}

// Workflow step mapping for approval chain
export const APPROVAL_WORKFLOW: Record<AppRole, AppRole | null> = {
  student: 'department_head',
  department_head: 'associate_dean',
  associate_dean: 'dean',
  dean: 'student_affairs',
  student_affairs: 'committee_member',
  committee_member: 'committee_chairman',
  committee_chairman: 'president',
  president: null,
  system_admin: null,
};

// Which roles can approve applications
export const APPROVER_ROLES: AppRole[] = [
  'department_head',
  'associate_dean',
  'dean',
  'student_affairs',
  'committee_member',
  'committee_chairman',
  'president',
];

// Which roles can manage system settings
export const ADMIN_ROLES: AppRole[] = [
  'system_admin',
];
