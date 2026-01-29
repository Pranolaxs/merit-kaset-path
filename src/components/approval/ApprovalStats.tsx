import { motion } from 'framer-motion';
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ApprovalStatsProps {
  pending: number;
  approved: number;
  rejected: number;
}

export function ApprovalStats({ pending, approved, rejected }: ApprovalStatsProps) {
  return (
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
            <p className="text-2xl font-bold text-foreground">{pending}</p>
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
            <p className="text-2xl font-bold text-foreground">{approved}</p>
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
            <p className="text-2xl font-bold text-foreground">{rejected}</p>
            <p className="text-sm text-muted-foreground">ไม่อนุมัติ</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
