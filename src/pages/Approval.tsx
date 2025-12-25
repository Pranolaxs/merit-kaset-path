import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Users, 
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  AlertCircle
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
import { useAuth, ROLE_LABELS, AppRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AWARD_CATEGORIES } from '@/types/nomination';
import { useNavigate } from 'react-router-dom';

interface Nomination {
  id: string;
  student_id: string;
  category: string;
  semester: string;
  academic_year: string;
  activity_hours: number | null;
  gpa: number | null;
  description: string | null;
  achievements: string | null;
  status: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    faculty: string | null;
    department: string | null;
  } | null;
}

interface Vote {
  id: string;
  nomination_id: string;
  voter_id: string;
  vote: boolean;
  role: string;
  comment: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
}

export default function Approval() {
  const { user, roles, isApprover, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [votes, setVotes] = useState<Record<string, Vote[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [voteComment, setVoteComment] = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && isApprover) {
      fetchNominations();
    } else if (user && !isApprover) {
      setLoading(false);
    }
  }, [user, isApprover]);

  const fetchNominations = async () => {
    setLoading(true);
    try {
      const { data: nominationsData, error } = await supabase
        .from('nominations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each nomination
      const studentIds = nominationsData?.map(n => n.student_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, faculty, department')
        .in('user_id', studentIds);

      const profilesMap: Record<string, typeof profilesData[0]> = {};
      profilesData?.forEach(p => { profilesMap[p.user_id] = p; });

      const nominationsWithProfiles = nominationsData?.map(n => ({
        ...n,
        profiles: profilesMap[n.student_id] || null
      })) || [];

      setNominations(nominationsWithProfiles as Nomination[]);

      // Fetch votes for all nominations
      const nominationIds = nominationsData?.map(n => n.id) || [];
      if (nominationIds.length > 0) {
        const { data: votesData } = await supabase
          .from('nomination_votes')
          .select('*')
          .in('nomination_id', nominationIds);

        // Fetch voter profiles
        const voterIds = votesData?.map(v => v.voter_id) || [];
        const { data: voterProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', voterIds);

        const voterProfilesMap: Record<string, { full_name: string | null }> = {};
        voterProfiles?.forEach(p => { voterProfilesMap[p.user_id] = { full_name: p.full_name }; });

        // Group votes by nomination_id
        const votesMap: Record<string, Vote[]> = {};
        votesData?.forEach((vote) => {
          if (!votesMap[vote.nomination_id]) {
            votesMap[vote.nomination_id] = [];
          }
          votesMap[vote.nomination_id].push({
            ...vote,
            profiles: voterProfilesMap[vote.voter_id] || null
          } as Vote);
        });
        setVotes(votesMap);
      }
    } catch (error) {
      console.error('Error fetching nominations:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (approve: boolean) => {
    if (!selectedNomination || !user) return;

    setSubmittingVote(true);
    try {
      // Check if user already voted
      const existingVote = votes[selectedNomination.id]?.find(v => v.voter_id === user.id);
      
      if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from('nomination_votes')
          .update({
            vote: approve,
            comment: voteComment || null,
          })
          .eq('id', existingVote.id);

        if (error) throw error;
      } else {
        // Insert new vote
        const { error } = await supabase
          .from('nomination_votes')
          .insert({
            nomination_id: selectedNomination.id,
            voter_id: user.id,
            vote: approve,
            role: roles[0] as string,
            comment: voteComment || null,
          });

        if (error) throw error;
      }

      toast({
        title: approve ? 'เห็นชอบเรียบร้อย' : 'ไม่เห็นชอบเรียบร้อย',
        description: 'บันทึกผลการโหวตแล้ว',
      });

      setVoteDialogOpen(false);
      setVoteComment('');
      fetchNominations();
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกผลการโหวตได้',
        variant: 'destructive',
      });
    } finally {
      setSubmittingVote(false);
    }
  };

  const getVotePercentage = (nominationId: string) => {
    const nominationVotes = votes[nominationId] || [];
    if (nominationVotes.length === 0) return 0;
    const approvedCount = nominationVotes.filter(v => v.vote).length;
    return Math.round((approvedCount / nominationVotes.length) * 100);
  };

  const getUserVote = (nominationId: string) => {
    return votes[nominationId]?.find(v => v.voter_id === user?.id);
  };

  const filteredNominations = nominations.filter((nomination) => {
    const matchesSearch = 
      nomination.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nomination.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || nomination.category === categoryFilter;

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

  if (!isApprover) {
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
            พิจารณาและโหวตเอกสารเสนอชื่อนิสิตดีเด่น
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {roles.map((role) => (
              <Badge key={role} variant="secondary" className="text-sm">
                {ROLE_LABELS[role]}
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
              placeholder="ค้นหาตามชื่อหรือรายละเอียด..."
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
              <SelectItem value="extracurricular">กิจกรรมเสริมหลักสูตร</SelectItem>
              <SelectItem value="innovation">นวัตกรรม</SelectItem>
              <SelectItem value="good_conduct">ความประพฤติดี</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Nominations Grid */}
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredNominations.map((nomination, index) => {
              const votePercentage = getVotePercentage(nomination.id);
              const nominationVotes = votes[nomination.id] || [];
              const userVote = getUserVote(nomination.id);
              const isPassing = votePercentage > 50;
              const categoryInfo = AWARD_CATEGORIES[nomination.category as keyof typeof AWARD_CATEGORIES];

              return (
                <motion.div
                  key={nomination.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left: Nomination Info */}
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                              {categoryInfo?.icon || '📄'}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold">
                                {nomination.profiles?.full_name || 'ไม่ระบุชื่อ'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {nomination.profiles?.faculty} • {nomination.profiles?.department}
                              </p>
                              <Badge variant="outline" className="mt-2">
                                {categoryInfo?.label || nomination.category}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {nomination.description || 'ไม่มีรายละเอียด'}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span>ภาคเรียน: {nomination.semester}</span>
                            <span>ปีการศึกษา: {nomination.academic_year}</span>
                            {nomination.gpa && <span>GPA: {nomination.gpa}</span>}
                          </div>
                        </div>

                        {/* Right: Voting Section */}
                        <div className="lg:w-80 space-y-4">
                          {/* Vote Progress */}
                          <div className="p-4 rounded-lg bg-secondary/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                ผลโหวต
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
                              <span>
                                เห็นชอบ: {nominationVotes.filter(v => v.vote).length}
                              </span>
                              <span>
                                ไม่เห็นชอบ: {nominationVotes.filter(v => !v.vote).length}
                              </span>
                            </div>
                            {isPassing && nominationVotes.length > 0 && (
                              <Badge className="mt-2 bg-green-100 text-green-800 hover:bg-green-100">
                                ผ่านเกณฑ์ &gt;50%
                              </Badge>
                            )}
                          </div>

                          {/* Voters List */}
                          {nominationVotes.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">ผู้อนุมัติ:</p>
                              <div className="flex flex-wrap gap-1">
                                {nominationVotes.map((vote) => (
                                  <Badge 
                                    key={vote.id}
                                    variant={vote.vote ? 'default' : 'destructive'}
                                    className="text-xs gap-1"
                                  >
                                    {vote.vote ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                                    {ROLE_LABELS[vote.role as AppRole] || vote.role}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Vote Buttons */}
                          <div className="flex gap-2">
                            {userVote ? (
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedNomination(nomination);
                                  setVoteComment(userVote.comment || '');
                                  setVoteDialogOpen(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                แก้ไขโหวต ({userVote.vote ? 'เห็นชอบ' : 'ไม่เห็นชอบ'})
                              </Button>
                            ) : (
                              <Button
                                variant="success"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedNomination(nomination);
                                  setVoteDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                โหวต
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredNominations.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">ไม่พบข้อมูล</h3>
              <p className="text-muted-foreground">
                ไม่มีเอกสารที่ต้องพิจารณาในขณะนี้
              </p>
            </div>
          )}
        </div>

        {/* Vote Dialog */}
        <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>โหวตเอกสาร</DialogTitle>
              <DialogDescription>
                เลือกเห็นชอบหรือไม่เห็นชอบ และเพิ่มความคิดเห็น (ถ้ามี)
              </DialogDescription>
            </DialogHeader>
            
            {selectedNomination && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="font-medium">{selectedNomination.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {AWARD_CATEGORIES[selectedNomination.category as keyof typeof AWARD_CATEGORIES]?.label}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">ความคิดเห็น (ไม่บังคับ)</label>
                  <Textarea
                    placeholder="เพิ่มความคิดเห็นของคุณ..."
                    value={voteComment}
                    onChange={(e) => setVoteComment(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setVoteDialogOpen(false)}
                disabled={submittingVote}
              >
                ยกเลิก
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleVote(false)}
                disabled={submittingVote}
              >
                {submittingVote ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                ไม่เห็นชอบ
              </Button>
              <Button
                variant="success"
                onClick={() => handleVote(true)}
                disabled={submittingVote}
              >
                {submittingVote ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                เห็นชอบ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
