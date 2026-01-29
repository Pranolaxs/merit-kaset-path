import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, User, GraduationCap, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApplicationWithDetails } from '@/hooks/useApplications';

interface ApprovalCardProps {
  application: ApplicationWithDetails;
  index: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const statusLabels: Record<string, string> = {
  submitted: 'ส่งแล้ว',
  dept_review: 'รอหัวหน้าภาค',
  faculty_review: 'รอคณะ',
  student_affairs_review: 'รอกองพัฒนานิสิต',
  committee_review: 'รอคณะกรรมการ',
  chairman_review: 'รอประธาน',
  president_review: 'รออธิการบดี',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
  draft: 'ฉบับร่าง',
};

export function ApprovalCard({ application, index, onApprove, onReject }: ApprovalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const studentName = application.student_profile
    ? `${application.student_profile.first_name} ${application.student_profile.last_name}`
    : 'ไม่ทราบชื่อ';

  const studentCode = application.student_profile?.student_code || '-';
  const faculty = application.student_profile?.department?.faculty?.faculty_name || '-';
  const department = application.student_profile?.department?.dept_name || '-';
  const awardType = application.award_type?.type_name || '-';
  const statusLabel = statusLabels[application.current_status || 'draft'] || application.current_status;

  // Parse achievements (stored as text, might be JSON array or plain text)
  let achievements: string[] = [];
  if (application.achievements) {
    try {
      const parsed = JSON.parse(application.achievements);
      achievements = Array.isArray(parsed) ? parsed : [application.achievements];
    } catch {
      achievements = [application.achievements];
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="p-4 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                {studentName.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-lg">{studentName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {studentCode} • {faculty}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Award className="h-3 w-3" />
              {awardType}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Status & Basic Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="gap-1">
              <GraduationCap className="h-3 w-3" />
              {department}
            </Badge>
            <Badge variant="outline">
              สถานะ: {statusLabel}
            </Badge>
            {application.activity_hours && (
              <Badge variant="outline">
                ชั่วโมงกิจกรรม: {application.activity_hours}
              </Badge>
            )}
          </div>

          {/* Description */}
          {application.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {application.description}
            </p>
          )}

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
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
              {/* Student Details */}
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  ข้อมูลนิสิต
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">รหัสนิสิต:</span> {studentCode}
                  </div>
                  <div>
                    <span className="text-muted-foreground">คณะ:</span> {faculty}
                  </div>
                  <div>
                    <span className="text-muted-foreground">ภาควิชา:</span> {department}
                  </div>
                  {application.student_profile?.gpax && (
                    <div>
                      <span className="text-muted-foreground">เกรดเฉลี่ย:</span>{' '}
                      {application.student_profile.gpax.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Project Info */}
              {application.project_name && (
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm font-medium mb-2">ชื่อโครงการ/ผลงาน</p>
                  <p className="text-sm text-muted-foreground">{application.project_name}</p>
                </div>
              )}

              {/* Achievements */}
              {achievements.length > 0 && (
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm font-medium mb-2">ผลงานและความสำเร็จ</p>
                  <ul className="space-y-2">
                    {achievements.map((achievement, i) => (
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
              )}

              {/* Academic Period */}
              {application.academic_period && (
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm font-medium mb-2">ปีการศึกษา</p>
                  <p className="text-sm text-muted-foreground">
                    ภาคการศึกษาที่ {application.academic_period.semester}/{application.academic_period.academic_year}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="success"
              className="flex-1 gap-2"
              onClick={() => onApprove(application.id)}
            >
              <CheckCircle className="h-4 w-4" />
              เห็นชอบ
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={() => onReject(application.id)}
            >
              <XCircle className="h-4 w-4" />
              ไม่เห็นชอบ
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
