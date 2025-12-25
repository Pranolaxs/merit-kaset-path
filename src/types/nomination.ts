export type AwardCategory = 
  | 'extracurricular'  // กิจกรรมเสริมหลักสูตร
  | 'creativity'       // ความคิดสร้างสรรค์และนวัตกรรม
  | 'good_conduct';    // ความประพฤติดี

export type NominationStatus = 
  | 'draft'
  | 'submitted'
  | 'department_head_pending'
  | 'department_head_approved'
  | 'department_head_rejected'
  | 'vice_dean_pending'
  | 'vice_dean_approved'
  | 'vice_dean_rejected'
  | 'dean_pending'
  | 'dean_approved'
  | 'dean_rejected'
  | 'division_review'
  | 'committee_voting'
  | 'committee_approved'
  | 'committee_rejected'
  | 'chairman_pending'
  | 'chairman_signed'
  | 'president_pending'
  | 'approved'
  | 'rejected';

export interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  faculty: string;
  department: string;
  year: number;
  gpa: number;
  profileImage?: string;
}

export interface Nomination {
  id: string;
  student: Student;
  category: AwardCategory;
  semester: 'first' | 'second';
  academicYear: number;
  status: NominationStatus;
  submittedAt: string;
  updatedAt: string;
  description: string;
  achievements: string[];
  attachments: string[];
  activityHours?: number;
  currentStep: number;
  totalSteps: number;
}

export interface ApprovalStep {
  step: number;
  title: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'current' | 'waiting';
  approvedBy?: string;
  approvedAt?: string;
  comment?: string;
}

export const AWARD_CATEGORIES: Record<AwardCategory, { label: string; description: string; icon: string }> = {
  extracurricular: {
    label: 'ด้านกิจกรรมเสริมหลักสูตร',
    description: 'นิสิตที่มีส่วนร่วมในกิจกรรมต่างๆ ของมหาวิทยาลัย',
    icon: '🎭',
  },
  creativity: {
    label: 'ด้านความคิดสร้างสรรค์และนวัตกรรม',
    description: 'นิสิตที่มีผลงานสร้างสรรค์หรือนวัตกรรม',
    icon: '💡',
  },
  good_conduct: {
    label: 'ด้านความประพฤติดี',
    description: 'นิสิตที่มีความประพฤติดีเป็นแบบอย่าง',
    icon: '⭐',
  },
};

export const STATUS_CONFIG: Record<NominationStatus, { label: string; color: string }> = {
  draft: { label: 'ฉบับร่าง', color: 'muted' },
  submitted: { label: 'ส่งแล้ว', color: 'info' },
  department_head_pending: { label: 'รอหัวหน้าภาคฯ', color: 'warning' },
  department_head_approved: { label: 'หัวหน้าภาคฯ อนุมัติ', color: 'success' },
  department_head_rejected: { label: 'หัวหน้าภาคฯ ไม่อนุมัติ', color: 'destructive' },
  vice_dean_pending: { label: 'รอรองคณบดี', color: 'warning' },
  vice_dean_approved: { label: 'รองคณบดีอนุมัติ', color: 'success' },
  vice_dean_rejected: { label: 'รองคณบดีไม่อนุมัติ', color: 'destructive' },
  dean_pending: { label: 'รอคณบดี', color: 'warning' },
  dean_approved: { label: 'คณบดีอนุมัติ', color: 'success' },
  dean_rejected: { label: 'คณบดีไม่อนุมัติ', color: 'destructive' },
  division_review: { label: 'กองพัฒนานิสิตตรวจสอบ', color: 'info' },
  committee_voting: { label: 'คณะกรรมการพิจารณา', color: 'warning' },
  committee_approved: { label: 'คณะกรรมการอนุมัติ', color: 'success' },
  committee_rejected: { label: 'คณะกรรมการไม่อนุมัติ', color: 'destructive' },
  chairman_pending: { label: 'รอประธานลงนาม', color: 'warning' },
  chairman_signed: { label: 'ประธานลงนามแล้ว', color: 'success' },
  president_pending: { label: 'รออธิการบดี', color: 'warning' },
  approved: { label: 'อนุมัติ', color: 'success' },
  rejected: { label: 'ไม่อนุมัติ', color: 'destructive' },
};
