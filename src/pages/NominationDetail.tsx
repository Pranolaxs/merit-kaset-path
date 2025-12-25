import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, GraduationCap, Mail, Clock, Trophy, FileText, CheckCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WorkflowProgress } from '@/components/nomination/WorkflowProgress';
import { useNomination } from '@/hooks/useNominations';
import { AWARD_CATEGORIES, STATUS_CONFIG } from '@/types/nomination';
import { cn } from '@/lib/utils';

export default function NominationDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: nomination, isLoading } = useNomination(id || '');

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!nomination) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">ไม่พบข้อมูล</h2>
          <p className="text-muted-foreground mb-8">รายการที่คุณค้นหาไม่มีอยู่ในระบบ</p>
          <Button asChild>
            <Link to="/nominations">กลับไปหน้ารายการ</Link>
          </Button>
        </div>
      </Layout>
    );
  }

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
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/nominations">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Link>
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="overflow-hidden border-border/50">
                <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <span className="font-medium text-foreground">{category.label}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-sm', statusColorClasses[statusConfig.color])}
                  >
                    {statusConfig.label}
                  </Badge>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shrink-0">
                      {nomination.student.firstName.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-foreground mb-1">
                        {nomination.student.firstName} {nomination.student.lastName}
                      </h1>
                      <p className="text-muted-foreground mb-4">
                        รหัสนิสิต: {nomination.student.studentId}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GraduationCap className="h-4 w-4" />
                          <span>{nomination.student.faculty}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>ชั้นปีที่ {nomination.student.year}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{nomination.student.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Trophy className="h-4 w-4" />
                          <span>GPA: {nomination.student.gpa.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Workflow Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    ขั้นตอนการพิจารณา
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WorkflowProgress
                    currentStep={nomination.currentStep}
                    totalSteps={nomination.totalSteps}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    รายละเอียด
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed">{nomination.description}</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-accent" />
                    ผลงานและความสำเร็จ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {nomination.achievements.map((achievement, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span className="text-foreground">{achievement}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">ข้อมูลการเสนอชื่อ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ประเภทรางวัล</p>
                    <p className="text-sm font-medium text-foreground">{category.label}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ปีการศึกษา</p>
                    <p className="text-sm font-medium text-foreground">
                      {nomination.academicYear} ({nomination.semester === 'first' ? 'ภาคต้น' : 'ภาคปลาย'})
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">วันที่เสนอ</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(nomination.submittedAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  {nomination.activityHours && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">ชั่วโมงกิจกรรม</p>
                        <p className="text-sm font-medium text-foreground">
                          {nomination.activityHours} ชั่วโมง
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <Button className="w-full" variant="hero">
                    ดาวน์โหลดเอกสาร
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
