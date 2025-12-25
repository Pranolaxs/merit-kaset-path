
-- Drop existing tables if needed (careful with data)
DROP TABLE IF EXISTS public.nomination_votes CASCADE;
DROP TABLE IF EXISTS public.nominations CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ==========================================
-- Enums
-- ==========================================
CREATE TYPE public.user_role AS ENUM ('student', 'staff', 'admin');
CREATE TYPE public.personnel_position AS ENUM ('dean', 'associate_dean', 'department_head', 'student_affairs', 'committee_member', 'committee_chairman', 'president');
CREATE TYPE public.application_status AS ENUM ('draft', 'submitted', 'dept_review', 'faculty_review', 'student_affairs_review', 'committee_review', 'chairman_review', 'president_review', 'approved', 'rejected');

-- ==========================================
-- Organization Tables
-- ==========================================
CREATE TABLE public.faculties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_code TEXT NOT NULL UNIQUE,
    faculty_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dept_code TEXT NOT NULL UNIQUE,
    dept_name TEXT NOT NULL,
    faculty_id UUID REFERENCES public.faculties(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- User Management
-- ==========================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    student_code TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id),
    gpax DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.personnel_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    position personnel_position NOT NULL,
    department_id UUID REFERENCES public.departments(id),
    faculty_id UUID REFERENCES public.faculties(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- Master Data
-- ==========================================
CREATE TABLE public.academic_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year INTEGER NOT NULL,
    semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(academic_year, semester)
);

CREATE TABLE public.award_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code TEXT NOT NULL UNIQUE,
    type_name TEXT NOT NULL,
    description TEXT,
    required_docs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- Core Business (Applications)
-- ==========================================
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    period_id UUID REFERENCES public.academic_periods(id) NOT NULL,
    award_type_id UUID REFERENCES public.award_types(id) NOT NULL,
    project_name TEXT,
    description TEXT,
    achievements TEXT,
    activity_hours INTEGER,
    current_status application_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, period_id, award_type_id)
);

CREATE TABLE public.application_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- Workflow & Logs
-- ==========================================
CREATE TABLE public.approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES public.users(id) NOT NULL,
    action_type TEXT NOT NULL,
    from_status application_status,
    to_status application_status,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.committee_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
    committee_id UUID REFERENCES public.users(id) NOT NULL,
    is_agree BOOLEAN NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(application_id, committee_id)
);

-- ==========================================
-- Security Definer Functions
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_user_role(auth_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.users WHERE auth_user_id = auth_id
$$;

CREATE OR REPLACE FUNCTION public.get_personnel_position(auth_id UUID)
RETURNS personnel_position
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT pp.position 
    FROM public.personnel_profiles pp
    JOIN public.users u ON u.id = pp.user_id
    WHERE u.auth_user_id = auth_id
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(auth_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_user_id = auth_id 
        AND role IN ('staff', 'admin')
    )
$$;

CREATE OR REPLACE FUNCTION public.get_user_id(auth_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.users WHERE auth_user_id = auth_id
$$;

-- ==========================================
-- Enable RLS
-- ==========================================
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_votes ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies
-- ==========================================

-- Faculties: Everyone can view
CREATE POLICY "Everyone can view faculties" ON public.faculties FOR SELECT USING (true);
CREATE POLICY "Admins can manage faculties" ON public.faculties FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Departments: Everyone can view
CREATE POLICY "Everyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Users: Own profile or staff/admin can view all
CREATE POLICY "Users can view own record" ON public.users FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "Staff can view all users" ON public.users FOR SELECT USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "System can insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE USING (auth_user_id = auth.uid());

-- Student Profiles
CREATE POLICY "Students can view own profile" ON public.student_profiles FOR SELECT 
    USING (user_id = public.get_user_id(auth.uid()));
CREATE POLICY "Staff can view all student profiles" ON public.student_profiles FOR SELECT 
    USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Students can update own profile" ON public.student_profiles FOR UPDATE 
    USING (user_id = public.get_user_id(auth.uid()));
CREATE POLICY "System can insert student profiles" ON public.student_profiles FOR INSERT WITH CHECK (true);

-- Personnel Profiles
CREATE POLICY "Personnel can view own profile" ON public.personnel_profiles FOR SELECT 
    USING (user_id = public.get_user_id(auth.uid()));
CREATE POLICY "Staff can view all personnel" ON public.personnel_profiles FOR SELECT 
    USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins can manage personnel" ON public.personnel_profiles FOR ALL 
    USING (public.get_user_role(auth.uid()) = 'admin');

-- Academic Periods: Everyone can view
CREATE POLICY "Everyone can view periods" ON public.academic_periods FOR SELECT USING (true);
CREATE POLICY "Admins can manage periods" ON public.academic_periods FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Award Types: Everyone can view
CREATE POLICY "Everyone can view award types" ON public.award_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage award types" ON public.award_types FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Applications
CREATE POLICY "Students can view own applications" ON public.applications FOR SELECT 
    USING (student_id = public.get_user_id(auth.uid()));
CREATE POLICY "Staff can view all applications" ON public.applications FOR SELECT 
    USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Students can create applications" ON public.applications FOR INSERT 
    WITH CHECK (student_id = public.get_user_id(auth.uid()));
CREATE POLICY "Students can update draft applications" ON public.applications FOR UPDATE 
    USING (student_id = public.get_user_id(auth.uid()) AND current_status = 'draft');
CREATE POLICY "Staff can update applications" ON public.applications FOR UPDATE 
    USING (public.is_staff_or_admin(auth.uid()));

-- Application Attachments
CREATE POLICY "View own attachments" ON public.application_attachments FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.applications a 
        WHERE a.id = application_id 
        AND (a.student_id = public.get_user_id(auth.uid()) OR public.is_staff_or_admin(auth.uid()))
    ));
CREATE POLICY "Add attachments to own applications" ON public.application_attachments FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.applications a 
        WHERE a.id = application_id 
        AND a.student_id = public.get_user_id(auth.uid())
        AND a.current_status = 'draft'
    ));

-- Approval Logs
CREATE POLICY "View logs for own applications" ON public.approval_logs FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.applications a 
        WHERE a.id = application_id 
        AND (a.student_id = public.get_user_id(auth.uid()) OR public.is_staff_or_admin(auth.uid()))
    ));
CREATE POLICY "Staff can create logs" ON public.approval_logs FOR INSERT 
    WITH CHECK (public.is_staff_or_admin(auth.uid()) AND actor_id = public.get_user_id(auth.uid()));

-- Committee Votes
CREATE POLICY "View votes for accessible applications" ON public.committee_votes FOR SELECT 
    USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Committee can vote" ON public.committee_votes FOR INSERT 
    WITH CHECK (
        public.is_staff_or_admin(auth.uid()) 
        AND committee_id = public.get_user_id(auth.uid())
    );
CREATE POLICY "Committee can update own vote" ON public.committee_votes FOR UPDATE 
    USING (committee_id = public.get_user_id(auth.uid()));

-- ==========================================
-- Trigger for new user
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Insert into users table
    INSERT INTO public.users (auth_user_id, email, role)
    VALUES (NEW.id, NEW.email, 'student')
    RETURNING id INTO new_user_id;
    
    -- Create student profile
    INSERT INTO public.student_profiles (user_id, first_name, last_name)
    VALUES (
        new_user_id, 
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', NEW.raw_user_meta_data ->> 'full_name', '')
    );
    
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Insert Initial Data
-- ==========================================

-- Award Types
INSERT INTO public.award_types (type_code, type_name, description, required_docs) VALUES
('extracurricular', 'ด้านกิจกรรมเสริมหลักสูตร', 'รางวัลสำหรับนิสิตที่มีผลงานด้านกิจกรรมเสริมหลักสูตรดีเด่น', '["transcript", "activity_certificate"]'::jsonb),
('creativity', 'ด้านความคิดสร้างสรรค์และนวัตกรรม', 'รางวัลสำหรับนิสิตที่มีผลงานด้านนวัตกรรมดีเด่น', '["transcript", "project_report"]'::jsonb),
('good_conduct', 'ด้านความประพฤติดี', 'รางวัลสำหรับนิสิตที่มีความประพฤติดีเด่น', '["transcript", "recommendation_letter"]'::jsonb);

-- Sample Academic Period
INSERT INTO public.academic_periods (academic_year, semester, start_date, end_date, is_active) VALUES
(2567, 1, '2024-06-01', '2024-10-31', true),
(2567, 2, '2024-11-01', '2025-03-31', false);
