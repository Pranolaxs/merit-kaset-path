import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
};

interface RequestContext {
  supabase: any;
  userId?: string;
  userRole?: string;
  appRoles?: string[];
}

// Parse URL path and query parameters
function parseRequest(req: Request): { 
  path: string[]; 
  query: Record<string, string>;
  method: string;
} {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace('/api/', '').split('/').filter(Boolean);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return { path: pathParts, query, method: req.method };
}

// Authenticate request and get user context
async function authenticate(req: Request): Promise<RequestContext> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const authHeader = req.headers.get('Authorization');
  
  // Create client with auth header if present
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} }
  });

  const context: RequestContext = { supabase };

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getUser(token);
    
    if (!error && data?.user) {
      context.userId = data.user.id;
      
      // Get user info from users table
      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('auth_user_id', data.user.id)
        .single();
      
      if (userData) {
        context.userRole = userData.role;
        
        // Get app roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.id);
        
        context.appRoles = rolesData?.map(r => r.role) || [];
      }
    }
  }

  return context;
}

// JSON response helper
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Error response helper
function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ========== NOMINATIONS HANDLERS ==========

async function getApplications(ctx: RequestContext, query: Record<string, string>): Promise<Response> {
  const { supabase } = ctx;
  
  let queryBuilder = supabase
    .from('applications')
    .select(`
      *,
      award_types(type_code, type_name),
      student:users!applications_student_id_fkey(email),
      academic_periods(academic_year, semester)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (query.status) {
    queryBuilder = queryBuilder.eq('current_status', query.status);
  }
  if (query.award_type_id) {
    queryBuilder = queryBuilder.eq('award_type_id', query.award_type_id);
  }
  if (query.period_id) {
    queryBuilder = queryBuilder.eq('period_id', query.period_id);
  }
  if (query.campus_id) {
    queryBuilder = queryBuilder.eq('campus_id', query.campus_id);
  }

  // Pagination
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '20');
  const offset = (page - 1) * limit;
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error('Error fetching applications:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({
    data,
    pagination: {
      page,
      limit,
      total: count || data?.length || 0,
    },
  });
}

async function getApplicationById(ctx: RequestContext, id: string): Promise<Response> {
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      award_types(*),
      student:users!applications_student_id_fkey(id, email),
      academic_periods(*),
      campuses(*),
      endorsements(*),
      approval_logs(*, actor:users!approval_logs_actor_id_fkey(email)),
      voting_summaries(*),
      committee_votes(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching application:', error);
    return errorResponse('Application not found', 404);
  }

  return jsonResponse(data);
}

async function createApplication(ctx: RequestContext, body: unknown): Promise<Response> {
  const { supabase, userId } = ctx;

  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  // Get user id from users table
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (!userData) {
    return errorResponse('User not found', 404);
  }

  const appData = body as Record<string, unknown>;
  
  const { data, error } = await supabase
    .from('applications')
    .insert({
      student_id: userData.id,
      award_type_id: appData.award_type_id,
      period_id: appData.period_id,
      campus_id: appData.campus_id,
      project_name: appData.project_name,
      description: appData.description,
      achievements: appData.achievements,
      activity_hours: appData.activity_hours,
      current_status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating application:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse(data, 201);
}

async function updateApplication(ctx: RequestContext, id: string, body: unknown): Promise<Response> {
  const { supabase, userId } = ctx;

  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  const appData = body as Record<string, unknown>;
  
  const { data, error } = await supabase
    .from('applications')
    .update({
      ...appData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating application:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse(data);
}

async function deleteApplication(ctx: RequestContext, id: string): Promise<Response> {
  const { supabase, userId } = ctx;

  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting application:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ success: true });
}

// ========== APPROVAL HANDLERS ==========

async function approveApplication(ctx: RequestContext, id: string, body: unknown): Promise<Response> {
  const { supabase, userId, appRoles } = ctx;

  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  // Get user id from users table
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (!userData) {
    return errorResponse('User not found', 404);
  }

  const { action, comment, to_status } = body as { 
    action: 'approve' | 'reject'; 
    comment?: string;
    to_status?: string;
  };

  // Get current application
  const { data: app, error: appError } = await supabase
    .from('applications')
    .select('current_status')
    .eq('id', id)
    .single();

  if (appError || !app) {
    return errorResponse('Application not found', 404);
  }

  // Determine next status based on current status and action
  let nextStatus = to_status;
  if (!nextStatus) {
    const statusFlow: Record<string, { approve: string; reject: string }> = {
      submitted: { approve: 'dept_review', reject: 'rejected' },
      dept_review: { approve: 'faculty_review', reject: 'rejected' },
      faculty_review: { approve: 'student_affairs_review', reject: 'rejected' },
      student_affairs_review: { approve: 'committee_review', reject: 'rejected' },
      committee_review: { approve: 'chairman_review', reject: 'rejected' },
      chairman_review: { approve: 'president_review', reject: 'rejected' },
      president_review: { approve: 'approved', reject: 'rejected' },
    };
    
    const flow = statusFlow[app.current_status as string];
    if (flow) {
      nextStatus = action === 'approve' ? flow.approve : flow.reject;
    }
  }

  if (!nextStatus) {
    return errorResponse('Invalid status transition', 400);
  }

  // Update application status
  const { error: updateError } = await supabase
    .from('applications')
    .update({ 
      current_status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('Error updating application:', updateError);
    return errorResponse(updateError.message, 500);
  }

  // Log the approval action
  const { error: logError } = await supabase
    .from('approval_logs')
    .insert({
      application_id: id,
      actor_id: userData.id,
      action_type: action,
      from_status: app.current_status,
      to_status: nextStatus,
      comment,
    });

  if (logError) {
    console.error('Error logging approval:', logError);
  }

  return jsonResponse({ success: true, new_status: nextStatus });
}

async function submitVote(ctx: RequestContext, id: string, body: unknown): Promise<Response> {
  const { supabase, userId } = ctx;

  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  // Get user id from users table
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (!userData) {
    return errorResponse('User not found', 404);
  }

  const { is_agree, comment } = body as { is_agree: boolean; comment?: string };

  // Insert or update vote
  const { data, error } = await supabase
    .from('committee_votes')
    .upsert({
      application_id: id,
      committee_id: userData.id,
      is_agree,
      comment,
    }, {
      onConflict: 'application_id,committee_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting vote:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse(data);
}

// ========== STATISTICS HANDLERS ==========

async function getStatistics(ctx: RequestContext, query: Record<string, string>): Promise<Response> {
  const { supabase } = ctx;

  // Get total counts by status
  const { data: statusCounts, error: countError } = await supabase
    .from('applications')
    .select('current_status');

  if (countError) {
    console.error('Error fetching statistics:', countError);
    return errorResponse(countError.message, 500);
  }

  const stats = {
    total: statusCounts?.length || 0,
    by_status: {} as Record<string, number>,
    by_award_type: {} as Record<string, number>,
  };

  // Count by status
  statusCounts?.forEach((app: any) => {
    const status = app.current_status || 'unknown';
    stats.by_status[status] = (stats.by_status[status] || 0) + 1;
  });

  // Get counts by award type
  const { data: awardCounts } = await supabase
    .from('applications')
    .select('award_type_id, award_types(type_code)');

  awardCounts?.forEach((app: any) => {
    const typeCode = app.award_types?.type_code || 'unknown';
    stats.by_award_type[typeCode] = (stats.by_award_type[typeCode] || 0) + 1;
  });

  return jsonResponse(stats);
}

async function getAwardTypes(ctx: RequestContext): Promise<Response> {
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from('award_types')
    .select('*')
    .order('type_code');

  if (error) {
    console.error('Error fetching award types:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse(data);
}

async function getAcademicPeriods(ctx: RequestContext): Promise<Response> {
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from('academic_periods')
    .select('*, campuses(*)')
    .order('academic_year', { ascending: false });

  if (error) {
    console.error('Error fetching academic periods:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse(data);
}

async function getCampuses(ctx: RequestContext): Promise<Response> {
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from('campuses')
    .select('*')
    .order('campus_name');

  if (error) {
    console.error('Error fetching campuses:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse(data);
}

async function getVotingSummary(ctx: RequestContext, id: string): Promise<Response> {
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from('voting_summaries')
    .select('*, committee_votes(*)')
    .eq('application_id', id)
    .single();

  if (error) {
    return jsonResponse({ 
      application_id: id,
      total_voters: 0,
      agree_count: 0,
      disagree_count: 0,
      vote_percentage: 0,
    });
  }

  return jsonResponse(data);
}

// ========== MAIN HANDLER ==========

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path, query, method } = parseRequest(req);
    const ctx = await authenticate(req);
    
    console.log(`[API] ${method} /${path.join('/')}`, { query, userId: ctx.userId });

    // Route: /applications
    if (path[0] === 'applications') {
      if (path.length === 1) {
        switch (method) {
          case 'GET':
            return await getApplications(ctx, query);
          case 'POST':
            return await createApplication(ctx, await req.json());
        }
      } else if (path.length === 2) {
        const id = path[1];
        switch (method) {
          case 'GET':
            return await getApplicationById(ctx, id);
          case 'PUT':
          case 'PATCH':
            return await updateApplication(ctx, id, await req.json());
          case 'DELETE':
            return await deleteApplication(ctx, id);
        }
      } else if (path.length === 3) {
        const id = path[1];
        const action = path[2];
        
        if (action === 'approve' && method === 'POST') {
          return await approveApplication(ctx, id, await req.json());
        }
        if (action === 'vote' && method === 'POST') {
          return await submitVote(ctx, id, await req.json());
        }
        if (action === 'voting-summary' && method === 'GET') {
          return await getVotingSummary(ctx, id);
        }
      }
    }

    // Route: /statistics
    if (path[0] === 'statistics' && method === 'GET') {
      return await getStatistics(ctx, query);
    }

    // Route: /award-types
    if (path[0] === 'award-types' && method === 'GET') {
      return await getAwardTypes(ctx);
    }

    // Route: /academic-periods
    if (path[0] === 'academic-periods' && method === 'GET') {
      return await getAcademicPeriods(ctx);
    }

    // Route: /campuses
    if (path[0] === 'campuses' && method === 'GET') {
      return await getCampuses(ctx);
    }

    // Route: /health
    if (path[0] === 'health' && method === 'GET') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
    }

    return errorResponse('Not Found', 404);
  } catch (error) {
    console.error('[API] Error:', error);
    return errorResponse('Internal Server Error', 500);
  }
});
