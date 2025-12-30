import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole, UserRole, Campus } from '@/types/roles';

interface UseUserRolesReturn {
  userRoles: UserRole[];
  allRoles: UserRole[];
  campuses: Campus[];
  loading: boolean;
  error: string | null;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isSystemAdmin: boolean;
  canAccessCampus: (campusId: string) => boolean;
  assignRole: (userId: string, role: AppRole, campusId?: string, facultyId?: string, departmentId?: string) => Promise<boolean>;
  removeRole: (roleId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useUserRoles(): UseUserRolesReturn {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [allRoles, setAllRoles] = useState<UserRole[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampuses = useCallback(async () => {
    const { data, error } = await supabase
      .from('campuses')
      .select('*')
      .order('campus_code');
    
    if (error) throw error;
    setCampuses(data || []);
  }, []);

  const fetchUserRoles = useCallback(async () => {
    if (!user) {
      setUserRoles([]);
      return;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        campus:campuses(id, campus_name),
        faculty:faculties(id, faculty_name),
        department:departments(id, dept_name)
      `)
      .eq('user_id', user.id);

    if (error) throw error;
    setUserRoles((data as unknown as UserRole[]) || []);
  }, [user]);

  const fetchAllRoles = useCallback(async () => {
    const isAdmin = userRoles.some(r => r.role === 'system_admin');
    if (!isAdmin) {
      setAllRoles([]);
      return;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        campus:campuses(id, campus_name),
        faculty:faculties(id, faculty_name),
        department:departments(id, dept_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setAllRoles((data as unknown as UserRole[]) || []);
  }, [userRoles]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchCampuses();
      await fetchUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  }, [fetchCampuses, fetchUserRoles]);

  useEffect(() => {
    refetch();
  }, [user]);

  useEffect(() => {
    if (userRoles.length > 0) {
      fetchAllRoles();
    }
  }, [userRoles, fetchAllRoles]);

  const hasRole = useCallback((role: AppRole): boolean => {
    return userRoles.some(r => r.role === role);
  }, [userRoles]);

  const hasAnyRole = useCallback((roles: AppRole[]): boolean => {
    return userRoles.some(r => roles.includes(r.role));
  }, [userRoles]);

  const isSystemAdmin = userRoles.some(r => r.role === 'system_admin');

  const canAccessCampus = useCallback((campusId: string): boolean => {
    if (isSystemAdmin) return true;
    return userRoles.some(r => r.campus_id === campusId);
  }, [userRoles, isSystemAdmin]);

  const assignRole = useCallback(async (
    userId: string, 
    role: AppRole, 
    campusId?: string, 
    facultyId?: string, 
    departmentId?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          campus_id: campusId || null,
          faculty_id: facultyId || null,
          department_id: departmentId || null,
        });

      if (error) throw error;
      await refetch();
      return true;
    } catch (err) {
      console.error('Error assigning role:', err);
      return false;
    }
  }, [refetch]);

  const removeRole = useCallback(async (roleId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      await refetch();
      return true;
    } catch (err) {
      console.error('Error removing role:', err);
      return false;
    }
  }, [refetch]);

  return {
    userRoles,
    allRoles,
    campuses,
    loading,
    error,
    hasRole,
    hasAnyRole,
    isSystemAdmin,
    canAccessCampus,
    assignRole,
    removeRole,
    refetch,
  };
}
