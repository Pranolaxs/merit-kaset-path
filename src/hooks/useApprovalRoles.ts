import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/roles';
import { canReviewAtStatus, ALL_APPROVER_ROLES } from '@/types/workflow';
import type { WorkflowStatus } from '@/types/workflow';

interface UserRoleData {
  role: AppRole;
  campus_id: string | null;
  faculty_id: string | null;
  department_id: string | null;
}

interface UseApprovalRolesReturn {
  userRoles: UserRoleData[];
  approverRoles: AppRole[];
  loading: boolean;
  canReview: (status: WorkflowStatus) => boolean;
  canReviewApplication: (status: WorkflowStatus, appCampusId?: string, appFacultyId?: string, appDeptId?: string) => boolean;
  isCommitteeMember: boolean;
  isSystemAdmin: boolean;
  refetch: () => Promise<void>;
}

export function useApprovalRoles(): UseApprovalRolesReturn {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRoleData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setUserRoles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, campus_id, faculty_id, department_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserRoles((data as UserRoleData[]) || []);
    } catch (err) {
      console.error('Error fetching user roles:', err);
      setUserRoles([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Get only approver roles the user has
  const approverRoles = userRoles
    .map(r => r.role)
    .filter(role => ALL_APPROVER_ROLES.includes(role));

  // Check if user can review based on status
  const canReview = useCallback((status: WorkflowStatus): boolean => {
    const roles = userRoles.map(r => r.role);
    return canReviewAtStatus(roles, status);
  }, [userRoles]);

  // Check if user can review specific application (with scope check)
  const canReviewApplication = useCallback((
    status: WorkflowStatus,
    appCampusId?: string,
    appFacultyId?: string,
    appDeptId?: string
  ): boolean => {
    // First check if user has any role that can review this status
    if (!canReview(status)) return false;

    // System admin can review everything
    if (userRoles.some(r => r.role === 'system_admin')) return true;

    // Check scope based on role type
    for (const userRole of userRoles) {
      // Department head: must match department
      if (userRole.role === 'department_head') {
        if (userRole.department_id === appDeptId) return true;
      }
      
      // Associate dean/Dean: must match faculty
      if (userRole.role === 'associate_dean' || userRole.role === 'dean') {
        if (userRole.faculty_id === appFacultyId) return true;
      }

      // Student affairs, committee, chairman, president: must match campus
      if (['student_affairs', 'committee_member', 'committee_chairman', 'president'].includes(userRole.role)) {
        if (!userRole.campus_id || userRole.campus_id === appCampusId) return true;
      }
    }

    return false;
  }, [userRoles, canReview]);

  const isCommitteeMember = userRoles.some(r => r.role === 'committee_member');
  const isSystemAdmin = userRoles.some(r => r.role === 'system_admin');

  return {
    userRoles,
    approverRoles,
    loading,
    canReview,
    canReviewApplication,
    isCommitteeMember,
    isSystemAdmin,
    refetch: fetchRoles,
  };
}
