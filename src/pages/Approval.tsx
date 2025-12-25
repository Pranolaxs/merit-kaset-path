import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Users, 
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth, POSITION_LABELS } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Application, 
  ApplicationStatus, 
  STATUS_CONFIG,
  WORKFLOW_STEPS,
  AwardType,
  CommitteeVote
} from '@/types/database';
import { useNavigate } from 'react-router-dom';

interface ApplicationWithDetails {
  id: string;
  student_id: string;
  period_id: string;
  award_type_id: string;
  project_name: string | null;
  description: string | null;
  achievements: string | null;
  activity_hours: number | null;
  current_status: string;
  created_at: string;
  student_profile?: {
    first_name: string;
    last_name: string;
    student_code: string | null;
    gpax: number | null;
    department?: {
      dept_name: string;
      faculty?: {
        faculty_name: string;
      };
    };
  };
  award_type?: AwardType;
  period?: {
    academic_year: number;
    semester: number;
  };
  votes?: CommitteeVote[];
}

export default function Approval() {
  const { user, personnelProfile, isStaff, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [awardTypes, setAwardTypes] = useState<AwardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [voteComment, setVoteComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && isStaff) {
      fetchApplications();
      fetchAwardTypes();
    } else if (user && !isStaff) {
      setLoading(false);
    }
  }, [user, isStaff]);

  const fetchAwardTypes = async () => {
    const { data } = await supabase.from('award_types').select('*');
    setAwardTypes((data || []) as AwardType[]);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // Fetch applications with related data
      const { data: appsData, error } = await supabase
        .from('applications')
        .select(`
          *,
          award_type:award_types(*),
          period:academic_periods(academic_year, semester)
        `)
        .neq('current_status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch student profiles for each application
      const studentIds = appsData?.map(a => a.student_id) || [];
      
      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('users')
          .select('id')
          .in('id', studentIds);

        const userIds = studentsData?.map(s => s.id) || [];
        
        const { data: profilesData } = await supabase
          .from('student_profiles')
          .select(`
            user_id,
            first_name,
            last_name,
            student_code,
            gpax,
            department:departments(dept_name, faculty:faculties(faculty_name))
          `)
          .in('user_id', userIds);

        const profilesMap: Record<string, typeof profilesData[0]> = {};
        profilesData?.forEach(p => { profilesMap[p.user_id] = p; });

        // Fetch votes for applications
        const appIds = appsData?.map(a => a.id) || [];
        const { data: votesData } = await supabase
          .from('committee_votes')
          .select('*')
          .in('application_id', appIds);

        const votesMap: Record<string, CommitteeVote[]> = {};
        votesData?.forEach(v => {
          if (!votesMap[v.application_id]) votesMap[v.application_id] = [];
          votesMap[v.application_id].push(v as CommitteeVote);
        });

        const appsWithDetails = appsData?.map(app => ({
          ...app,
          student_profile: profilesMap[app.student_id] || null,
          votes: votesMap[app.id] || []
        })) || [];

        setApplications(appsWithDetails as ApplicationWithDetails[]);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (isAgree: boolean) => {
    if (!selectedApplication || !user) return;

    setSubmitting(true);
    try {
      // Check if already voted
      const existingVote = selectedApplication.votes?.find(v => v.committee_id === user.id);
      
      if (existingVote) {
        const { error } = await supabase
          .from('committee_votes')
          .update({
            is_agree: isAgree,
            comment: voteComment || null,
          })
          .eq('id', existingVote.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('committee_votes')
          .insert([{
            application_id: selectedApplication.id,
            committee_id: user.id,
            is_agree: isAgree,
            comment: voteComment || null,
          }]);

        if (error) throw error;
      }

      toast({
        title: isAgree ? 'เห็นชอบเรียบร้อย' : 'ไม่เห็นชอบเรียบร้อย',
        description: 'บันทึกผลการโหวตแล้ว',
      });

      setVoteDialogOpen(false);
      setVoteComment('');
      fetchApplications();
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกผลการโหวตได้',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (approve: boolean) => {
    if (!selectedApplication || !user || !personnelProfile) return;

    setSubmitting(true);
    try {
      const currentStatus = selectedApplication.current_status as ApplicationStatus;
      let nextStatus: ApplicationStatus;

      if (approve) {
        // Determine next status based on current status
        const statusFlow: Record<ApplicationStatus, ApplicationStatus> = {
          submitted: 'dept_review',
          dept_review: 'faculty_review',
          faculty_review: 'student_affairs_review',
          student_affairs_review: 'committee_review',
          committee_review: 'chairman_review',
          chairman_review: 'president_review',
          president_review: 'approved',
          draft: 'submitted',
          approved: 'approved',
          rejected: 'rejected',
        };
        nextStatus = statusFlow[currentStatus] || 'approved';
      } else {
        nextStatus = 'rejected';
      }

      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ current_status: nextStatus })
        .eq('id', selectedApplication.id);

      if (updateError) throw updateError;

      // Create approval log
      const { error: logError } = await supabase
        .from('approval_logs')
        .insert([{
          application_id: selectedApplication.id,
          actor_id: user.id,
          action_type: approve ? 'approve' : 'reject',
          from_status: currentStatus,
          to_status: nextStatus,
          comment: voteComment || null,
        }]);

      if (logError) throw logError;

      toast({
        title: approve ? 'อนุมัติเรียบร้อย' : 'ไม่อนุมัติ',
        description: `สถานะเปลี่ยนเป็น: ${STATUS_CONFIG[nextStatus].label}`,
      });

      setActionDialogOpen(false);
      setVoteComment('');
      fetchApplications();
    } catch (error) {
      console.error('Error approving:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดำเนินการได้',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getVotePercentage = (app: ApplicationWithDetails) => {
    const votes = app.votes || [];
    if (votes.length === 0) return 0;
    const agreeCount = votes.filter(v => v.is_agree).length;
    return Math.round((agreeCount / votes.length) * 100);
  };

  const getUserVote = (app: ApplicationWithDetails) => {
    return app.votes?.find(v => v.committee_id === user?.id);
  };

  const canReviewApplication = (app: ApplicationWithDetails) => {
    if (!personnelProfile) return false;
    const requiredStatus = WORKFLOW_STEPS[personnelProfile.position];
    return app.current_status === requiredStatus;
  };

  const filteredApplications = applications.filter((app) => {
    const fullName = `${app.student_profile?.first_name || ''} ${app.student_profile?.last_name || ''}`;
    const matchesSearch = 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.student_profile?.student_code?.includes(searchQuery);
    
    const matchesCategory = categoryFilter === 'all' || app.award_type_id === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isStaff) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-muted-foreground mb-4">
            คุณไม่มีสิทธิ์ในการอนุมัติเอกสาร
          </p>
          <Button onClick={() => navigate('/')}>กลับหน้าหลัก</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">อนุมัติเอกสาร</h1>
          <p className="text-muted-foreground">
            พิจารณาและอนุมัติเอกสารเสนอชื่อนิสิตดีเด่น
          </p>
          {personnelProfile && (
            <Badge variant="secondary" className="mt-4">
              {POSITION_LABELS[personnelProfile.position]}
            </Badge>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาตามชื่อ รหัสนิสิต หรือรายละเอียด..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="กรองประเภท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              {awardTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.type_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Applications Grid */}
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredApplications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">ไม่พบรายการ</h3>
                <p className="text-muted-foreground">ไม่มีเอกสารที่ต้องพิจารณาในขณะนี้</p>
              </motion.div>
            ) : (
              filteredApplications.map((app, index) => {
                const votePercentage = getVotePercentage(app);
                const votes = app.votes || [];
                const userVote = getUserVote(app);
                const isPassing = votePercentage > 50;
                const canReview = canReviewApplication(app);
                const statusConfig = STATUS_CONFIG[app.current_status as ApplicationStatus];

                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Left: Application Info */}
                          <div className="flex-1">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold">
                                {app.student_profile?.first_name?.charAt(0) || '?'}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold">
                                  {app.student_profile?.first_name} {app.student_profile?.last_name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {app.student_profile?.student_code || 'ไม่ระบุรหัส'} • {app.student_profile?.department?.faculty?.faculty_name}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant="outline">
                                    {app.award_type?.type_name}
                                  </Badge>
                                  <Badge variant={statusConfig?.color as 'default' | 'secondary' | 'destructive'}>
                                    {statusConfig?.label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                              {app.description || 'ไม่มีรายละเอียด'}
                            </p>

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span>ภาคเรียน: {app.period?.semester}/{app.period?.academic_year}</span>
                              {app.student_profile?.gpax && <span>GPAX: {app.student_profile.gpax}</span>}
                              {app.activity_hours && <span>ชั่วโมงกิจกรรม: {app.activity_hours}</span>}
                            </div>
                          </div>

                          {/* Right: Voting Section */}
                          <div className="lg:w-80 space-y-4">
                            {/* Vote Progress */}
                            <div className="p-4 rounded-lg bg-secondary/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  ผลโหวตคณะกรรมการ
                                </span>
                                <span className={`text-sm font-bold ${isPassing ? 'text-green-600' : 'text-orange-600'}`}>
                                  {votePercentage}%
                                </span>
                              </div>
                              <Progress 
                                value={votePercentage} 
                                className={`h-2 ${isPassing ? '[&>div]:bg-green-500' : '[&>div]:bg-orange-500'}`}
                              />
                              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                <span>เห็นชอบ: {votes.filter(v => v.is_agree).length}</span>
                                <span>ไม่เห็นชอบ: {votes.filter(v => !v.is_agree).length}</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2">
                              {/* Committee Vote Button */}
                              {personnelProfile?.position === 'committee_member' || personnelProfile?.position === 'committee_chairman' ? (
                                <Button
                                  variant={userVote ? 'outline' : 'default'}
                                  className="w-full"
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setVoteComment(userVote?.comment || '');
                                    setVoteDialogOpen(true);
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  {userVote ? `แก้ไขโหวต (${userVote.is_agree ? 'เห็นชอบ' : 'ไม่เห็นชอบ'})` : 'โหวต'}
                                </Button>
                              ) : null}

                              {/* Approval Button */}
                              {canReview && (
                                <Button
                                  variant="hero"
                                  className="w-full"
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setVoteComment('');
                                    setActionDialogOpen(true);
                                  }}
                                >
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                  ดำเนินการอนุมัติ
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Vote Dialog */}
        <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>โหวตเอกสาร</DialogTitle>
              <DialogDescription>
                ให้ความเห็นสำหรับการพิจารณาเอกสารนี้
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="font-medium">
                  {selectedApplication?.student_profile?.first_name} {selectedApplication?.student_profile?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedApplication?.award_type?.type_name}
                </p>
              </div>
              <Textarea
                placeholder="ความคิดเห็น (ไม่บังคับ)"
                value={voteComment}
                onChange={(e) => setVoteComment(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => handleVote(false)}
                disabled={submitting}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                ไม่เห็นชอบ
              </Button>
              <Button
                variant="default"
                onClick={() => handleVote(true)}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                เห็นชอบ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Action Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ดำเนินการอนุมัติ</DialogTitle>
              <DialogDescription>
                ตรวจสอบและดำเนินการอนุมัติเอกสารนี้
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="font-medium">
                  {selectedApplication?.student_profile?.first_name} {selectedApplication?.student_profile?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedApplication?.award_type?.type_name}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  สถานะปัจจุบัน: {STATUS_CONFIG[selectedApplication?.current_status as ApplicationStatus]?.label}
                </p>
              </div>
              <Textarea
                placeholder="หมายเหตุ (ไม่บังคับ)"
                value={voteComment}
                onChange={(e) => setVoteComment(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => handleApprove(false)}
                disabled={submitting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                ไม่อนุมัติ
              </Button>
              <Button
                variant="default"
                onClick={() => handleApprove(true)}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                อนุมัติ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
