import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { Campus } from '@/types/roles';

interface CampusManagementProps {
  campuses: Campus[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function CampusManagement({ campuses, loading, onRefresh }: CampusManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [campusCode, setCampusCode] = useState('');
  const [campusName, setCampusName] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setCampusCode('');
    setCampusName('');
    setEditingCampus(null);
  };

  const openEditDialog = (campus: Campus) => {
    setEditingCampus(campus);
    setCampusCode(campus.campus_code);
    setCampusName(campus.campus_name);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusCode.trim() || !campusName.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setSaving(true);
    try {
      if (editingCampus) {
        const { error } = await supabase
          .from('campuses')
          .update({ campus_code: campusCode.trim(), campus_name: campusName.trim() })
          .eq('id', editingCampus.id);
        if (error) throw error;
        toast.success('อัปเดตวิทยาเขตสำเร็จ');
      } else {
        const { error } = await supabase
          .from('campuses')
          .insert({ campus_code: campusCode.trim(), campus_name: campusName.trim() });
        if (error) throw error;
        toast.success('เพิ่มวิทยาเขตสำเร็จ');
      }
      resetForm();
      setIsDialogOpen(false);
      await onRefresh();
    } catch (error: unknown) {
      console.error('Error saving campus:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (campus: Campus) => {
    if (!confirm(`ต้องการลบวิทยาเขต "${campus.campus_name}" หรือไม่?`)) return;

    try {
      const { error } = await supabase
        .from('campuses')
        .delete()
        .eq('id', campus.id);
      if (error) throw error;
      toast.success('ลบวิทยาเขตสำเร็จ');
      await onRefresh();
    } catch (error: unknown) {
      console.error('Error deleting campus:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            วิทยาเขต
          </CardTitle>
          <CardDescription>
            จัดการข้อมูลวิทยาเขตในมหาวิทยาลัย
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มวิทยาเขต
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCampus ? 'แก้ไขวิทยาเขต' : 'เพิ่มวิทยาเขตใหม่'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campus_code">รหัสวิทยาเขต</Label>
                <Input
                  id="campus_code"
                  value={campusCode}
                  onChange={(e) => setCampusCode(e.target.value)}
                  placeholder="เช่น BGK, KPS"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campus_name">ชื่อวิทยาเขต</Label>
                <Input
                  id="campus_name"
                  value={campusName}
                  onChange={(e) => setCampusName(e.target.value)}
                  placeholder="เช่น วิทยาเขตบางเขน"
                  required
                />
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
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อวิทยาเขต</TableHead>
                <TableHead className="text-right">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    ยังไม่มีข้อมูลวิทยาเขต
                  </TableCell>
                </TableRow>
              ) : (
                campuses.map((campus) => (
                  <TableRow key={campus.id}>
                    <TableCell>
                      <Badge variant="outline">{campus.campus_code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{campus.campus_name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(campus)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(campus)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
