-- Update handle_new_user function to also add student role to user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    
    -- Add student role to user_roles table (required for ProtectedRoute)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'student');
    
    RETURN NEW;
END;
$function$;

-- Also add student role for existing users who don't have it
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'student'::app_role
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
WHERE u.role = 'student' AND ur.id IS NULL;