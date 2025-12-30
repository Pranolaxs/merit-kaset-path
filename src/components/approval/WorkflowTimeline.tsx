import { motion } from 'framer-motion';
import { Check, Clock, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORKFLOW_STEPS_ORDER, getStepIndex } from '@/types/workflow';
import type { WorkflowStatus } from '@/types/workflow';

interface WorkflowTimelineProps {
  currentStatus: WorkflowStatus;
  className?: string;
}

export function WorkflowTimeline({ currentStatus, className }: WorkflowTimelineProps) {
  const currentIndex = getStepIndex(currentStatus);
  const isRejected = currentStatus === 'rejected';

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium text-muted-foreground mb-3">สถานะการอนุมัติ</h4>
      
      {/* Mobile: Horizontal compact */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 lg:hidden">
        {WORKFLOW_STEPS_ORDER.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex && !isRejected;
          const isPending = index > currentIndex;

          return (
            <div key={step.status} className="flex items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium shrink-0',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                  isPending && 'bg-muted text-muted-foreground',
                  isRejected && index === currentIndex && 'bg-destructive text-destructive-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isRejected && index === currentIndex ? (
                  <X className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </motion.div>
              {index < WORKFLOW_STEPS_ORDER.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: Vertical with details */}
      <div className="hidden lg:block space-y-0">
        {WORKFLOW_STEPS_ORDER.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex && !isRejected;
          const isPending = index > currentIndex;

          return (
            <motion.div
              key={step.status}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3"
            >
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium shrink-0 z-10',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                    isPending && 'bg-muted text-muted-foreground border border-border',
                    isRejected && index === currentIndex && 'bg-destructive text-destructive-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isRejected && index === currentIndex ? (
                    <X className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < WORKFLOW_STEPS_ORDER.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 h-8',
                      isCompleted ? 'bg-green-500' : 'bg-border'
                    )}
                  />
                )}
              </div>

              {/* Step info */}
              <div className="pb-8 pt-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isCompleted && 'text-green-600',
                    isCurrent && 'text-primary',
                    isPending && 'text-muted-foreground',
                    isRejected && index === currentIndex && 'text-destructive'
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Rejected indicator */}
      {isRejected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20"
        >
          <X className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">ไม่ผ่านการอนุมัติ</span>
        </motion.div>
      )}
    </div>
  );
}
