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
import { Plus, Shield, Trash2 } from 'lucide-react';
import { APP_ROLE_LABELS, APP_ROLE_ORDER } from '@/types/roles';
import type { AppRole, Campus, UserRole } from '@/types/roles';

interface UserForRole {
  id: string;
  email: string;
  student_profile: { first_name: string; last_name: string } | null;
  personnel_profile: { first_name: string; last_name: string } | null;
}

interface RoleManagementProps {
  campuses: Campus[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function RoleManagement({ campuses, loading, onRefresh }: RoleManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserForRole[]>([]);
  const [allRoles, setAllRoles] = useState<(UserRole & { user?: UserForRole })[]>([]);
  const [faculties, setFaculties] = useState<{ id: string; faculty_name: string; campus_id: string | null }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; dept_name: string; faculty_id: string }[]>([]);
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes, facultiesRes, deptRes] = await Promise.all([
        supabase.from('users').select(`
          id, email,
          student_profile:student_profiles(first_name, last_name),
          personnel_profile:personnel_profiles(first_name, last_name)
        `).order('email'),
        supabase.from('user_roles').select(`
          *,
          campus:campuses(id, campus_name),
          faculty:faculties(id, faculty_name),
          department:departments(id, dept_name)
        `).order('created_at', { ascending: false }),
        supabase.from('faculties').select('id, faculty_name, campus_id').order('faculty_name'),
        supabase.from('departments').select('id, dept_name, faculty_id').order('dept_name'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (facultiesRes.error) throw facultiesRes.error;
      if (deptRes.error) throw deptRes.error;

      const usersData = (usersRes.data as unknown as UserForRole[]) || [];
      setUsers(usersData);
      
      // Map roles with user data
      const rolesData = rolesRes.data || [];
      const rolesWithUsers = rolesData.map(role => ({
        ...role,
        user: usersData.find(u => u.id === role.user_id),
      }));
      setAllRoles(rolesWithUsers as (UserRole & { user?: UserForRole })[]);
      setFaculties(facultiesRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
  };

  const resetForm = () => {
    setSelectedUserId('');
    setSelectedRole('');
    setSelectedCampusId('');
    setSelectedFacultyId('');
    setSelectedDepartmentId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedRole) {
      toast.error('กรุณาเลือกผู้ใช้และบทบาท');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUserId,
          role: selectedRole,
          campus_id: selectedCampusId || null,
          faculty_id: selectedFacultyId || null,
          department_id: selectedDepartmentId || null,
        });

      if (error) throw error;
      toast.success('เพิ่มบทบาทสำเร็จ');
      resetForm();
      setIsDialogOpen(false);
      await fetchData();
      await onRefresh();
    } catch (error: unknown) {
      console.error('Error assigning role:', error);
      toast.error('เกิดข้อผิดพลาด อาจเป็นเพราะบทบาทนี้ซ้ำกับที่มีอยู่');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: UserRole) => {
    if (!confirm(`ต้องการลบบทบาท "${APP_ROLE_LABELS[role.role]}" หรือไม่?`)) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', role.id);
      if (error) throw error;
      toast.success('ลบบทบาทสำเร็จ');
      await fetchData();
      await onRefresh();
    } catch (error: unknown) {
      console.error('Error deleting role:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const getDisplayName = (user?: UserForRole) => {
    if (!user) return 'ไม่ทราบ';
    if (user.student_profile) {
      return `${user.student_profile.first_name} ${user.student_profile.last_name}`;
    }
    if (user.personnel_profile) {
      return `${user.personnel_profile.first_name} ${user.personnel_profile.last_name}`;
    }
    return user.email.split('@')[0];
  };

  const filteredFaculties = selectedCampusId 
    ? faculties.filter(f => f.campus_id === selectedCampusId)
    : faculties;

  const filteredDepartments = selectedFacultyId
    ? departments.filter(d => d.faculty_id === selectedFacultyId)
    : [];

  const getRoleBadgeVariant = (role: AppRole) => {
    if (role === 'system_admin') return 'destructive';
    if (['president', 'committee_chairman', 'dean'].includes(role)) return 'default';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            บทบาทผู้ใช้
          </CardTitle>
          <CardDescription>
            กำหนดบทบาทและสิทธิ์ให้ผู้ใช้ตามวิทยาเขต/คณะ/ภาควิชา
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มบทบาท
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มบทบาทใหม่</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>ผู้ใช้</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ใช้" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {getDisplayName(user)} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>บทบาท</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_ROLE_ORDER.map(role => (
                      <SelectItem key={role} value={role}>
                        {APP_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>วิทยาเขต (ถ้ามี)</Label>
                <Select value={selectedCampusId} onValueChange={(v) => {
                  setSelectedCampusId(v);
                  setSelectedFacultyId('');
                  setSelectedDepartmentId('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวิทยาเขต" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ไม่ระบุ</SelectItem>
                    {campuses.map(campus => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.campus_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>คณะ (ถ้ามี)</Label>
                <Select value={selectedFacultyId} onValueChange={(v) => {
                  setSelectedFacultyId(v);
                  setSelectedDepartmentId('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกคณะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ไม่ระบุ</SelectItem>
                    {filteredFaculties.map(faculty => (
                      <SelectItem key={faculty.id} value={faculty.id}>
                        {faculty.faculty_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ภาควิชา (ถ้ามี)</Label>
                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกภาควิชา" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ไม่ระบุ</SelectItem>
                    {filteredDepartments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.dept_name}
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
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้ใช้</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>วิทยาเขต</TableHead>
                <TableHead>คณะ/ภาควิชา</TableHead>
                <TableHead className="text-right">ลบ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    ยังไม่มีการกำหนดบทบาท
                  </TableCell>
                </TableRow>
              ) : (
                allRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{getDisplayName(role.user)}</span>
                        <span className="text-xs text-muted-foreground">{role.user?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(role.role)}>
                        {APP_ROLE_LABELS[role.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {role.campus ? (
                        <Badge variant="outline">{role.campus.campus_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {role.faculty && (
                          <Badge variant="secondary" className="text-xs w-fit">
                            {role.faculty.faculty_name}
                          </Badge>
                        )}
                        {role.department && (
                          <Badge variant="outline" className="text-xs w-fit">
                            {role.department.dept_name}
                          </Badge>
                        )}
                        {!role.faculty && !role.department && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(role)}
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
