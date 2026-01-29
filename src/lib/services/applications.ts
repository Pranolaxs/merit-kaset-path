import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type ApplicationStatus = Database['public']['Enums']['application_status'];
export type AppRole = Database['public']['Enums']['app_role'];

export interface ApplicationWithDetails {
  id: string;
  student_id: string;
  period_id: string;
  award_type_id: string;
  activity_hours: number | null;
  current_status: ApplicationStatus | null;
  campus_id: string | null;
  achievements: string | null;
  project_name: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  student_profile: {
    first_name: string;
    last_name: string;
    student_code: string | null;
    gpax: number | null;
    department_id: string | null;
    department: {
      id: string;
      dept_name: string;
      faculty_id: string;
      faculty: {
        id: string;
        faculty_name: string;
        campus_id: string | null;
      } | null;
    } | null;
  } | null;
  award_type: {
    type_name: string;
    type_code: string;
    description: string | null;
  } | null;
  academic_period: {
    academic_year: number;
    semester: number;
  } | null;
}

export interface ApproverScope {
  departmentId?: string | null;
  facultyId?: string | null;
  campusId?: string | null;
  roles: AppRole[];
}

// Get applications query with all details
const APPLICATION_SELECT_QUERY = `
  *,
  student_profile:student_profiles!applications_student_id_fkey (
    first_name,
    last_name,
    student_code,
    gpax,
    department_id,
    department:departments!student_profiles_department_id_fkey (
      id,
      dept_name,
      faculty_id,
      faculty:faculties!departments_faculty_id_fkey (
        id,
        faculty_name,
        campus_id
      )
    )
  ),
  award_type:award_types!applications_award_type_id_fkey (
    type_name,
    type_code,
    description
  ),
  academic_period:academic_periods!applications_period_id_fkey (
    academic_year,
    semester
  )
`;

// Fetch pending applications for approval with scope filtering
export async function fetchApprovalApplications(scope: ApproverScope): Promise<ApplicationWithDetails[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(APPLICATION_SELECT_QUERY)
    .not('current_status', 'in', '("draft","approved","rejected")');

  if (error) throw error;

  const applications = data as unknown as ApplicationWithDetails[];
  
  // Filter based on approver's scope and role
  return filterApplicationsByScope(applications, scope);
}

// Filter applications based on approver's role and scope
function filterApplicationsByScope(
  applications: ApplicationWithDetails[],
  scope: ApproverScope
): ApplicationWithDetails[] {
  const { departmentId, facultyId, campusId, roles } = scope;
  
  // System admin can see all
  if (roles.includes('system_admin')) {
    return applications;
  }

  // President, committee_chairman can see all applications in their campus
  if (roles.includes('president') || roles.includes('committee_chairman')) {
    if (!campusId) return applications;
    return applications.filter(app => {
      const appCampusId = app.student_profile?.department?.faculty?.campus_id;
      return appCampusId === campusId;
    });
  }

  // Committee members can see applications in committee_review status at their campus
  if (roles.includes('committee_member')) {
    return applications.filter(app => {
      if (app.current_status !== 'committee_review') return false;
      if (!campusId) return true;
      const appCampusId = app.student_profile?.department?.faculty?.campus_id;
      return appCampusId === campusId;
    });
  }

  // Student affairs can see student_affairs_review status at their campus
  if (roles.includes('student_affairs')) {
    return applications.filter(app => {
      if (app.current_status !== 'student_affairs_review') return false;
      if (!campusId) return true;
      const appCampusId = app.student_profile?.department?.faculty?.campus_id;
      return appCampusId === campusId;
    });
  }

  // Dean/Associate Dean: filter by faculty
  if (roles.includes('dean') || roles.includes('associate_dean')) {
    if (!facultyId) return [];
    return applications.filter(app => {
      // Dean sees faculty_review status
      if (app.current_status !== 'faculty_review' && app.current_status !== 'dept_review') return false;
      const appFacultyId = app.student_profile?.department?.faculty?.id;
      return appFacultyId === facultyId;
    });
  }

  // Department head: filter by department
  if (roles.includes('department_head')) {
    if (!departmentId) return [];
    return applications.filter(app => {
      // Department head sees dept_review status
      if (app.current_status !== 'dept_review') return false;
      const appDeptId = app.student_profile?.department?.id;
      return appDeptId === departmentId;
    });
  }

  return [];
}

// Fetch all applications with optional status filter
export async function fetchApplications(status?: ApplicationStatus): Promise<ApplicationWithDetails[]> {
  let query = supabase
    .from('applications')
    .select(APPLICATION_SELECT_QUERY);

  if (status) {
    query = query.eq('current_status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as ApplicationWithDetails[];
}

// Fetch single application
export async function fetchApplication(id: string): Promise<ApplicationWithDetails> {
  const { data, error } = await supabase
    .from('applications')
    .select(APPLICATION_SELECT_QUERY)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as unknown as ApplicationWithDetails;
}

// Map user role to endorsement type
function getRoleEndorsementType(role: AppRole): string {
  const mapping: Partial<Record<AppRole, string>> = {
    department_head: 'department_head',
    associate_dean: 'associate_dean',
    dean: 'dean',
    student_affairs: 'student_affairs',
    committee_member: 'committee',
    committee_chairman: 'chairman',
    president: 'president',
  };
  return mapping[role] || role;
}

// Get next status after approval
function getNextStatus(currentStatus: ApplicationStatus, isApproved: boolean): ApplicationStatus {
  if (!isApproved) return 'rejected';
  
  const statusFlow: Record<ApplicationStatus, ApplicationStatus> = {
    submitted: 'dept_review',
    dept_review: 'faculty_review',
    faculty_review: 'student_affairs_review',
    student_affairs_review: 'committee_review',
    committee_review: 'chairman_review',
    chairman_review: 'president_review',
    president_review: 'approved',
    draft: 'draft',
    approved: 'approved',
    rejected: 'rejected',
  };
  
  return statusFlow[currentStatus] || currentStatus;
}

// Approve or reject application
export async function approveApplication({
  applicationId,
  isApproved,
  comment,
  userRole,
}: {
  applicationId: string;
  isApproved: boolean;
  comment?: string;
  userRole: AppRole;
}) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้');

  // Get user's internal ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (userError) throw userError;
  const userId = userData.id;

  // Get current application status
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('current_status')
    .eq('id', applicationId)
    .single();

  if (appError) throw appError;

  const currentStatus = application.current_status as ApplicationStatus;
  const newStatus = getNextStatus(currentStatus, isApproved);

  // Create endorsement record
  const { error: endorsementError } = await supabase
    .from('endorsements')
    .insert({
      application_id: applicationId,
      endorser_id: userId,
      endorsement_type: getRoleEndorsementType(userRole),
      is_approved: isApproved,
      comment: comment || null,
      endorsed_at: new Date().toISOString(),
    });

  if (endorsementError) throw endorsementError;

  // Create approval log
  const { error: logError } = await supabase
    .from('approval_logs')
    .insert({
      application_id: applicationId,
      actor_id: userId,
      from_status: currentStatus,
      to_status: newStatus,
      action_type: isApproved ? 'approve' : 'reject',
      comment: comment || null,
    });

  if (logError) throw logError;

  // Update application status
  const { data: updatedApp, error: updateError } = await supabase
    .from('applications')
    .update({
      current_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single();

  if (updateError) throw updateError;

  return updatedApp;
}

// Committee vote
export async function submitCommitteeVote({
  applicationId,
  isAgree,
  comment,
}: {
  applicationId: string;
  isAgree: boolean;
  comment?: string;
}) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้');

  // Get user's internal ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (userError) throw userError;

  // Insert vote
  const { data, error } = await supabase
    .from('committee_votes')
    .insert({
      application_id: applicationId,
      committee_id: userData.id,
      is_agree: isAgree,
      comment: comment || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get application statistics
export async function fetchApplicationStats() {
  const { data, error } = await supabase
    .from('applications')
    .select('current_status');

  if (error) throw error;

  return {
    total: data.length,
    pending: data.filter(
      (a) => a.current_status && !['draft', 'approved', 'rejected'].includes(a.current_status)
    ).length,
    approved: data.filter((a) => a.current_status === 'approved').length,
    rejected: data.filter((a) => a.current_status === 'rejected').length,
  };
}

// Get endorsements for an application
export async function fetchEndorsements(applicationId: string) {
  const { data, error } = await supabase
    .from('endorsements')
    .select(`
      *,
      endorser:users!endorsements_endorser_id_fkey (
        id,
        email
      )
    `)
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}
