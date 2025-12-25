import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WorkflowProgress } from '@/components/nomination/WorkflowProgress';
import { useNominations } from '@/hooks/useNominations';
import { AWARD_CATEGORIES } from '@/types/nomination';
import { toast } from 'sonner';

export default function Approval() {
  const { data: nominations, isLoading } = useNominations();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    nominationId: string;
  } | null>(null);
  const [comment, setComment] = useState('');

  // Filter nominations that need approval (not approved/rejected yet)
  const pendingNominations = nominations?.filter(
    (n) => !['approved', 'rejected'].includes(n.status) && n.status !== 'draft'
  );

  const handleAction = (nominationId: string, type: 'approve' | 'reject') => {
    setActionDialog({ open: true, type, nominationId });
  };

  const confirmAction = () => {
    if (actionDialog) {
      toast.success(
        actionDialog.type === 'approve' ? 'อนุมัติสำเร็จ' : 'ไม่อนุมัติสำเร็จ',
        {
          description: 'ระบบได้บันทึกการดำเนินการของคุณแล้ว',
        }
      );
      setActionDialog(null);
      setComment('');
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <Card className="border-border/50 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {pendingNominations?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">รอการอนุมัติ</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-success/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">12</p>
                <p className="text-sm text-muted-foreground">อนุมัติแล้ว</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">3</p>
                <p className="text-sm text-muted-foreground">ไม่อนุมัติ</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Nominations */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded-lg" />
                </CardContent>
              </Card>
            ))
          ) : pendingNominations && pendingNominations.length > 0 ? (
            pendingNominations.map((nomination, index) => {
              const category = AWARD_CATEGORIES[nomination.category];
              const isExpanded = expandedId === nomination.id;

              return (
                <motion.div
                  key={nomination.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-border/50 overflow-hidden">
                    <CardHeader className="p-4 pb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                            {nomination.student.firstName.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {nomination.student.firstName} {nomination.student.lastName}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {nomination.student.studentId} • {nomination.student.faculty}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="gap-1">
                          {category.icon} {category.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {nomination.description}
                      </p>

                      {/* Expand/Collapse Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : nomination.id)
                        }
                        className="w-full mb-4 gap-2"
                      >
                        {isExpanded ? (
                          <>
                            ซ่อนรายละเอียด
                            <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            ดูรายละเอียด
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </Button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 space-y-4"
                        >
                          <div className="p-4 rounded-lg bg-secondary/50">
                            <p className="text-sm font-medium mb-2">ผลงานและความสำเร็จ</p>
                            <ul className="space-y-2">
                              {nomination.achievements.map((achievement, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-muted-foreground flex items-start gap-2"
                                >
                                  <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                                  {achievement}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <WorkflowProgress
                            currentStep={nomination.currentStep}
                            totalSteps={nomination.totalSteps}
                          />
                        </motion.div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="success"
                          className="flex-1 gap-2"
                          onClick={() => handleAction(nomination.id, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4" />
                          เห็นชอบ
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 gap-2"
                          onClick={() => handleAction(nomination.id, 'reject')}
                        >
                          <XCircle className="h-4 w-4" />
                          ไม่เห็นชอบ
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
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
        <Dialog
          open={actionDialog?.open || false}
          onOpenChange={(open) => !open && setActionDialog(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog?.type === 'approve' ? 'ยืนยันการเห็นชอบ' : 'ยืนยันการไม่เห็นชอบ'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog?.type === 'approve'
                  ? 'คุณต้องการเห็นชอบรายการนี้หรือไม่?'
                  : 'คุณต้องการไม่เห็นชอบรายการนี้หรือไม่?'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="เพิ่มความคิดเห็น (ไม่บังคับ)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                ยกเลิก
              </Button>
              <Button
                variant={actionDialog?.type === 'approve' ? 'success' : 'destructive'}
                onClick={confirmAction}
              >
                ยืนยัน
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
