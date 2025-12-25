// Database types matching the new ER diagram schema

export type UserRole = 'student' | 'staff' | 'admin';

export type PersonnelPosition = 
  | 'dean' 
  | 'associate_dean' 
  | 'department_head' 
  | 'student_affairs' 
  | 'committee_member' 
  | 'committee_chairman' 
  | 'president';

export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'dept_review'
  | 'faculty_review'
  | 'student_affairs_review'
  | 'committee_review'
  | 'chairman_review'
  | 'president_review'
  | 'approved'
  | 'rejected';

export const POSITION_LABELS: Record<PersonnelPosition, string> = {
  dean: 'คณบดี',
  associate_dean: 'รองคณบดี',
  department_head: 'หัวหน้าภาควิชา',
  student_affairs: 'กองพัฒนานิสิต',
  committee_member: 'คณะกรรมการ',
  committee_chairman: 'ประธานคณะกรรมการ',
  president: 'อธิการบดี',
};

export const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  draft: { label: 'ร่าง', color: 'secondary' },
  submitted: { label: 'ส่งแล้ว', color: 'info' },
  dept_review: { label: 'ภาควิชาพิจารณา', color: 'warning' },
  faculty_review: { label: 'คณะพิจารณา', color: 'warning' },
  student_affairs_review: { label: 'กองพัฒนานิสิตพิจารณา', color: 'warning' },
  committee_review: { label: 'คณะกรรมการพิจารณา', color: 'warning' },
  chairman_review: { label: 'ประธานพิจารณา', color: 'warning' },
  president_review: { label: 'อธิการบดีพิจารณา', color: 'warning' },
  approved: { label: 'อนุมัติ', color: 'success' },
  rejected: { label: 'ไม่อนุมัติ', color: 'destructive' },
};

// Workflow step mapping for each position
export const WORKFLOW_STEPS: Record<PersonnelPosition, ApplicationStatus> = {
  department_head: 'dept_review',
  associate_dean: 'faculty_review',
  dean: 'faculty_review',
  student_affairs: 'student_affairs_review',
  committee_member: 'committee_review',
  committee_chairman: 'chairman_review',
  president: 'president_review',
};

export interface Faculty {
  id: string;
  faculty_code: string;
  faculty_name: string;
}

export interface Department {
  id: string;
  dept_code: string;
  dept_name: string;
  faculty_id: string;
  faculty?: Faculty;
}

export interface User {
  id: string;
  auth_user_id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  student_code: string | null;
  first_name: string;
  last_name: string;
  department_id: string | null;
  gpax: number | null;
  department?: Department;
}

export interface PersonnelProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  position: PersonnelPosition;
  department_id: string | null;
  faculty_id: string | null;
  department?: Department;
  faculty?: Faculty;
}

export interface AcademicPeriod {
  id: string;
  academic_year: number;
  semester: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface AwardType {
  id: string;
  type_code: string;
  type_name: string;
  description: string | null;
  required_docs: string[];
}

export interface Application {
  id: string;
  student_id: string;
  period_id: string;
  award_type_id: string;
  project_name: string | null;
  description: string | null;
  achievements: string | null;
  activity_hours: number | null;
  current_status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  // Relations
  student?: User & { student_profile?: StudentProfile };
  period?: AcademicPeriod;
  award_type?: AwardType;
}

export interface ApplicationAttachment {
  id: string;
  application_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
}

export interface ApprovalLog {
  id: string;
  application_id: string;
  actor_id: string;
  action_type: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus | null;
  comment: string | null;
  created_at: string;
  actor?: User & { personnel_profile?: PersonnelProfile };
}

export interface CommitteeVote {
  id: string;
  application_id: string;
  committee_id: string;
  is_agree: boolean;
  comment: string | null;
  created_at: string;
  committee?: User & { personnel_profile?: PersonnelProfile };
}
