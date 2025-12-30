import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Building2, GraduationCap, Shield, MapPin, UserCheck } from 'lucide-react';
import { POSITION_LABELS } from '@/types/database';
import type { PersonnelPosition } from '@/types/database';
import { CampusManagement } from '@/components/admin/CampusManagement';
import { RoleManagement } from '@/components/admin/RoleManagement';
import { CommitteeManagement } from '@/components/admin/CommitteeManagement';
import type { Campus } from '@/types/roles';

interface Faculty {
  id: string;
  faculty_code: string;
  faculty_name: string;
  campus_id: string | null;
  campus?: Campus;
}

interface Department {
  id: string;
  dept_code: string;
  dept_name: string;
  faculty_id: string;
  faculty?: Faculty;
}

interface UserWithProfile {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  student_profile: {
    first_name: string;
    last_name: string;
    student_code: string | null;
  } | null;
  personnel_profile: {
    first_name: string;
    last_name: string;
    position: PersonnelPosition;
  } | null;
}

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [facultiesRes, departmentsRes, usersRes, campusesRes] = await Promise.all([
        supabase.from('faculties').select('*, campus:campuses(*)').order('faculty_code'),
        supabase.from('departments').select('*, faculty:faculties(*)').order('dept_code'),
        supabase.from('users').select(`
          *,
          student_profile:student_profiles(first_name, last_name, student_code),
          personnel_profile:personnel_profiles(first_name, last_name, position)
        `).order('email'),
        supabase.from('campuses').select('*').order('campus_code'),
      ]);

      if (facultiesRes.error) throw facultiesRes.error;
      if (departmentsRes.error) throw departmentsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (campusesRes.error) throw campusesRes.error;

      setFaculties(facultiesRes.data || []);
      setDepartments(departmentsRes.data || []);
      setUsers((usersRes.data as unknown as UserWithProfile[]) || []);
      setCampuses(campusesRes.data || []);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'staff': return 'default';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'staff': return 'เจ้าหน้าที่';
      default: return 'นิสิต';
    }
  };

  const getDisplayName = (u: UserWithProfile) => {
    if (u.student_profile) {
      return `${u.student_profile.first_name} ${u.student_profile.last_name}`;
    }
    if (u.personnel_profile) {
      return `${u.personnel_profile.first_name} ${u.personnel_profile.last_name}`;
    }
    return u.email.split('@')[0];
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            จัดการระบบ
          </h1>
          <p className="text-muted-foreground mt-2">
            จัดการผู้ใช้ บทบาท วิทยาเขต คณะ และภาควิชา
          </p>
        </div>

        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-[720px]">
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">บทบาท</span>
            </TabsTrigger>
            <TabsTrigger value="committee" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">กรรมการ</span>
            </TabsTrigger>
            <TabsTrigger value="campuses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">วิทยาเขต</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">ผู้ใช้</span>
            </TabsTrigger>
            <TabsTrigger value="faculties" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">คณะ</span>
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">ภาควิชา</span>
            </TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <RoleManagement 
              campuses={campuses} 
              loading={loadingData} 
              onRefresh={fetchData} 
            />
          </TabsContent>

          {/* Committee Tab */}
          <TabsContent value="committee">
            <CommitteeManagement 
              campuses={campuses} 
              loading={loadingData} 
              onRefresh={fetchData} 
            />
          </TabsContent>

          {/* Campuses Tab */}
          <TabsContent value="campuses">
            <CampusManagement 
              campuses={campuses} 
              loading={loadingData} 
              onRefresh={fetchData} 
            />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>รายชื่อผู้ใช้ทั้งหมด</CardTitle>
                <CardDescription>
                  ผู้ใช้ที่ลงทะเบียนในระบบ (ใช้แท็บ "บทบาท" เพื่อกำหนดสิทธิ์)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อ-นามสกุล</TableHead>
                        <TableHead>อีเมล</TableHead>
                        <TableHead>ประเภท (เดิม)</TableHead>
                        <TableHead>ตำแหน่ง</TableHead>
                        <TableHead>สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            ยังไม่มีผู้ใช้ในระบบ
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">
                              {getDisplayName(u)}
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(u.role)}>
                                {getRoleLabel(u.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {u.personnel_profile?.position ? (
                                <Badge variant="outline">
                                  {POSITION_LABELS[u.personnel_profile.position]}
                                </Badge>
                              ) : u.student_profile?.student_code ? (
                                <span className="text-muted-foreground text-sm">
                                  {u.student_profile.student_code}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_active ? 'default' : 'secondary'}>
                                {u.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Faculties Tab */}
          <TabsContent value="faculties">
            <Card>
              <CardHeader>
                <CardTitle>รายชื่อคณะ</CardTitle>
                <CardDescription>
                  จัดการข้อมูลคณะในมหาวิทยาลัย
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัสคณะ</TableHead>
                        <TableHead>ชื่อคณะ</TableHead>
                        <TableHead>วิทยาเขต</TableHead>
                        <TableHead>จำนวนภาควิชา</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faculties.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            ยังไม่มีข้อมูลคณะ
                          </TableCell>
                        </TableRow>
                      ) : (
                        faculties.map((faculty) => (
                          <TableRow key={faculty.id}>
                            <TableCell>
                              <Badge variant="outline">{faculty.faculty_code}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{faculty.faculty_name}</TableCell>
                            <TableCell>
                              {faculty.campus ? (
                                <Badge variant="secondary">{faculty.campus.campus_name}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {departments.filter(d => d.faculty_id === faculty.id).length} ภาควิชา
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments">
            <Card>
              <CardHeader>
                <CardTitle>รายชื่อภาควิชา</CardTitle>
                <CardDescription>
                  จัดการข้อมูลภาควิชาในแต่ละคณะ
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัสภาควิชา</TableHead>
                        <TableHead>ชื่อภาควิชา</TableHead>
                        <TableHead>คณะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            ยังไม่มีข้อมูลภาควิชา
                          </TableCell>
                        </TableRow>
                      ) : (
                        departments.map((dept) => (
                          <TableRow key={dept.id}>
                            <TableCell>
                              <Badge variant="outline">{dept.dept_code}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{dept.dept_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {dept.faculty?.faculty_name || '-'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
