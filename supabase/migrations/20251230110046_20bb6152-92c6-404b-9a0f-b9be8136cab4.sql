-- Create helper function to check if user can access records for a specific campus
-- Returns true if:
-- 1. User is system_admin (can access all)
-- 2. User has a role assignment for that campus
-- 3. User has a role with NULL campus_id (can access all campuses for that role)
CREATE OR REPLACE FUNCTION public.can_access_data_for_campus(_user_id uuid, _campus_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = 'system_admin'
        OR campus_id = _campus_id
        OR campus_id IS NULL
      )
  )
$$;

-- Create helper function to get all accessible campus IDs for a user
CREATE OR REPLACE FUNCTION public.get_accessible_campus_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT c.id
  FROM public.campuses c
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        ur.role = 'system_admin'
        OR ur.campus_id = c.id
        OR ur.campus_id IS NULL
      )
  )
$$;

-- Create helper function to check if user can access records for a specific department
CREATE OR REPLACE FUNCTION public.can_access_data_for_department(_user_id uuid, _dept_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        ur.role = 'system_admin'
        -- User has campus-level access (can see all departments in their campus)
        OR (ur.department_id IS NULL AND ur.faculty_id IS NULL AND ur.campus_id IN (
          SELECT f.campus_id FROM public.faculties f
          JOIN public.departments d ON d.faculty_id = f.id
          WHERE d.id = _dept_id
        ))
        -- User has faculty-level access (can see all departments in their faculty)
        OR (ur.department_id IS NULL AND ur.faculty_id IN (
          SELECT d.faculty_id FROM public.departments d WHERE d.id = _dept_id
        ))
        -- User has exact department access
        OR ur.department_id = _dept_id
      )
  )
$$;

-- Drop existing overly permissive policies and create scoped ones

-- USERS TABLE: Replace broad staff access with scoped access
DROP POLICY IF EXISTS "Staff can view all users" ON public.users;

CREATE POLICY "Staff can view scoped users"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
  OR has_app_role(get_user_id(auth.uid()), 'system_admin')
  OR EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.departments d ON d.id = sp.department_id
    JOIN public.faculties f ON f.id = d.faculty_id
    WHERE sp.user_id = users.id
      AND can_access_data_for_campus(get_user_id(auth.uid()), f.campus_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.personnel_profiles pp
    JOIN public.faculties f ON f.id = pp.faculty_id
    WHERE pp.user_id = users.id
      AND can_access_data_for_campus(get_user_id(auth.uid()), f.campus_id)
  )
);

-- STUDENT_PROFILES TABLE: Replace broad staff access with campus-scoped access
DROP POLICY IF EXISTS "Staff can view all student profiles" ON public.student_profiles;

CREATE POLICY "Staff can view scoped student profiles"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (
  user_id = get_user_id(auth.uid())
  OR has_app_role(get_user_id(auth.uid()), 'system_admin')
  OR (
    is_staff_or_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.departments d
      JOIN public.faculties f ON f.id = d.faculty_id
      WHERE d.id = student_profiles.department_id
        AND can_access_data_for_campus(get_user_id(auth.uid()), f.campus_id)
    )
  )
);

-- APPLICATIONS TABLE: Replace broad staff access with campus-scoped access
DROP POLICY IF EXISTS "Staff can view all applications" ON public.applications;

CREATE POLICY "Staff can view scoped applications"
ON public.applications
FOR SELECT
TO authenticated
USING (
  student_id = get_user_id(auth.uid())
  OR has_app_role(get_user_id(auth.uid()), 'system_admin')
  OR (
    is_staff_or_admin(auth.uid())
    AND can_access_data_for_campus(get_user_id(auth.uid()), campus_id)
  )
);

-- Update staff update policy for applications to be campus-scoped
DROP POLICY IF EXISTS "Staff can update applications" ON public.applications;

CREATE POLICY "Staff can update scoped applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (
  has_app_role(get_user_id(auth.uid()), 'system_admin')
  OR (
    is_staff_or_admin(auth.uid())
    AND can_access_data_for_campus(get_user_id(auth.uid()), campus_id)
  )
);

-- PERSONNEL_PROFILES TABLE: Replace broad staff access with campus-scoped access
DROP POLICY IF EXISTS "Staff can view all personnel" ON public.personnel_profiles;

CREATE POLICY "Staff can view scoped personnel"
ON public.personnel_profiles
FOR SELECT
TO authenticated
USING (
  user_id = get_user_id(auth.uid())
  OR has_app_role(get_user_id(auth.uid()), 'system_admin')
  OR (
    is_staff_or_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.faculties f
      WHERE f.id = personnel_profiles.faculty_id
        AND can_access_data_for_campus(get_user_id(auth.uid()), f.campus_id)
    )
  )
);

-- COMMITTEE_VOTES TABLE: Add campus-scoped access
DROP POLICY IF EXISTS "View votes for accessible applications" ON public.committee_votes;

CREATE POLICY "View votes for scoped applications"
ON public.committee_votes
FOR SELECT
TO authenticated
USING (
  has_app_role(get_user_id(auth.uid()), 'system_admin')
  OR (
    is_staff_or_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = committee_votes.application_id
        AND can_access_data_for_campus(get_user_id(auth.uid()), a.campus_id)
    )
  )
);

-- ENDORSEMENTS TABLE: Add campus-scoped access
DROP POLICY IF EXISTS "Staff can view endorsements" ON public.endorsements;

CREATE POLICY "Staff can view scoped endorsements"
ON public.endorsements
FOR SELECT
TO authenticated
USING (
  has_app_role(get_user_id(auth.uid()), 'system_admin')
  OR (
    is_staff_or_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = endorsements.application_id
        AND can_access_data_for_campus(get_user_id(auth.uid()), a.campus_id)
    )
  )
);

-- VOTING_SUMMARIES TABLE: Add campus-scoped access
DROP POLICY IF EXISTS "Staff can view voting summaries" ON public.voting_summaries;

CREATE POLICY "Staff can view scoped voting summaries"
ON public.voting_summaries
FOR SELECT
TO authenticated
USING (
  has_app_role(get_user_id(auth.uid()), 'system_admin')
  OR (
    is_staff_or_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = voting_summaries.application_id
        AND can_access_data_for_campus(get_user_id(auth.uid()), a.campus_id)
    )
  )
);

-- APPROVAL_LOGS TABLE: Ensure campus-scoped access
DROP POLICY IF EXISTS "View logs for own applications" ON public.approval_logs;

CREATE POLICY "View logs for accessible applications"
ON public.approval_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = approval_logs.application_id
      AND (
        a.student_id = get_user_id(auth.uid())
        OR has_app_role(get_user_id(auth.uid()), 'system_admin')
        OR (is_staff_or_admin(auth.uid()) AND can_access_data_for_campus(get_user_id(auth.uid()), a.campus_id))
      )
  )
);

-- APPLICATION_ATTACHMENTS TABLE: Ensure campus-scoped access
DROP POLICY IF EXISTS "View own attachments" ON public.application_attachments;

CREATE POLICY "View accessible attachments"
ON public.application_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_attachments.application_id
      AND (
        a.student_id = get_user_id(auth.uid())
        OR has_app_role(get_user_id(auth.uid()), 'system_admin')
        OR (is_staff_or_admin(auth.uid()) AND can_access_data_for_campus(get_user_id(auth.uid()), a.campus_id))
      )
  )
);