import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

interface AcademicPeriod {
  id: string;
  academic_year: number;
  semester: number;
}

export function ReportExport() {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);

  useState(() => {
    const fetchPeriods = async () => {
      const { data } = await supabase
        .from('academic_periods')
        .select('id, academic_year, semester')
        .order('academic_year', { ascending: false });
      setPeriods(data || []);
      setIsLoadingPeriods(false);
    };
    fetchPeriods();
  });

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      let query = supabase
        .from('applications')
        .select(`
          id,
          current_status,
          created_at,
          project_name,
          achievements,
          activity_hours,
          student:users!applications_student_id_fkey(email),
          student_profile:student_profiles!inner(first_name, last_name, student_code),
          award_type:award_types(type_name),
          period:academic_periods(academic_year, semester)
        `);

      if (selectedPeriod !== 'all') {
        query = query.eq('period_id', selectedPeriod);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('current_status', selectedStatus as "approved" | "chairman_review" | "committee_review" | "dept_review" | "draft" | "faculty_review" | "president_review" | "rejected" | "student_affairs_review" | "submitted");
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('ไม่พบข้อมูลตามเงื่อนไขที่เลือก');
        return;
      }

      // Build CSV
      const headers = [
        'รหัสนิสิต',
        'ชื่อ-นามสกุล',
        'อีเมล',
        'ประเภทรางวัล',
        'ชื่อโครงการ/ผลงาน',
        'ชั่วโมงกิจกรรม',
        'ปีการศึกษา',
        'ภาคเรียน',
        'สถานะ',
        'วันที่สมัคร',
      ];

      const statusLabels: Record<string, string> = {
        draft: 'ฉบับร่าง',
        submitted: 'ส่งแล้ว',
        dept_review: 'ภาควิชาพิจารณา',
        faculty_review: 'คณะพิจารณา',
        student_affairs_review: 'กองพัฒนานิสิต',
        committee_review: 'คณะกรรมการโหวต',
        chairman_review: 'ประธานรับรอง',
        president_review: 'อธิการบดีอนุมัติ',
        approved: 'อนุมัติแล้ว',
        rejected: 'ไม่ผ่าน',
      };

      const rows = data.map((app) => {
        const profile = Array.isArray(app.student_profile) ? app.student_profile[0] : app.student_profile;
        const student = app.student as { email: string } | null;
        const awardType = app.award_type as { type_name: string } | null;
        const period = app.period as { academic_year: number; semester: number } | null;
        
        return [
          profile?.student_code || '-',
          profile ? `${profile.first_name} ${profile.last_name}` : '-',
          student?.email || '-',
          awardType?.type_name || '-',
          app.project_name || '-',
          app.activity_hours || '-',
          period?.academic_year || '-',
          period?.semester === 1 ? 'ภาคต้น' : period?.semester === 2 ? 'ภาคปลาย' : 'ภาคฤดูร้อน',
          statusLabels[app.current_status || 'draft'] || app.current_status,
          app.created_at ? new Date(app.created_at).toLocaleDateString('th-TH') : '-',
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Add BOM for Excel UTF-8 support
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`ส่งออกข้อมูล ${data.length} รายการสำเร็จ`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          ส่งออกรายงาน
        </CardTitle>
        <CardDescription>ดาวน์โหลดข้อมูลใบสมัครเป็นไฟล์ CSV</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>ปีการศึกษา</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกปีการศึกษา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.academic_year} / {period.semester === 1 ? 'ภาคต้น' : period.semester === 2 ? 'ภาคปลาย' : 'ภาคฤดูร้อน'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>สถานะ</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="rejected">ไม่ผ่าน</SelectItem>
                <SelectItem value="committee_review">รอคณะกรรมการ</SelectItem>
                <SelectItem value="faculty_review">รอคณะพิจารณา</SelectItem>
                <SelectItem value="dept_review">รอภาควิชาพิจารณา</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={exportToCSV} disabled={isExporting} className="w-full sm:w-auto">
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังส่งออก...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลด CSV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
