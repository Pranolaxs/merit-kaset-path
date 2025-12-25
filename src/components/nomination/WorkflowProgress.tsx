import { motion } from 'framer-motion';
import { Check, Clock, X, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'rejected';
}

interface WorkflowProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

const workflowSteps: Omit<WorkflowStep, 'status'>[] = [
  { step: 1, title: 'ส่งเสนอชื่อ', description: 'นิสิตเสนอตนเอง' },
  { step: 2, title: 'หัวหน้าภาควิชา', description: 'พิจารณาเห็นชอบ' },
  { step: 3, title: 'รองคณบดี', description: 'พิจารณาเห็นชอบ' },
  { step: 4, title: 'คณบดี', description: 'พิจารณาเห็นชอบ' },
  { step: 5, title: 'กองพัฒนานิสิต', description: 'ตรวจสอบประเภท' },
  { step: 6, title: 'คณะกรรมการ', description: 'โหวตพิจารณา' },
  { step: 7, title: 'ประธานกรรมการ', description: 'ลงนามรับรอง' },
  { step: 8, title: 'อธิการบดี', description: 'ลงนามประกาศ' },
];

export function WorkflowProgress({ currentStep, totalSteps, className }: WorkflowProgressProps) {
  const getStepStatus = (stepNumber: number): WorkflowStep['status'] => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'pending';
  };

  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4" />;
      case 'current':
        return <CircleDot className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStepColors = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground border-success';
      case 'current':
        return 'bg-primary text-primary-foreground border-primary shadow-glow';
      case 'rejected':
        return 'bg-destructive text-destructive-foreground border-destructive';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar */}
      <div className="relative mb-8">
        <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full gradient-primary rounded-full"
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {workflowSteps.map((step, index) => {
            const status = getStepStatus(step.step);
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                    getStepColors(status)
                  )}
                >
                  {getStepIcon(status)}
                </div>
                <div className="mt-3 text-center hidden md:block">
                  <p className={cn(
                    'text-xs font-medium',
                    status === 'current' ? 'text-primary' : 
                    status === 'completed' ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile Step Info */}
      <div className="md:hidden text-center">
        <p className="text-sm font-medium text-foreground">
          ขั้นตอนที่ {currentStep}: {workflowSteps[currentStep - 1]?.title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {workflowSteps[currentStep - 1]?.description}
        </p>
      </div>
    </div>
  );
}
