import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ApplicationStatus = Database['public']['Enums']['application_status'];
type AppRole = Database['public']['Enums']['app_role'];

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
    department: {
      dept_name: string;
      faculty: {
        faculty_name: string;
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

// Fetch pending applications for approval
export function useApprovalApplications() {
  return useQuery({
    queryKey: ['approval-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          student_profile:student_profiles!applications_student_id_fkey (
            first_name,
            last_name,
            student_code,
            gpax,
            department:departments!student_profiles_department_id_fkey (
              dept_name,
              faculty:faculties!departments_faculty_id_fkey (
                faculty_name
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
        `)
        .not('current_status', 'in', '("draft","approved","rejected")');

      if (error) throw error;
      return data as unknown as ApplicationWithDetails[];
    },
  });
}

// Fetch all applications
export function useApplications(status?: ApplicationStatus) {
  return useQuery({
    queryKey: ['applications', status],
    queryFn: async () => {
      let query = supabase
        .from('applications')
        .select(`
          *,
          student_profile:student_profiles!applications_student_id_fkey (
            first_name,
            last_name,
            student_code,
            gpax,
            department:departments!student_profiles_department_id_fkey (
              dept_name,
              faculty:faculties!departments_faculty_id_fkey (
                faculty_name
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
        `);

      if (status) {
        query = query.eq('current_status', status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ApplicationWithDetails[];
    },
  });
}

// Fetch single application
export function useApplication(id: string) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          student_profile:student_profiles!applications_student_id_fkey (
            first_name,
            last_name,
            student_code,
            gpax,
            department:departments!student_profiles_department_id_fkey (
              dept_name,
              faculty:faculties!departments_faculty_id_fkey (
                faculty_name
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
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as ApplicationWithDetails;
    },
    enabled: !!id,
  });
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
export function useApproveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      isApproved,
      comment,
      userRole,
    }: {
      applicationId: string;
      isApproved: boolean;
      comment?: string;
      userRole: AppRole;
    }) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application-stats'] });
    },
  });
}

// Committee vote
export function useCommitteeVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      isAgree,
      comment,
    }: {
      applicationId: string;
      isAgree: boolean;
      comment?: string;
    }) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['committee-votes'] });
    },
  });
}

// Get application statistics
export function useApplicationStats() {
  return useQuery({
    queryKey: ['application-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('current_status');

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(
          (a) => a.current_status && !['draft', 'approved', 'rejected'].includes(a.current_status)
        ).length,
        approved: data.filter((a) => a.current_status === 'approved').length,
        rejected: data.filter((a) => a.current_status === 'rejected').length,
      };

      return stats;
    },
  });
}

// Get endorsements for an application
export function useEndorsements(applicationId: string) {
  return useQuery({
    queryKey: ['endorsements', applicationId],
    queryFn: async () => {
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
    },
    enabled: !!applicationId,
  });
}
