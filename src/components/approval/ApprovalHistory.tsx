import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, User, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import type { ApprovalLogEntry } from '@/types/workflow';

interface ApprovalHistoryProps {
  applicationId: string;
  refreshTrigger?: number;
}

export function ApprovalHistory({ applicationId, refreshTrigger }: ApprovalHistoryProps) {
  const [logs, setLogs] = useState<ApprovalLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [applicationId, refreshTrigger]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch approval logs with actor info
      const { data: logsData, error } = await supabase
        .from('approval_logs')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch actor info for each log
      const actorIds = logsData?.map(l => l.actor_id).filter(Boolean) || [];
      if (actorIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email')
          .in('id', actorIds);

        const { data: profilesData } = await supabase
          .from('personnel_profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', actorIds);

        const usersMap: Record<string, { email: string }> = {};
        usersData?.forEach(u => { usersMap[u.id] = { email: u.email }; });

        const profilesMap: Record<string, { first_name: string; last_name: string }> = {};
        profilesData?.forEach(p => { profilesMap[p.user_id] = { first_name: p.first_name, last_name: p.last_name }; });

        const logsWithActors = logsData?.map(log => ({
          ...log,
          actor: {
            email: usersMap[log.actor_id]?.email || '',
            personnel_profile: profilesMap[log.actor_id] || null,
          },
        })) || [];

        setLogs(logsWithActors as ApprovalLogEntry[]);
      } else {
        setLogs((logsData || []) as ApprovalLogEntry[]);
      }
    } catch (error) {
      console.error('Error fetching approval logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'approve':
        return <Badge variant="default" className="bg-green-500">อนุมัติ</Badge>;
      case 'reject':
        return <Badge variant="destructive">ไม่อนุมัติ</Badge>;
      case 'vote':
        return <Badge variant="secondary">ลงคะแนน</Badge>;
      case 'submit':
        return <Badge variant="outline">ส่งใบสมัคร</Badge>;
      case 'return':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">ส่งกลับแก้ไข</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getActorName = (log: ApprovalLogEntry) => {
    if (log.actor?.personnel_profile) {
      return `${log.actor.personnel_profile.first_name} ${log.actor.personnel_profile.last_name}`;
    }
    return log.actor?.email?.split('@')[0] || 'ไม่ทราบ';
  };

  const displayLogs = expanded ? logs : logs.slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        ยังไม่มีประวัติการดำเนินการ
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Clock className="h-4 w-4" />
        ประวัติการดำเนินการ
      </h4>

      <div className="space-y-2">
        {displayLogs.map((log, index) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
          >
            <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{getActorName(log)}</span>
                {getActionBadge(log.action_type)}
              </div>
              {log.comment && (
                <div className="flex items-start gap-1 mt-1">
                  <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{log.comment}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(log.created_at), 'd MMM yyyy HH:mm', { locale: th })}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {logs.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              แสดงน้อยลง
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              ดูทั้งหมด ({logs.length} รายการ)
            </>
          )}
        </Button>
      )}
    </div>
  );
}
