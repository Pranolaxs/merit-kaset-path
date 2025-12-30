import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Users, Trash2, Crown, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Campus } from '@/types/roles';

interface AcademicPeriod {
  id: string;
  academic_year: number;
  semester: number;
  is_active: boolean;
}

interface PeriodInfo {
  academic_year: number;
  semester: number;
  is_active: boolean;
}

interface CommitteeAssignment {
  id: string;
  period_id: string;
  user_id: string;
  role: 'committee_member' | 'committee_chairman';
  campus_id: string | null;
  is_active: boolean;
  user?: {
    email: string;
    personnel_profile?: {
      first_name: string;
      last_name: string;
    };
  };
  campus?: { campus_name: string };
  period?: PeriodInfo;
}

interface UserOption {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface CommitteeManagementProps {
  campuses: Campus[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function CommitteeManagement({ campuses, loading: parentLoading, onRefresh }: CommitteeManagementProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignments, setAssignments] = useState<CommitteeAssignment[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'committee_member' | 'committee_chairman'>('committee_member');
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('committee_assignments')
        .select(`
          *,
          campus:campuses(campus_name),
          period:academic_periods(academic_year, semester, is_active)
        `)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Fetch user info for assignments
      const userIds = assignmentsData?.map(a => a.user_id) || [];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds);

        const { data: profilesData } = await supabase
          .from('personnel_profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        const usersMap: Record<string, { email: string }> = {};
        usersData?.forEach(u => { usersMap[u.id] = { email: u.email }; });

        const profilesMap: Record<string, { first_name: string; last_name: string }> = {};
        profilesData?.forEach(p => { profilesMap[p.user_id] = p; });

        const assignmentsWithUsers = assignmentsData?.map(a => ({
          ...a,
          user: {
            email: usersMap[a.user_id]?.email || '',
            personnel_profile: profilesMap[a.user_id] || null,
          },
        })) || [];

        setAssignments(assignmentsWithUsers as CommitteeAssignment[]);
      } else {
        setAssignments([]);
      }

      // Fetch periods
      const { data: periodsData } = await supabase
        .from('academic_periods')
        .select('*')
        .order('academic_year', { ascending: false });
      setPeriods(periodsData || []);

      // Fetch all users for selection
      const { data: allUsersData } = await supabase
        .from('users')
        .select('id, email')
        .order('email');

      const { data: allProfilesData } = await supabase
        .from('personnel_profiles')
        .select('user_id, first_name, last_name');

      const profilesLookup: Record<string, { first_name: string; last_name: string }> = {};
      allProfilesData?.forEach(p => { profilesLookup[p.user_id] = p; });

      const usersWithProfiles = allUsersData?.map(u => ({
        id: u.id,
        email: u.email,
        first_name: profilesLookup[u.id]?.first_name,
        last_name: profilesLookup[u.id]?.last_name,
      })) || [];

      setUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPeriodId('');
    setSelectedUserId('');
    setSelectedRole('committee_member');
    setSelectedCampusId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId || !selectedUserId || !user) {
      toast.error('กรุณาเลือกข้อมูลให้ครบถ้วน');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('committee_assignments')
        .insert({
          period_id: selectedPeriodId,
          user_id: selectedUserId,
          role: selectedRole,
          campus_id: selectedCampusId || null,
          assigned_by: user.id,
        });

      if (error) throw error;

      // Also add to user_roles if not exists
      await supabase
        .from('user_roles')
        .upsert({
          user_id: selectedUserId,
          role: selectedRole,
          campus_id: selectedCampusId || null,
        }, { onConflict: 'user_id,role,campus_id,faculty_id,department_id' });

      toast.success('เพิ่มกรรมการสำเร็จ');
      resetForm();
      setIsDialogOpen(false);
      await fetchData();
      await onRefresh();
    } catch (error: unknown) {
      console.error('Error adding committee member:', error);
      toast.error('เกิดข้อผิดพลาด อาจมีการกำหนดกรรมการซ้ำ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignment: CommitteeAssignment) => {
    const name = assignment.user?.personnel_profile
      ? `${assignment.user.personnel_profile.first_name} ${assignment.user.personnel_profile.last_name}`
      : assignment.user?.email;

    if (!confirm(`ต้องการลบ "${name}" ออกจากคณะกรรมการหรือไม่?`)) return;

    try {
      const { error } = await supabase
        .from('committee_assignments')
        .delete()
        .eq('id', assignment.id);

      if (error) throw error;
      toast.success('ลบกรรมการสำเร็จ');
      await fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const getDisplayName = (assignment: CommitteeAssignment) => {
    if (assignment.user?.personnel_profile) {
      return `${assignment.user.personnel_profile.first_name} ${assignment.user.personnel_profile.last_name}`;
    }
    return assignment.user?.email?.split('@')[0] || 'ไม่ทราบ';
  };

  const getUserDisplayName = (u: UserOption) => {
    if (u.first_name && u.last_name) {
      return `${u.first_name} ${u.last_name}`;
    }
    return u.email.split('@')[0];
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            คณะกรรมการพิจารณา
          </CardTitle>
          <CardDescription>
            กำหนดชุดคณะกรรมการพิจารณานิสิตดีเด่นในแต่ละรอบ
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มกรรมการ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มกรรมการใหม่</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>ปีการศึกษา/ภาคเรียน</Label>
                <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกรอบ" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map(period => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.semester}/{period.academic_year} {period.is_active && '(ปัจจุบัน)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ผู้ใช้</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ใช้" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {getUserDisplayName(u)} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>บทบาท</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as typeof selectedRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="committee_member">
                      <span className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        กรรมการ
                      </span>
                    </SelectItem>
                    <SelectItem value="committee_chairman">
                      <span className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        ประธานกรรมการ
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>วิทยาเขต (ถ้ามี)</Label>
                <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวิทยาเขต" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ทุกวิทยาเขต</SelectItem>
                    {campuses.map(campus => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.campus_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading || parentLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>รอบ</TableHead>
                <TableHead>วิทยาเขต</TableHead>
                <TableHead className="text-right">ลบ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    ยังไม่มีการกำหนดกรรมการ
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{getDisplayName(assignment)}</span>
                        <span className="text-xs text-muted-foreground">{assignment.user?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={assignment.role === 'committee_chairman' ? 'default' : 'secondary'}>
                        {assignment.role === 'committee_chairman' ? (
                          <span className="flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            ประธาน
                          </span>
                        ) : (
                          'กรรมการ'
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.period && (
                        <Badge variant="outline">
                          {assignment.period.semester}/{assignment.period.academic_year}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.campus ? (
                        <Badge variant="secondary">{assignment.campus.campus_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">ทุกวิทยาเขต</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(assignment)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
