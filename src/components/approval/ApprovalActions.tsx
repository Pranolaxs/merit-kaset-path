import { useState } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { APPROVAL_FLOW } from '@/types/workflow';
import type { WorkflowStatus } from '@/types/workflow';

interface ApprovalActionsProps {
  applicationId: string;
  currentStatus: WorkflowStatus;
  canApprove: boolean;
  canVote: boolean;
  existingVote?: { is_agree: boolean; comment: string | null } | null;
  onActionComplete: () => void;
}

export function ApprovalActions({
  applicationId,
  currentStatus,
  canApprove,
  canVote,
  existingVote,
  onActionComplete,
}: ApprovalActionsProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'approve' | 'reject' | 'vote'>('approve');
  const [comment, setComment] = useState('');
  const [voteValue, setVoteValue] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openDialog = (type: 'approve' | 'reject' | 'vote', vote?: boolean) => {
    setDialogType(type);
    setVoteValue(vote ?? null);
    setComment('');
    setDialogOpen(true);
  };

  const handleApprovalAction = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const isApproval = dialogType === 'approve';
      const nextStatus: WorkflowStatus = isApproval 
        ? APPROVAL_FLOW[currentStatus] 
        : 'rejected';

      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ current_status: nextStatus })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Create approval log
      const { error: logError } = await supabase
        .from('approval_logs')
        .insert({
          application_id: applicationId,
          actor_id: user.id,
          action_type: isApproval ? 'approve' : 'reject',
          from_status: currentStatus,
          to_status: nextStatus,
          comment: comment || null,
        });

      if (logError) throw logError;

      toast.success(isApproval ? 'อนุมัติเรียบร้อย' : 'ไม่อนุมัติเรียบร้อย');
      setDialogOpen(false);
      onActionComplete();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('เกิดข้อผิดพลาด ไม่สามารถดำเนินการได้');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async () => {
    if (!user || voteValue === null) return;
    setSubmitting(true);

    try {
      // Check existing vote
      const { data: existing } = await supabase
        .from('committee_votes')
        .select('id')
        .eq('application_id', applicationId)
        .eq('committee_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing vote
        const { error } = await supabase
          .from('committee_votes')
          .update({
            is_agree: voteValue,
            comment: comment || null,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new vote
        const { error } = await supabase
          .from('committee_votes')
          .insert({
            application_id: applicationId,
            committee_id: user.id,
            is_agree: voteValue,
            comment: comment || null,
          });

        if (error) throw error;
      }

      // Also log the vote action
      await supabase
        .from('approval_logs')
        .insert({
          application_id: applicationId,
          actor_id: user.id,
          action_type: 'vote',
          from_status: currentStatus,
          to_status: currentStatus,
          comment: `โหวต: ${voteValue ? 'เห็นชอบ' : 'ไม่เห็นชอบ'}${comment ? ` - ${comment}` : ''}`,
        });

      toast.success(voteValue ? 'บันทึกเห็นชอบเรียบร้อย' : 'บันทึกไม่เห็นชอบเรียบร้อย');
      setDialogOpen(false);
      onActionComplete();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('เกิดข้อผิดพลาด ไม่สามารถบันทึกโหวตได้');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (dialogType === 'vote') {
      handleVote();
    } else {
      handleApprovalAction();
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-2"
      >
        {canVote && (
          <>
            <Button
              size="sm"
              variant={existingVote?.is_agree === true ? 'default' : 'outline'}
              onClick={() => openDialog('vote', true)}
              className="gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              เห็นชอบ
            </Button>
            <Button
              size="sm"
              variant={existingVote?.is_agree === false ? 'destructive' : 'outline'}
              onClick={() => openDialog('vote', false)}
              className="gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              ไม่เห็นชอบ
            </Button>
          </>
        )}

        {canApprove && (
          <>
            <Button
              size="sm"
              onClick={() => openDialog('approve')}
              className="gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              อนุมัติ
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => openDialog('reject')}
              className="gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              ไม่อนุมัติ
            </Button>
          </>
        )}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'approve' && 'ยืนยันการอนุมัติ'}
              {dialogType === 'reject' && 'ยืนยันไม่อนุมัติ'}
              {dialogType === 'vote' && (voteValue ? 'ยืนยันเห็นชอบ' : 'ยืนยันไม่เห็นชอบ')}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'approve' && 'ใบสมัครจะถูกส่งไปยังขั้นตอนถัดไป'}
              {dialogType === 'reject' && 'ใบสมัครจะถูกปฏิเสธและไม่สามารถดำเนินการต่อได้'}
              {dialogType === 'vote' && 'บันทึกการลงคะแนนของคุณ'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                ความคิดเห็น (ถ้ามี)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ระบุเหตุผลหรือข้อเสนอแนะ..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              variant={dialogType === 'reject' || (dialogType === 'vote' && !voteValue) ? 'destructive' : 'default'}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {dialogType === 'approve' && 'อนุมัติ'}
              {dialogType === 'reject' && 'ไม่อนุมัติ'}
              {dialogType === 'vote' && 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
