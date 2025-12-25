-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM (
  'student',
  'department_head',
  'associate_dean', 
  'dean',
  'student_affairs',
  'committee_member',
  'committee_chairman',
  'president'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  student_id TEXT,
  faculty TEXT,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Create nominations table
CREATE TABLE public.nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('extracurricular', 'innovation', 'good_conduct')),
  semester TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  activity_hours INTEGER,
  gpa DECIMAL(3,2),
  description TEXT,
  achievements TEXT,
  files JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table for approval workflow
CREATE TABLE public.nomination_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id UUID REFERENCES public.nominations(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote BOOLEAN NOT NULL,
  role app_role NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (nomination_id, voter_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomination_votes ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
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

-- Create function to check if user has any approver role
CREATE OR REPLACE FUNCTION public.is_approver(_user_id UUID)
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
      AND role IN ('department_head', 'associate_dean', 'dean', 'student_affairs', 'committee_member', 'committee_chairman', 'president')
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for nominations
CREATE POLICY "Students can view own nominations"
  ON public.nominations FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id OR public.is_approver(auth.uid()));

CREATE POLICY "Students can create own nominations"
  ON public.nominations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own pending nominations"
  ON public.nominations FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id AND status = 'pending');

-- RLS Policies for votes
CREATE POLICY "Approvers can view all votes"
  ON public.nomination_votes FOR SELECT
  TO authenticated
  USING (public.is_approver(auth.uid()));

CREATE POLICY "Approvers can insert votes"
  ON public.nomination_votes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approver(auth.uid()) AND auth.uid() = voter_id);

CREATE POLICY "Approvers can update own votes"
  ON public.nomination_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = voter_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Default role is student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate vote percentage
CREATE OR REPLACE FUNCTION public.get_vote_percentage(nomination_uuid UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (COUNT(*) FILTER (WHERE vote = true)::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) * 100
     FROM public.nomination_votes
     WHERE nomination_id = nomination_uuid),
    0
  )
$$;