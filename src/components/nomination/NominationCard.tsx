import { motion } from 'framer-motion';
import { Calendar, GraduationCap, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AWARD_CATEGORIES, STATUS_CONFIG, type Nomination } from '@/types/nomination';
import { cn } from '@/lib/utils';

interface NominationCardProps {
  nomination: Nomination;
  index?: number;
}

export function NominationCard({ nomination, index = 0 }: NominationCardProps) {
  const category = AWARD_CATEGORIES[nomination.category];
  const statusConfig = STATUS_CONFIG[nomination.status];

  const statusColorClasses: Record<string, string> = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    info: 'bg-info/10 text-info border-info/20',
    muted: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link to={`/nominations/${nomination.id}`}>
        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden border-border/50 bg-card">
          <CardContent className="p-0">
            {/* Category Header */}
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-2">
                <span className="text-xl">{category.icon}</span>
                <span className="text-sm font-medium text-foreground">
                  {category.label}
                </span>
              </div>
              <Badge 
                variant="outline"
                className={cn('text-xs', statusColorClasses[statusConfig.color])}
              >
                {statusConfig.label}
              </Badge>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
                  {nomination.student.firstName.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {nomination.student.firstName} {nomination.student.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    รหัสนิสิต: {nomination.student.studentId}
                  </p>
                  
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {nomination.student.faculty}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      ปีการศึกษา {nomination.academicYear}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>

              {/* Progress */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    ความคืบหน้า
                  </span>
                  <span className="font-medium text-foreground">
                    {nomination.currentStep}/{nomination.totalSteps}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(nomination.currentStep / nomination.totalSteps) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="h-full gradient-primary rounded-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
