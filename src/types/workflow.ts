// Workflow configuration for approval chain
import type { AppRole } from './roles';

// Application statuses matching the database enum
export type WorkflowStatus = 
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

// Mapping: which role reviews which status
export const STATUS_TO_REVIEWER: Record<WorkflowStatus, AppRole | null> = {
  draft: null,
  submitted: 'department_head',
  dept_review: 'department_head',
  faculty_review: 'dean', // or associate_dean
  student_affairs_review: 'student_affairs',
  committee_review: 'committee_member',
  chairman_review: 'committee_chairman',
  president_review: 'president',
  approved: null,
  rejected: null,
};

// Alternative reviewers (e.g., associate_dean can also review faculty_review)
export const ALTERNATIVE_REVIEWERS: Record<WorkflowStatus, AppRole[]> = {
  draft: [],
  submitted: ['department_head'],
  dept_review: ['department_head'],
  faculty_review: ['dean', 'associate_dean'],
  student_affairs_review: ['student_affairs'],
  committee_review: ['committee_member'],
  chairman_review: ['committee_chairman'],
  president_review: ['president'],
  approved: [],
  rejected: [],
};

// Workflow step order for visual display
export const WORKFLOW_STEPS_ORDER: { status: WorkflowStatus; label: string; description: string }[] = [
  { status: 'submitted', label: 'ส่งใบสมัคร', description: 'นิสิตส่งใบสมัคร' },
  { status: 'dept_review', label: 'ภาควิชาพิจารณา', description: 'หัวหน้าภาควิชาพิจารณา' },
  { status: 'faculty_review', label: 'คณะพิจารณา', description: 'คณบดี/รองคณบดีพิจารณา' },
  { status: 'student_affairs_review', label: 'กองพัฒนานิสิต', description: 'เจ้าหน้าที่ตรวจสอบ' },
  { status: 'committee_review', label: 'คณะกรรมการโหวต', description: 'กรรมการลงคะแนน' },
  { status: 'chairman_review', label: 'ประธานรับรอง', description: 'ประธานลงนาม' },
  { status: 'president_review', label: 'อธิการบดีอนุมัติ', description: 'อธิการบดีลงนาม' },
  { status: 'approved', label: 'อนุมัติ', description: 'ผ่านการอนุมัติ' },
];

// Status flow: current status -> next status on approval
export const APPROVAL_FLOW: Record<WorkflowStatus, WorkflowStatus> = {
  draft: 'submitted',
  submitted: 'dept_review',
  dept_review: 'faculty_review',
  faculty_review: 'student_affairs_review',
  student_affairs_review: 'committee_review',
  committee_review: 'chairman_review',
  chairman_review: 'president_review',
  president_review: 'approved',
  approved: 'approved',
  rejected: 'rejected',
};

// Check if a user with given roles can review an application at given status
export function canReviewAtStatus(userRoles: AppRole[], status: WorkflowStatus): boolean {
  const allowedRoles = ALTERNATIVE_REVIEWERS[status] || [];
  return userRoles.some(role => allowedRoles.includes(role));
}

// Get the step index for a status (for progress display)
export function getStepIndex(status: WorkflowStatus): number {
  const index = WORKFLOW_STEPS_ORDER.findIndex(s => s.status === status);
  if (status === 'rejected') return -1;
  return index >= 0 ? index : 0;
}

// Get all roles that can approve
export const ALL_APPROVER_ROLES: AppRole[] = [
  'department_head',
  'associate_dean',
  'dean',
  'student_affairs',
  'committee_member',
  'committee_chairman',
  'president',
];

// Action types for audit trail
export type ApprovalAction = 'submit' | 'approve' | 'reject' | 'return' | 'vote';

export interface ApprovalLogEntry {
  id: string;
  application_id: string;
  actor_id: string;
  action_type: ApprovalAction;
  from_status: WorkflowStatus | null;
  to_status: WorkflowStatus | null;
  comment: string | null;
  created_at: string;
  actor?: {
    email: string;
    personnel_profile?: {
      first_name: string;
      last_name: string;
    };
  };
}
