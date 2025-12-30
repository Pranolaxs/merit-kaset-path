import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Loader2,
  AlertCircle,
  Eye,
  Users,
  ChevronRight
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useApprovalRoles } from '@/hooks/useApprovalRoles';
import { WorkflowTimeline } from '@/components/approval/WorkflowTimeline';
import { ApprovalActions } from '@/components/approval/ApprovalActions';
import { ApprovalHistory } from '@/components/approval/ApprovalHistory';
import { STATUS_CONFIG } from '@/types/database';
import { APP_ROLE_LABELS } from '@/types/roles';
import type { WorkflowStatus } from '@/types/workflow';
import type { AwardType, CommitteeVote, ApplicationStatus } from '@/types/database';

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
  campus_id: string | null;
  created_at: string;
  student_profile?: {
    first_name: string;
    last_name: string;
    student_code: string | null;
    gpax: number | null;
    department_id: string | null;
    department?: {
      dept_name: string;
      faculty_id: string;
      faculty?: {
        faculty_name: string;
        campus_id: string | null;
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
  const { user, loading: authLoading } = useAuth();
  const { approverRoles, isCommitteeMember, canReviewApplication, loading: rolesLoading } = useApprovalRoles();
  const navigate = useNavigate();
  
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [awardTypes, setAwardTypes] = useState<AwardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<ApplicationWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const hasApproverAccess = approverRoles.length > 0;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !rolesLoading) {
      fetchApplications();
      fetchAwardTypes();
    }
  }, [user, rolesLoading]);

  const fetchAwardTypes = async () => {
    const { data } = await supabase.from('award_types').select('*');
    setAwardTypes((data || []) as AwardType[]);
  };

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
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

      const studentIds = appsData?.map(a => a.student_id) || [];
      
      if (studentIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('student_profiles')
          .select(`
            user_id,
            first_name,
            last_name,
            student_code,
            gpax,
            department_id,
            department:departments(dept_name, faculty_id, faculty:faculties(faculty_name, campus_id))
          `)
          .in('user_id', studentIds);

        const profilesMap: Record<string, typeof profilesData[0]> = {};
        profilesData?.forEach(p => { profilesMap[p.user_id] = p; });

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
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleActionComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchApplications();
  };

  const openDetail = (app: ApplicationWithDetails) => {
    setSelectedApp(app);
    setDetailOpen(true);
  };

  const getVoteStats = (app: ApplicationWithDetails) => {
    const votes = app.votes || [];
    const total = votes.length;
    const agree = votes.filter(v => v.is_agree).length;
    return { total, agree, percentage: total > 0 ? Math.round((agree / total) * 100) : 0 };
  };

  const getUserVote = (app: ApplicationWithDetails) => {
    return app.votes?.find(v => v.committee_id === user?.id);
  };

  const canReviewApp = (app: ApplicationWithDetails) => {
    const status = app.current_status as WorkflowStatus;
    const campusId = app.campus_id || app.student_profile?.department?.faculty?.campus_id;
    const facultyId = app.student_profile?.department?.faculty_id;
    const deptId = app.student_profile?.department_id;
    
    return canReviewApplication(status, campusId || undefined, facultyId || undefined, deptId || undefined);
  };

  const filteredApplications = applications.filter((app) => {
    const fullName = `${app.student_profile?.first_name || ''} ${app.student_profile?.last_name || ''}`;
    const matchesSearch = 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.student_profile?.student_code?.includes(searchQuery);
    
    const matchesCategory = categoryFilter === 'all' || app.award_type_id === categoryFilter;
    const matchesStatus = statusFilter === 'all' || app.current_status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (authLoading || rolesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!hasApproverAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-muted-foreground mb-4">
            คุณไม่มีบทบาทในการอนุมัติเอกสาร
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
          <h1 className="text-3xl font-bold mb-2">พิจารณาอนุมัติ</h1>
          <p className="text-muted-foreground mb-4">
            พิจารณาและอนุมัติใบสมัครนิสิตดีเด่น
          </p>
          <div className="flex flex-wrap gap-2">
            {approverRoles.map(role => (
              <Badge key={role} variant="secondary">
                {APP_ROLE_LABELS[role]}
              </Badge>
            ))}
          </div>
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
              placeholder="ค้นหาตามชื่อ รหัสนิสิต..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="ประเภท" />
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Applications */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
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
                  <p className="text-muted-foreground">ไม่มีใบสมัครที่ต้องพิจารณา</p>
                </motion.div>
              ) : (
                filteredApplications.map((app, index) => {
                  const voteStats = getVoteStats(app);
                  const userVote = getUserVote(app);
                  const canReview = canReviewApp(app);
                  const statusConfig = STATUS_CONFIG[app.current_status as ApplicationStatus];
                  const isCommitteeReview = app.current_status === 'committee_review';

                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className={`hover:shadow-md transition-shadow ${canReview ? 'ring-2 ring-primary/20' : ''}`}>
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row gap-6">
                            {/* Left: Info */}
                            <div className="flex-1">
                              <div className="flex items-start gap-4 mb-4">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold shrink-0">
                                  {app.student_profile?.first_name?.charAt(0) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold truncate">
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
                                    {canReview && (
                                      <Badge variant="default" className="bg-primary">
                                        รอพิจารณา
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {app.description || 'ไม่มีรายละเอียด'}
                              </p>

                              {/* Vote progress for committee review */}
                              {isCommitteeReview && (
                                <div className="mb-4">
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Users className="h-4 w-4" />
                                      โหวต: {voteStats.agree}/{voteStats.total}
                                    </span>
                                    <span className={voteStats.percentage > 50 ? 'text-green-600' : 'text-muted-foreground'}>
                                      {voteStats.percentage}%
                                    </span>
                                  </div>
                                  <Progress value={voteStats.percentage} className="h-2" />
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDetail(app)}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  ดูรายละเอียด
                                </Button>

                                {(canReview || (isCommitteeReview && isCommitteeMember)) && (
                                  <ApprovalActions
                                    applicationId={app.id}
                                    currentStatus={app.current_status as WorkflowStatus}
                                    canApprove={canReview && !isCommitteeReview}
                                    canVote={isCommitteeReview && isCommitteeMember}
                                    existingVote={userVote}
                                    onActionComplete={handleActionComplete}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Right: Timeline (desktop) */}
                            <div className="hidden lg:block w-64 shrink-0 border-l pl-6">
                              <WorkflowTimeline currentStatus={app.current_status as WorkflowStatus} />
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
        )}

        {/* Detail Sheet */}
        <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            {selectedApp && (
              <>
                <SheetHeader>
                  <SheetTitle>รายละเอียดใบสมัคร</SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  {/* Student Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">ข้อมูลนิสิต</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ชื่อ-นามสกุล</span>
                        <span className="font-medium">
                          {selectedApp.student_profile?.first_name} {selectedApp.student_profile?.last_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">รหัสนิสิต</span>
                        <span>{selectedApp.student_profile?.student_code || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">คณะ</span>
                        <span>{selectedApp.student_profile?.department?.faculty?.faculty_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ภาควิชา</span>
                        <span>{selectedApp.student_profile?.department?.dept_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GPAX</span>
                        <span>{selectedApp.student_profile?.gpax || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Application Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">ข้อมูลใบสมัคร</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">ประเภทรางวัล</span>
                        <p className="font-medium mt-1">{selectedApp.award_type?.type_name}</p>
                      </div>
                      {selectedApp.project_name && (
                        <div>
                          <span className="text-muted-foreground">ชื่อโครงการ/ผลงาน</span>
                          <p className="font-medium mt-1">{selectedApp.project_name}</p>
                        </div>
                      )}
                      {selectedApp.description && (
                        <div>
                          <span className="text-muted-foreground">รายละเอียด</span>
                          <p className="mt-1">{selectedApp.description}</p>
                        </div>
                      )}
                      {selectedApp.achievements && (
                        <div>
                          <span className="text-muted-foreground">ผลงาน/ความสำเร็จ</span>
                          <p className="mt-1 whitespace-pre-wrap">{selectedApp.achievements}</p>
                        </div>
                      )}
                      {selectedApp.activity_hours && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ชั่วโมงกิจกรรม</span>
                          <span>{selectedApp.activity_hours} ชั่วโมง</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Workflow Timeline */}
                  <Card>
                    <CardContent className="pt-6">
                      <WorkflowTimeline currentStatus={selectedApp.current_status as WorkflowStatus} />
                    </CardContent>
                  </Card>

                  {/* Approval History */}
                  <Card>
                    <CardContent className="pt-6">
                      <ApprovalHistory 
                        applicationId={selectedApp.id} 
                        refreshTrigger={refreshTrigger}
                      />
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  {(canReviewApp(selectedApp) || (selectedApp.current_status === 'committee_review' && isCommitteeMember)) && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">ดำเนินการ</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ApprovalActions
                          applicationId={selectedApp.id}
                          currentStatus={selectedApp.current_status as WorkflowStatus}
                          canApprove={canReviewApp(selectedApp) && selectedApp.current_status !== 'committee_review'}
                          canVote={selectedApp.current_status === 'committee_review' && isCommitteeMember}
                          existingVote={getUserVote(selectedApp)}
                          onActionComplete={() => {
                            handleActionComplete();
                            setDetailOpen(false);
                          }}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
