import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Edit2, Trash2, Calendar, Award } from 'lucide-react';
import type { Campus } from '@/types/roles';

interface AcademicPeriod {
  id: string;
  academic_year: number;
  semester: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  campus_id: string | null;
  campus?: Campus;
}

interface AwardType {
  id: string;
  type_code: string;
  type_name: string;
  description: string | null;
}

interface SystemConfigurationProps {
  campuses: Campus[];
  loading: boolean;
  onRefresh: () => void;
}

export function SystemConfiguration({ campuses, loading, onRefresh }: SystemConfigurationProps) {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [awardTypes, setAwardTypes] = useState<AwardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Period dialog state
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<AcademicPeriod | null>(null);
  const [periodForm, setPeriodForm] = useState({
    academic_year: new Date().getFullYear() + 543,
    semester: 1,
    start_date: '',
    end_date: '',
    campus_id: '',
    is_active: false,
  });

  // Award dialog state
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<AwardType | null>(null);
  const [awardForm, setAwardForm] = useState({
    type_code: '',
    type_name: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [periodsRes, awardsRes] = await Promise.all([
        supabase.from('academic_periods').select('*, campus:campuses(*)').order('academic_year', { ascending: false }),
        supabase.from('award_types').select('*').order('type_code'),
      ]);

      if (periodsRes.error) throw periodsRes.error;
      if (awardsRes.error) throw awardsRes.error;

      setPeriods(periodsRes.data || []);
      setAwardTypes(awardsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  // Period functions
  const handleSavePeriod = async () => {
    try {
      const periodData = {
        academic_year: periodForm.academic_year,
        semester: periodForm.semester,
        start_date: periodForm.start_date,
        end_date: periodForm.end_date,
        campus_id: periodForm.campus_id || null,
        is_active: periodForm.is_active,
      };

      if (editingPeriod) {
        const { error } = await supabase
          .from('academic_periods')
          .update(periodData)
          .eq('id', editingPeriod.id);
        if (error) throw error;
        toast.success('อัปเดตปีการศึกษาสำเร็จ');
      } else {
        const { error } = await supabase
          .from('academic_periods')
          .insert(periodData);
        if (error) throw error;
        toast.success('เพิ่มปีการศึกษาสำเร็จ');
      }

      setPeriodDialogOpen(false);
      setEditingPeriod(null);
      resetPeriodForm();
      fetchData();
    } catch (error) {
      console.error('Error saving period:', error);
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm('ต้องการลบปีการศึกษานี้หรือไม่?')) return;
    try {
      const { error } = await supabase.from('academic_periods').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบปีการศึกษาสำเร็จ');
      fetchData();
    } catch (error) {
      console.error('Error deleting period:', error);
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleEditPeriod = (period: AcademicPeriod) => {
    setEditingPeriod(period);
    setPeriodForm({
      academic_year: period.academic_year,
      semester: period.semester,
      start_date: period.start_date,
      end_date: period.end_date,
      campus_id: period.campus_id || '',
      is_active: period.is_active || false,
    });
    setPeriodDialogOpen(true);
  };

  const resetPeriodForm = () => {
    setPeriodForm({
      academic_year: new Date().getFullYear() + 543,
      semester: 1,
      start_date: '',
      end_date: '',
      campus_id: '',
      is_active: false,
    });
  };

  // Award functions
  const handleSaveAward = async () => {
    try {
      if (editingAward) {
        const { error } = await supabase
          .from('award_types')
          .update({
            type_code: awardForm.type_code,
            type_name: awardForm.type_name,
            description: awardForm.description || null,
          })
          .eq('id', editingAward.id);
        if (error) throw error;
        toast.success('อัปเดตประเภทรางวัลสำเร็จ');
      } else {
        const { error } = await supabase
          .from('award_types')
          .insert({
            type_code: awardForm.type_code,
            type_name: awardForm.type_name,
            description: awardForm.description || null,
          });
        if (error) throw error;
        toast.success('เพิ่มประเภทรางวัลสำเร็จ');
      }

      setAwardDialogOpen(false);
      setEditingAward(null);
      resetAwardForm();
      fetchData();
    } catch (error) {
      console.error('Error saving award:', error);
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleDeleteAward = async (id: string) => {
    if (!confirm('ต้องการลบประเภทรางวัลนี้หรือไม่?')) return;
    try {
      const { error } = await supabase.from('award_types').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบประเภทรางวัลสำเร็จ');
      fetchData();
    } catch (error) {
      console.error('Error deleting award:', error);
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleEditAward = (award: AwardType) => {
    setEditingAward(award);
    setAwardForm({
      type_code: award.type_code,
      type_name: award.type_name,
      description: award.description || '',
    });
    setAwardDialogOpen(true);
  };

  const resetAwardForm = () => {
    setAwardForm({
      type_code: '',
      type_name: '',
      description: '',
    });
  };

  if (isLoading || loading) {
    return (
      <Card>
        <CardContent className="py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Academic Periods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              ปีการศึกษา
            </CardTitle>
            <CardDescription>จัดการช่วงเวลารับสมัครนิสิตดีเด่น</CardDescription>
          </div>
          <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingPeriod(null); resetPeriodForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มปีการศึกษา
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPeriod ? 'แก้ไขปีการศึกษา' : 'เพิ่มปีการศึกษา'}</DialogTitle>
                <DialogDescription>กำหนดช่วงเวลารับสมัคร</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ปีการศึกษา (พ.ศ.)</Label>
                    <Input
                      type="number"
                      value={periodForm.academic_year}
                      onChange={(e) => setPeriodForm({ ...periodForm, academic_year: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ภาคเรียน</Label>
                    <Select
                      value={periodForm.semester.toString()}
                      onValueChange={(v) => setPeriodForm({ ...periodForm, semester: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">ภาคต้น</SelectItem>
                        <SelectItem value="2">ภาคปลาย</SelectItem>
                        <SelectItem value="3">ภาคฤดูร้อน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>วันเริ่มต้น</Label>
                    <Input
                      type="date"
                      value={periodForm.start_date}
                      onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันสิ้นสุด</Label>
                    <Input
                      type="date"
                      value={periodForm.end_date}
                      onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>วิทยาเขต</Label>
                  <Select
                    value={periodForm.campus_id}
                    onValueChange={(v) => setPeriodForm({ ...periodForm, campus_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ทุกวิทยาเขต" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">ทุกวิทยาเขต</SelectItem>
                      {campuses.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.campus_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={periodForm.is_active}
                    onCheckedChange={(checked) => setPeriodForm({ ...periodForm, is_active: checked })}
                  />
                  <Label htmlFor="is_active">เปิดรับสมัคร</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleSavePeriod}>
                  {editingPeriod ? 'บันทึก' : 'เพิ่ม'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ปีการศึกษา</TableHead>
                <TableHead>ภาคเรียน</TableHead>
                <TableHead>ช่วงเวลา</TableHead>
                <TableHead>วิทยาเขต</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    ยังไม่มีข้อมูลปีการศึกษา
                  </TableCell>
                </TableRow>
              ) : (
                periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">{period.academic_year}</TableCell>
                    <TableCell>
                      {period.semester === 1 ? 'ภาคต้น' : period.semester === 2 ? 'ภาคปลาย' : 'ภาคฤดูร้อน'}
                    </TableCell>
                    <TableCell>
                      {new Date(period.start_date).toLocaleDateString('th-TH')} - {new Date(period.end_date).toLocaleDateString('th-TH')}
                    </TableCell>
                    <TableCell>
                      {period.campus ? (
                        <Badge variant="secondary">{period.campus.campus_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">ทุกวิทยาเขต</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={period.is_active ? 'default' : 'outline'}>
                        {period.is_active ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditPeriod(period)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePeriod(period.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Award Types */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              ประเภทรางวัล
            </CardTitle>
            <CardDescription>จัดการประเภทรางวัลนิสิตดีเด่น</CardDescription>
          </div>
          <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingAward(null); resetAwardForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มประเภทรางวัล
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAward ? 'แก้ไขประเภทรางวัล' : 'เพิ่มประเภทรางวัล'}</DialogTitle>
                <DialogDescription>กำหนดประเภทรางวัลนิสิตดีเด่น</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>รหัสประเภท</Label>
                  <Input
                    value={awardForm.type_code}
                    onChange={(e) => setAwardForm({ ...awardForm, type_code: e.target.value })}
                    placeholder="เช่น EXTRACURRICULAR"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ชื่อประเภท</Label>
                  <Input
                    value={awardForm.type_name}
                    onChange={(e) => setAwardForm({ ...awardForm, type_name: e.target.value })}
                    placeholder="เช่น ด้านกิจกรรมนอกหลักสูตร"
                  />
                </div>
                <div className="space-y-2">
                  <Label>รายละเอียด</Label>
                  <Textarea
                    value={awardForm.description}
                    onChange={(e) => setAwardForm({ ...awardForm, description: e.target.value })}
                    placeholder="รายละเอียดและเกณฑ์การพิจารณา"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAwardDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleSaveAward}>
                  {editingAward ? 'บันทึก' : 'เพิ่ม'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อประเภท</TableHead>
                <TableHead>รายละเอียด</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awardTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    ยังไม่มีประเภทรางวัล
                  </TableCell>
                </TableRow>
              ) : (
                awardTypes.map((award) => (
                  <TableRow key={award.id}>
                    <TableCell>
                      <Badge variant="outline">{award.type_code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{award.type_name}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {award.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditAward(award)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAward(award.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
