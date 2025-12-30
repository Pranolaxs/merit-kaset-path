-- ============================================
-- PHASE 3: Committee Voting & Digital Endorsement
-- ============================================

-- 1. Create committee_assignments table for managing committee members per period
CREATE TABLE public.committee_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL CHECK (role IN ('committee_member', 'committee_chairman')),
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (period_id, user_id, campus_id)
);

-- Enable RLS
ALTER TABLE public.committee_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view committee assignments"
ON public.committee_assignments FOR SELECT
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "System admins can manage committee assignments"
ON public.committee_assignments FOR ALL
USING (has_app_role(get_user_id(auth.uid()), 'system_admin'));

-- 2. Create endorsements table for digital signatures
CREATE TABLE public.endorsements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    endorser_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endorsement_type TEXT NOT NULL CHECK (endorsement_type IN ('chairman_approval', 'president_approval', 'committee_result')),
    signature_data TEXT, -- For digital signature or uploaded file path
    is_approved BOOLEAN NOT NULL,
    comment TEXT,
    endorsed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (application_id, endorsement_type)
);

-- Enable RLS
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view endorsements"
ON public.endorsements FOR SELECT
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Authorized users can create endorsements"
ON public.endorsements FOR INSERT
WITH CHECK (
    is_staff_or_admin(auth.uid()) AND
    endorser_id = get_user_id(auth.uid())
);

-- 3. Create voting_summaries table for storing aggregated vote results
CREATE TABLE public.voting_summaries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE UNIQUE,
    total_voters INTEGER NOT NULL DEFAULT 0,
    agree_count INTEGER NOT NULL DEFAULT 0,
    disagree_count INTEGER NOT NULL DEFAULT 0,
    vote_percentage NUMERIC(5,2) DEFAULT 0,
    is_passed BOOLEAN DEFAULT false,
    voting_closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voting_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view voting summaries"
ON public.voting_summaries FOR SELECT
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "System can manage voting summaries"
ON public.voting_summaries FOR ALL
USING (is_staff_or_admin(auth.uid()));

-- 4. Create function to calculate and update voting summary
CREATE OR REPLACE FUNCTION public.update_voting_summary(app_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER;
    v_agree INTEGER;
    v_disagree INTEGER;
    v_percentage NUMERIC(5,2);
    v_passed BOOLEAN;
BEGIN
    -- Count votes
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_agree = true),
        COUNT(*) FILTER (WHERE is_agree = false)
    INTO v_total, v_agree, v_disagree
    FROM public.committee_votes
    WHERE application_id = app_id;
    
    -- Calculate percentage
    IF v_total > 0 THEN
        v_percentage := ROUND((v_agree::NUMERIC / v_total::NUMERIC) * 100, 2);
    ELSE
        v_percentage := 0;
    END IF;
    
    -- Check if passed (more than 50%)
    v_passed := v_percentage > 50;
    
    -- Upsert voting summary
    INSERT INTO public.voting_summaries (application_id, total_voters, agree_count, disagree_count, vote_percentage, is_passed)
    VALUES (app_id, v_total, v_agree, v_disagree, v_percentage, v_passed)
    ON CONFLICT (application_id) 
    DO UPDATE SET
        total_voters = v_total,
        agree_count = v_agree,
        disagree_count = v_disagree,
        vote_percentage = v_percentage,
        is_passed = v_passed,
        updated_at = now();
END;
$$;

-- 5. Create trigger to auto-update voting summary when votes change
CREATE OR REPLACE FUNCTION public.trigger_update_voting_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.update_voting_summary(OLD.application_id);
        RETURN OLD;
    ELSE
        PERFORM public.update_voting_summary(NEW.application_id);
        RETURN NEW;
    END IF;
END;
$$;

CREATE TRIGGER on_committee_vote_change
    AFTER INSERT OR UPDATE OR DELETE ON public.committee_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_voting_summary();

-- 6. Function to close voting and move to next step
CREATE OR REPLACE FUNCTION public.close_voting_and_proceed(app_id UUID, closer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_summary RECORD;
    v_next_status TEXT;
BEGIN
    -- Get voting summary
    SELECT * INTO v_summary FROM public.voting_summaries WHERE application_id = app_id;
    
    IF v_summary IS NULL THEN
        PERFORM public.update_voting_summary(app_id);
        SELECT * INTO v_summary FROM public.voting_summaries WHERE application_id = app_id;
    END IF;
    
    -- Update summary with close info
    UPDATE public.voting_summaries
    SET voting_closed_at = now(), closed_by = closer_id
    WHERE application_id = app_id;
    
    -- Determine next status based on vote result
    IF v_summary.is_passed THEN
        v_next_status := 'chairman_review';
    ELSE
        v_next_status := 'rejected';
    END IF;
    
    -- Update application status
    UPDATE public.applications
    SET current_status = v_next_status
    WHERE id = app_id;
    
    -- Log the action
    INSERT INTO public.approval_logs (application_id, actor_id, action_type, from_status, to_status, comment)
    VALUES (app_id, closer_id, 'vote_closed', 'committee_review', v_next_status, 
            'ปิดการโหวต - ผลโหวต: ' || v_summary.agree_count || '/' || v_summary.total_voters || 
            ' (' || v_summary.vote_percentage || '%) - ' || 
            CASE WHEN v_summary.is_passed THEN 'ผ่าน' ELSE 'ไม่ผ่าน' END);
    
    RETURN v_summary.is_passed;
END;
$$;