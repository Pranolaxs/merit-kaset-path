import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ApprovalDialogProps {
  open: boolean;
  type: 'approve' | 'reject';
  comment: string;
  isLoading: boolean;
  onCommentChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApprovalDialog({
  open,
  type,
  comment,
  isLoading,
  onCommentChange,
  onConfirm,
  onCancel,
}: ApprovalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === 'approve' ? 'ยืนยันการเห็นชอบ' : 'ยืนยันการไม่เห็นชอบ'}
          </DialogTitle>
          <DialogDescription>
            {type === 'approve'
              ? 'คุณต้องการเห็นชอบรายการนี้หรือไม่?'
              : 'คุณต้องการไม่เห็นชอบรายการนี้หรือไม่?'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder={
              type === 'reject'
                ? 'กรุณาระบุเหตุผล...'
                : 'เพิ่มความคิดเห็น (ไม่บังคับ)...'
            }
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            ยกเลิก
          </Button>
          <Button
            variant={type === 'approve' ? 'success' : 'destructive'}
            onClick={onConfirm}
            disabled={isLoading || (type === 'reject' && !comment.trim())}
          >
            {isLoading ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
