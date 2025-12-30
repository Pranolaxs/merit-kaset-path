import { useState } from 'react';
import { motion } from 'framer-motion';
import { PenTool, Check, X, FileSignature, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useApprovalRoles } from '@/hooks/useApprovalRoles';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface Endorsement {
  id: string;
  endorsement_type: string;
  is_approved: boolean;
  comment: string | null;
  endorsed_at: string;
  endorser?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface DigitalEndorsementProps {
  applicationId: string;
  currentStatus: string;
  onEndorsementComplete?: () => void;
}

export function DigitalEndorsement({ applicationId, currentStatus, onEndorsementComplete }: DigitalEndorsementProps) {
  const { user } = useAuth();
  const { approverRoles } = useApprovalRoles();
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [endorsementType, setEndorsementType] = useState<string>('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isChairman = approverRoles.includes('committee_chairman');
  const isPresident = approverRoles.includes('president');

  const canEndorseAsChairman = isChairman && currentStatus === 'chairman_review';
  const canEndorseAsPresident = isPresident && currentStatus === 'president_review';

  useState(() => {
    fetchEndorsements();
  });

  const fetchEndorsements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('endorsements')
        .select('*')
        .eq('application_id', applicationId)
        .order('endorsed_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const endorserIds = data.map(e => e.endorser_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email')
          .in('id', endorserIds);

        const { data: profilesData } = await supabase
          .from('personnel_profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', endorserIds);

        const usersMap: Record<string, { email: string }> = {};
        usersData?.forEach(u => { usersMap[u.id] = { email: u.email }; });

        const profilesMap: Record<string, { first_name: string; last_name: string }> = {};
        profilesData?.forEach(p => { profilesMap[p.user_id] = p; });

        const endorsementsWithUsers = data.map(e => ({
          ...e,
          endorser: {
            email: usersMap[e.endorser_id]?.email || '',
            ...profilesMap[e.endorser_id],
          },
        }));

        setEndorsements(endorsementsWithUsers);
      } else {
        setEndorsements([]);
      }
    } catch (error) {
      console.error('Error fetching endorsements:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEndorseDialog = (type: string) => {
    setEndorsementType(type);
    setComment('');
    setDialogOpen(true);
  };

  const handleEndorse = async (isApproved: boolean) => {
    if (!user) return;
    setSubmitting(true);

    try {
      // Create endorsement record
      const { error: endorseError } = await supabase
        .from('endorsements')
        .insert({
          application_id: applicationId,
          endorser_id: user.id,
          endorsement_type: endorsementType,
          is_approved: isApproved,
          comment: comment || null,
          signature_data: `digital-signature-${user.id}-${Date.now()}`,
        });

      if (endorseError) throw endorseError;

      // Determine next status
      type StatusType = 'draft' | 'submitted' | 'dept_review' | 'faculty_review' | 'student_affairs_review' | 'committee_review' | 'chairman_review' | 'president_review' | 'approved' | 'rejected';
      let nextStatus: StatusType;
      if (!isApproved) {
        nextStatus = 'rejected';
      } else if (endorsementType === 'chairman_approval') {
        nextStatus = 'president_review';
      } else if (endorsementType === 'president_approval') {
        nextStatus = 'approved';
      } else {
        nextStatus = currentStatus as StatusType;
      }

      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ current_status: nextStatus })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Log the action
      await supabase
        .from('approval_logs')
        .insert([{
          application_id: applicationId,
          actor_id: user.id,
          action_type: isApproved ? 'endorse' : 'reject',
          from_status: currentStatus as StatusType,
          to_status: nextStatus,
          comment: `ลงนาม${isApproved ? 'รับรอง' : 'ไม่รับรอง'}: ${comment || '-'}`,
        }]);

      toast.success(isApproved ? 'ลงนามรับรองเรียบร้อย' : 'ลงนามไม่รับรอง');
      setDialogOpen(false);
      await fetchEndorsements();
      onEndorsementComplete?.();
    } catch (error) {
      console.error('Error creating endorsement:', error);
      toast.error('เกิดข้อผิดพลาดในการลงนาม');
    } finally {
      setSubmitting(false);
    }
  };

  const getEndorsementLabel = (type: string) => {
    switch (type) {
      case 'chairman_approval': return 'ประธานกรรมการ';
      case 'president_approval': return 'อธิการบดี';
      case 'committee_result': return 'ผลการพิจารณา';
      default: return type;
    }
  };

  const getEndorserName = (endorsement: Endorsement) => {
    if (endorsement.endorser?.first_name && endorsement.endorser?.last_name) {
      return `${endorsement.endorser.first_name} ${endorsement.endorser.last_name}`;
    }
    return endorsement.endorser?.email?.split('@')[0] || 'ไม่ทราบ';
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          การลงนามรับรอง
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Endorsements */}
        {endorsements.length > 0 && (
          <div className="space-y-2">
            {endorsements.map((endorsement, index) => (
              <motion.div
                key={endorsement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border ${
                  endorsement.is_approved 
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">
                    {getEndorsementLabel(endorsement.endorsement_type)}
                  </span>
                  <Badge variant={endorsement.is_approved ? 'default' : 'destructive'}>
                    {endorsement.is_approved ? (
                      <><Check className="h-3 w-3 mr-1" />รับรอง</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" />ไม่รับรอง</>
                    )}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>โดย: {getEndorserName(endorsement)}</p>
                  <p>วันที่: {format(new Date(endorsement.endorsed_at), 'd MMM yyyy HH:mm', { locale: th })}</p>
                  {endorsement.comment && <p className="mt-1">หมายเหตุ: {endorsement.comment}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Endorse Actions */}
        {(canEndorseAsChairman || canEndorseAsPresident) && (
          <div className="space-y-2">
            {canEndorseAsChairman && (
              <Button
                onClick={() => openEndorseDialog('chairman_approval')}
                className="w-full"
              >
                <PenTool className="h-4 w-4 mr-2" />
                ลงนามรับรอง (ประธานกรรมการ)
              </Button>
            )}
            {canEndorseAsPresident && (
              <Button
                onClick={() => openEndorseDialog('president_approval')}
                className="w-full"
              >
                <PenTool className="h-4 w-4 mr-2" />
                ลงนามอนุมัติ (อธิการบดี)
              </Button>
            )}
          </div>
        )}

        {/* No endorsements message */}
        {endorsements.length === 0 && !canEndorseAsChairman && !canEndorseAsPresident && (
          <div className="text-center text-muted-foreground text-sm py-4">
            ยังไม่มีการลงนามรับรอง
          </div>
        )}

        {/* Endorse Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ลงนามรับรอง</DialogTitle>
              <DialogDescription>
                กรุณาตรวจสอบข้อมูลและยืนยันการลงนาม
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <FileSignature className="h-12 w-12 mx-auto mb-2 text-primary" />
                <p className="font-medium">
                  {endorsementType === 'chairman_approval' && 'ลงนามในฐานะประธานคณะกรรมการ'}
                  {endorsementType === 'president_approval' && 'ลงนามในฐานะอธิการบดี'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ความคิดเห็น (ถ้ามี)</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="ระบุความคิดเห็นหรือข้อเสนอแนะ..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)} 
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                ยกเลิก
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleEndorse(false)} 
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <X className="h-4 w-4 mr-2" />
                ไม่รับรอง
              </Button>
              <Button 
                onClick={() => handleEndorse(true)} 
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Check className="h-4 w-4 mr-2" />
                รับรอง
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
