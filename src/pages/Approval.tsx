import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { ApprovalCard } from '@/components/approval/ApprovalCard';
import { ApprovalStats } from '@/components/approval/ApprovalStats';
import { ApprovalDialog } from '@/components/approval/ApprovalDialog';
import { useApprovalApplications, useApplicationStats, useApproveApplication } from '@/hooks/useApplications';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Approval() {
  const { appRoles } = useAuth();
  const { data: applications, isLoading } = useApprovalApplications();
  const { data: stats } = useApplicationStats();
  const approveApplication = useApproveApplication();

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    applicationId: string;
  } | null>(null);
  const [comment, setComment] = useState('');

  // Get primary role for approval action
  const primaryRole = appRoles?.[0] || 'student';

  const handleAction = (applicationId: string, type: 'approve' | 'reject') => {
    setActionDialog({ open: true, type, applicationId });
  };

  const confirmAction = async () => {
    if (!actionDialog) return;

    try {
      await approveApplication.mutateAsync({
        applicationId: actionDialog.applicationId,
        isApproved: actionDialog.type === 'approve',
        comment: comment.trim() || undefined,
        userRole: primaryRole,
      });

      toast.success(
        actionDialog.type === 'approve' ? 'อนุมัติสำเร็จ' : 'ไม่อนุมัติสำเร็จ',
        {
          description: 'ระบบได้บันทึกการดำเนินการของคุณแล้ว',
        }
      );
      setActionDialog(null);
      setComment('');
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('เกิดข้อผิดพลาด', {
        description: 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">อนุมัติรายการ</h1>
          <p className="text-muted-foreground">
            ตรวจสอบและอนุมัติรายการเสนอชื่อนิสิตดีเด่น
          </p>
        </motion.div>

        {/* Stats */}
        <ApprovalStats
          pending={stats?.pending || 0}
          approved={stats?.approved || 0}
          rejected={stats?.rejected || 0}
        />

        {/* Pending Applications */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">กำลังโหลดข้อมูล...</p>
              </CardContent>
            </Card>
          ) : applications && applications.length > 0 ? (
            applications.map((application, index) => (
              <ApprovalCard
                key={application.id}
                application={application}
                index={index}
                onApprove={(id) => handleAction(id, 'approve')}
                onReject={(id) => handleAction(id, 'reject')}
              />
            ))
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  ไม่มีรายการรอการอนุมัติ
                </h3>
                <p className="text-muted-foreground">
                  คุณได้ดำเนินการกับรายการทั้งหมดเรียบร้อยแล้ว
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Dialog */}
        {actionDialog && (
          <ApprovalDialog
            open={actionDialog.open}
            type={actionDialog.type}
            comment={comment}
            isLoading={approveApplication.isPending}
            onCommentChange={setComment}
            onConfirm={confirmAction}
            onCancel={() => {
              setActionDialog(null);
              setComment('');
            }}
          />
        )}
      </div>
    </Layout>
  );
}
