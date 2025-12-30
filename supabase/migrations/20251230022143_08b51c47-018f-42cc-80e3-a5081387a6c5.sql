-- ============================================
-- PHASE 1: Role & Permission + Multi-campus
-- ============================================

-- 1. Create campuses table for multi-campus support
CREATE TABLE public.campuses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campus_code TEXT NOT NULL UNIQUE,
    campus_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on campuses
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;

-- Everyone can view campuses
CREATE POLICY "Everyone can view campuses"
ON public.campuses FOR SELECT
USING (true);

-- Admins can manage campuses
CREATE POLICY "Admins can manage campuses"
ON public.campuses FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- 2. Create app_role enum for extended roles
CREATE TYPE public.app_role AS ENUM (
    'student',
    'department_head',
    'associate_dean', 
    'dean',
    'student_affairs',
    'committee_member',
    'committee_chairman',
    'president',
    'system_admin'
);

-- 3. Create user_roles table (separate from users for security)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role, campus_id, faculty_id, department_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Add campus_id to existing tables
ALTER TABLE public.faculties ADD COLUMN campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL;
ALTER TABLE public.applications ADD COLUMN campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL;
ALTER TABLE public.academic_periods ADD COLUMN campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL;

-- 5. Create security definer function for role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_app_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_app_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = ANY(_roles)
    )
$$;

-- Function to get user's campus_id
CREATE OR REPLACE FUNCTION public.get_user_campus_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT campus_id
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Function to check if user can access campus data
CREATE OR REPLACE FUNCTION public.can_access_campus(_user_id UUID, _campus_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND (campus_id = _campus_id OR role = 'system_admin')
    )
$$;

-- 6. RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (user_id = get_user_id(auth.uid()));

CREATE POLICY "System admins can view all roles"
ON public.user_roles FOR SELECT
USING (has_app_role(get_user_id(auth.uid()), 'system_admin'));

CREATE POLICY "System admins can manage roles"
ON public.user_roles FOR ALL
USING (has_app_role(get_user_id(auth.uid()), 'system_admin'));

-- 7. Insert sample campuses
INSERT INTO public.campuses (campus_code, campus_name) VALUES
('BGK', 'วิทยาเขตบางเขน'),
('KPS', 'วิทยาเขตกำแพงแสน'),
('SRC', 'วิทยาเขตศรีราชา'),
('CSC', 'วิทยาเขตเฉลิมพระเกียรติ จ.สกลนคร');

-- 8. Update existing faculties to link to Bangkok campus
UPDATE public.faculties 
SET campus_id = (SELECT id FROM public.campuses WHERE campus_code = 'BGK')
WHERE campus_id IS NULL;