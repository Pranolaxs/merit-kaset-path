import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchApprovalApplications,
  fetchApplications,
  fetchApplication,
  approveApplication,
  submitCommitteeVote,
  fetchApplicationStats,
  fetchEndorsements,
  type ApplicationStatus,
  type AppRole,
  type ApplicationWithDetails,
  type ApproverScope,
} from '@/lib/services/applications';

export type { ApplicationWithDetails, ApplicationStatus, AppRole };

// Fetch pending applications for approval with scope filtering
export function useApprovalApplications() {
  const { userProfile, appRoles } = useAuth();
  
  return useQuery({
    queryKey: ['approval-applications', userProfile?.departmentId, userProfile?.facultyId],
    queryFn: async () => {
      const scope: ApproverScope = {
        departmentId: userProfile?.departmentId,
        facultyId: userProfile?.facultyId,
        campusId: userProfile?.campusId,
        roles: appRoles,
      };
      return fetchApprovalApplications(scope);
    },
    enabled: !!userProfile,
  });
}

// Fetch all applications
export function useApplications(status?: ApplicationStatus) {
  return useQuery({
    queryKey: ['applications', status],
    queryFn: () => fetchApplications(status),
  });
}

// Fetch single application
export function useApplication(id: string) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => fetchApplication(id),
    enabled: !!id,
  });
}

// Approve or reject application
export function useApproveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveApplication,
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
    mutationFn: submitCommitteeVote,
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
    queryFn: fetchApplicationStats,
  });
}

// Get endorsements for an application
export function useEndorsements(applicationId: string) {
  return useQuery({
    queryKey: ['endorsements', applicationId],
    queryFn: () => fetchEndorsements(applicationId),
    enabled: !!applicationId,
  });
}
