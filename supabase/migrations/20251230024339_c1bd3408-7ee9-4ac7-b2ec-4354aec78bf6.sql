-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error
    related_application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = get_user_id(auth.uid()));

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = get_user_id(auth.uid()));

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (user_id = get_user_id(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create storage bucket for application documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-documents',
    'application-documents',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for application documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'application-documents' AND
    (storage.foldername(name))[1] = get_user_id(auth.uid())::text
);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'application-documents' AND
    (
        (storage.foldername(name))[1] = get_user_id(auth.uid())::text OR
        is_staff_or_admin(auth.uid())
    )
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'application-documents' AND
    (storage.foldername(name))[1] = get_user_id(auth.uid())::text
);

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_application_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, related_application_id)
    VALUES (p_user_id, p_title, p_message, p_type, p_application_id)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- Function to notify approvers when application moves to their review stage
CREATE OR REPLACE FUNCTION public.notify_next_approvers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_approver RECORD;
    v_student_name TEXT;
    v_award_name TEXT;
    v_required_role app_role;
BEGIN
    -- Only trigger on status change
    IF OLD.current_status = NEW.current_status THEN
        RETURN NEW;
    END IF;
    
    -- Get student name and award type
    SELECT sp.first_name || ' ' || sp.last_name INTO v_student_name
    FROM public.student_profiles sp
    JOIN public.users u ON u.id = sp.user_id
    WHERE u.id = NEW.student_id;
    
    SELECT at.type_name INTO v_award_name
    FROM public.award_types at
    WHERE at.id = NEW.award_type_id;
    
    -- Determine required role based on new status
    CASE NEW.current_status
        WHEN 'dept_review' THEN v_required_role := 'department_head';
        WHEN 'faculty_review' THEN v_required_role := 'dean';
        WHEN 'student_affairs_review' THEN v_required_role := 'student_affairs';
        WHEN 'committee_review' THEN v_required_role := 'committee_member';
        WHEN 'chairman_review' THEN v_required_role := 'committee_chairman';
        WHEN 'president_review' THEN v_required_role := 'president';
        ELSE v_required_role := NULL;
    END CASE;
    
    -- Notify approvers with the required role
    IF v_required_role IS NOT NULL THEN
        FOR v_approver IN 
            SELECT DISTINCT ur.user_id 
            FROM public.user_roles ur
            WHERE ur.role = v_required_role
            AND (ur.campus_id = NEW.campus_id OR ur.campus_id IS NULL)
        LOOP
            PERFORM public.create_notification(
                v_approver.user_id,
                'ใบสมัครรอพิจารณา',
                'ใบสมัคร ' || v_award_name || ' ของ ' || v_student_name || ' รอการพิจารณาของท่าน',
                'info',
                NEW.id
            );
        END LOOP;
    END IF;
    
    -- Notify student about status change
    PERFORM public.create_notification(
        NEW.student_id,
        CASE NEW.current_status
            WHEN 'approved' THEN 'ใบสมัครได้รับอนุมัติ'
            WHEN 'rejected' THEN 'ใบสมัครไม่ผ่านการพิจารณา'
            ELSE 'สถานะใบสมัครอัปเดต'
        END,
        CASE NEW.current_status
            WHEN 'approved' THEN 'ยินดีด้วย! ใบสมัคร ' || v_award_name || ' ของคุณได้รับการอนุมัติแล้ว'
            WHEN 'rejected' THEN 'ใบสมัคร ' || v_award_name || ' ของคุณไม่ผ่านการพิจารณา'
            ELSE 'ใบสมัคร ' || v_award_name || ' ของคุณถูกส่งต่อเพื่อพิจารณาในขั้นตอนถัดไป'
        END,
        CASE NEW.current_status
            WHEN 'approved' THEN 'success'
            WHEN 'rejected' THEN 'error'
            ELSE 'info'
        END,
        NEW.id
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger for auto-notifications
CREATE TRIGGER trigger_notify_approvers
AFTER UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_next_approvers();