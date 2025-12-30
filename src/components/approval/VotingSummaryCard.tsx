import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ThumbsUp, ThumbsDown, Lock, Check, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useApprovalRoles } from '@/hooks/useApprovalRoles';

interface VotingSummary {
  total_voters: number;
  agree_count: number;
  disagree_count: number;
  vote_percentage: number;
  is_passed: boolean;
  voting_closed_at: string | null;
}

interface CommitteeVote {
  id: string;
  committee_id: string;
  is_agree: boolean;
  comment: string | null;
  committee?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface VotingSummaryCardProps {
  applicationId: string;
  currentStatus: string;
  onVotingClosed?: () => void;
}

export function VotingSummaryCard({ applicationId, currentStatus, onVotingClosed }: VotingSummaryCardProps) {
  const { user } = useAuth();
  const { approverRoles } = useApprovalRoles();
  const [summary, setSummary] = useState<VotingSummary | null>(null);
  const [votes, setVotes] = useState<CommitteeVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const isChairman = approverRoles.includes('committee_chairman');
  const isCommitteeReview = currentStatus === 'committee_review';

  useEffect(() => {
    fetchVotingData();
  }, [applicationId]);

  const fetchVotingData = async () => {
    setLoading(true);
    try {
      // Fetch voting summary
      const { data: summaryData } = await supabase
        .from('voting_summaries')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle();

      setSummary(summaryData);

      // Fetch individual votes
      const { data: votesData } = await supabase
        .from('committee_votes')
        .select('*')
        .eq('application_id', applicationId);

      if (votesData && votesData.length > 0) {
        // Fetch committee member info
        const committeeIds = votesData.map(v => v.committee_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email')
          .in('id', committeeIds);

        const { data: profilesData } = await supabase
          .from('personnel_profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', committeeIds);

        const usersMap: Record<string, { email: string }> = {};
        usersData?.forEach(u => { usersMap[u.id] = { email: u.email }; });

        const profilesMap: Record<string, { first_name: string; last_name: string }> = {};
        profilesData?.forEach(p => { profilesMap[p.user_id] = p; });

        const votesWithUsers = votesData.map(v => ({
          ...v,
          committee: {
            email: usersMap[v.committee_id]?.email || '',
            ...profilesMap[v.committee_id],
          },
        }));

        setVotes(votesWithUsers);
      } else {
        setVotes([]);
      }
    } catch (error) {
      console.error('Error fetching voting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseVoting = async () => {
    if (!user) return;
    setClosing(true);

    try {
      // Call the database function to close voting
      const { data, error } = await supabase.rpc('close_voting_and_proceed', {
        app_id: applicationId,
        closer_id: user.id,
      });

      if (error) throw error;

      toast.success(data ? 'ปิดการโหวต - ผ่านการพิจารณา' : 'ปิดการโหวต - ไม่ผ่านการพิจารณา');
      setCloseDialogOpen(false);
      await fetchVotingData();
      onVotingClosed?.();
    } catch (error) {
      console.error('Error closing voting:', error);
      toast.error('เกิดข้อผิดพลาดในการปิดการโหวต');
    } finally {
      setClosing(false);
    }
  };

  const getVoterName = (vote: CommitteeVote) => {
    if (vote.committee?.first_name && vote.committee?.last_name) {
      return `${vote.committee.first_name} ${vote.committee.last_name}`;
    }
    return vote.committee?.email?.split('@')[0] || 'ไม่ทราบ';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displaySummary = summary || {
    total_voters: votes.length,
    agree_count: votes.filter(v => v.is_agree).length,
    disagree_count: votes.filter(v => !v.is_agree).length,
    vote_percentage: votes.length > 0 ? Math.round((votes.filter(v => v.is_agree).length / votes.length) * 100) : 0,
    is_passed: votes.length > 0 && (votes.filter(v => v.is_agree).length / votes.length) > 0.5,
    voting_closed_at: null,
  };

  const isClosed = !!displaySummary.voting_closed_at;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5" />
          ผลการโหวตคณะกรรมการ
          {isClosed && (
            <Badge variant="outline" className="ml-auto">
              <Lock className="h-3 w-3 mr-1" />
              ปิดแล้ว
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{displaySummary.total_voters}</div>
            <div className="text-xs text-muted-foreground">ลงคะแนน</div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{displaySummary.agree_count}</div>
            <div className="text-xs text-muted-foreground">เห็นชอบ</div>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{displaySummary.disagree_count}</div>
            <div className="text-xs text-muted-foreground">ไม่เห็นชอบ</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">คะแนนเห็นชอบ</span>
            <span className={displaySummary.is_passed ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
              {displaySummary.vote_percentage}%
            </span>
          </div>
          <Progress 
            value={displaySummary.vote_percentage} 
            className={`h-3 ${displaySummary.is_passed ? '[&>div]:bg-green-500' : ''}`}
          />
          <div className="flex items-center gap-2 text-sm">
            {displaySummary.is_passed ? (
              <Badge variant="default" className="bg-green-500">
                <Check className="h-3 w-3 mr-1" />
                ผ่านเกณฑ์ (&gt;50%)
              </Badge>
            ) : displaySummary.total_voters > 0 ? (
              <Badge variant="destructive">
                <X className="h-3 w-3 mr-1" />
                ไม่ผ่านเกณฑ์
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                ยังไม่มีการโหวต
              </Badge>
            )}
          </div>
        </div>

        {/* Individual Votes */}
        {votes.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-muted-foreground">รายการโหวต</h5>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {votes.map((vote, index) => (
                <motion.div
                  key={vote.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded"
                >
                  <span className="text-sm">{getVoterName(vote)}</span>
                  <div className="flex items-center gap-2">
                    {vote.is_agree ? (
                      <Badge variant="default" className="bg-green-500">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        เห็นชอบ
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        ไม่เห็นชอบ
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Close Voting Button (Chairman only) */}
        {isChairman && isCommitteeReview && !isClosed && votes.length > 0 && (
          <Button
            onClick={() => setCloseDialogOpen(true)}
            className="w-full"
            variant="outline"
          >
            <Lock className="h-4 w-4 mr-2" />
            ปิดการโหวตและดำเนินการต่อ
          </Button>
        )}

        {/* Close Voting Dialog */}
        <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ยืนยันปิดการโหวต</DialogTitle>
              <DialogDescription>
                เมื่อปิดการโหวตแล้ว จะไม่สามารถลงคะแนนเพิ่มเติมได้
                {displaySummary.is_passed 
                  ? ' และใบสมัครจะถูกส่งต่อให้ประธานพิจารณา'
                  : ' และใบสมัครจะถูกปฏิเสธเนื่องจากไม่ผ่านเกณฑ์'}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {displaySummary.agree_count}/{displaySummary.total_voters}
                </div>
                <div className="text-muted-foreground">
                  ({displaySummary.vote_percentage}%) - {displaySummary.is_passed ? 'ผ่าน' : 'ไม่ผ่าน'}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCloseDialogOpen(false)} disabled={closing}>
                ยกเลิก
              </Button>
              <Button onClick={handleCloseVoting} disabled={closing}>
                {closing ? 'กำลังดำเนินการ...' : 'ยืนยันปิดการโหวต'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
