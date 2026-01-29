import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];
export type UserRole = Database['public']['Enums']['user_role'];
export type PersonnelPosition = Database['public']['Enums']['personnel_position'];

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  departmentId?: string | null;
  facultyId?: string | null;
  campusId?: string | null;
}

export interface PersonnelProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  position: PersonnelPosition;
  departmentId: string | null;
  facultyId: string | null;
  department?: {
    id: string;
    deptName: string;
    faculty: {
      id: string;
      facultyName: string;
      campusId: string | null;
    } | null;
  } | null;
}

// Fetch user profile with department/faculty info
export async function fetchUserProfile(authUserId: string): Promise<UserProfile | null> {
  try {
    // Get user from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('auth_user_id', authUserId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return null;
    }

    let firstName = '';
    let lastName = '';
    let departmentId: string | null = null;
    let facultyId: string | null = null;
    let campusId: string | null = null;

    if (userData.role === 'student') {
      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select(`
          first_name, 
          last_name, 
          department_id,
          department:departments!student_profiles_department_id_fkey (
            id,
            faculty:faculties!departments_faculty_id_fkey (
              id,
              campus_id
            )
          )
        `)
        .eq('user_id', userData.id)
        .single();

      if (studentProfile) {
        firstName = studentProfile.first_name;
        lastName = studentProfile.last_name;
        departmentId = studentProfile.department_id;
        if (studentProfile.department) {
          const dept = studentProfile.department as { id: string; faculty: { id: string; campus_id: string | null } | null };
          facultyId = dept.faculty?.id || null;
          campusId = dept.faculty?.campus_id || null;
        }
      }
    } else {
      const { data: personnelProfile } = await supabase
        .from('personnel_profiles')
        .select(`
          first_name, 
          last_name, 
          department_id,
          faculty_id,
          faculty:faculties!personnel_profiles_faculty_id_fkey (
            id,
            campus_id
          )
        `)
        .eq('user_id', userData.id)
        .single();

      if (personnelProfile) {
        firstName = personnelProfile.first_name;
        lastName = personnelProfile.last_name;
        departmentId = personnelProfile.department_id;
        facultyId = personnelProfile.faculty_id;
        if (personnelProfile.faculty) {
          const faculty = personnelProfile.faculty as { id: string; campus_id: string | null };
          campusId = faculty.campus_id;
        }
      }
    }

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      firstName,
      lastName,
      departmentId,
      facultyId,
      campusId,
    };
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    return null;
  }
}

// Fetch app roles for a user
export async function fetchAppRoles(userId: string): Promise<AppRole[]> {
  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  return rolesData ? rolesData.map(r => r.role) : [];
}

// Fetch personnel profile with department/faculty details
export async function fetchPersonnelProfile(userId: string): Promise<PersonnelProfile | null> {
  const { data, error } = await supabase
    .from('personnel_profiles')
    .select(`
      id,
      user_id,
      first_name,
      last_name,
      position,
      department_id,
      faculty_id,
      department:departments!personnel_profiles_department_id_fkey (
        id,
        dept_name,
        faculty:faculties!departments_faculty_id_fkey (
          id,
          faculty_name,
          campus_id
        )
      )
    `)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  const dept = data.department as {
    id: string;
    dept_name: string;
    faculty: { id: string; faculty_name: string; campus_id: string | null } | null;
  } | null;

  return {
    id: data.id,
    userId: data.user_id,
    firstName: data.first_name,
    lastName: data.last_name,
    position: data.position,
    departmentId: data.department_id,
    facultyId: data.faculty_id,
    department: dept ? {
      id: dept.id,
      deptName: dept.dept_name,
      faculty: dept.faculty ? {
        id: dept.faculty.id,
        facultyName: dept.faculty.faculty_name,
        campusId: dept.faculty.campus_id,
      } : null,
    } : null,
  };
}

// Check if user has completed profile setup (has department/faculty)
export async function checkProfileComplete(userId: string, role: UserRole): Promise<boolean> {
  if (role === 'student') {
    const { data } = await supabase
      .from('student_profiles')
      .select('department_id')
      .eq('user_id', userId)
      .single();
    return !!data?.department_id;
  } else {
    const { data } = await supabase
      .from('personnel_profiles')
      .select('faculty_id')
      .eq('user_id', userId)
      .single();
    return !!data?.faculty_id;
  }
}
