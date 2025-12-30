import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';

interface StatusCount {
  status: string;
  count: number;
}

interface AwardTypeCount {
  award_type: string;
  count: number;
}

interface MonthlyData {
  month: string;
  applications: number;
  approved: number;
}

const STATUS_LABELS: Record<string, string> = {
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

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c43',
  '#a4a4a4',
];

export function StatisticsCharts() {
  const [statusData, setStatusData] = useState<StatusCount[]>([]);
  const [awardData, setAwardData] = useState<AwardTypeCount[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      // Fetch applications with status
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('current_status, award_type_id, created_at, award_types(type_name)');

      if (appError) throw appError;

      // Count by status
      const statusCounts = applications?.reduce((acc, app) => {
        const status = app.current_status || 'draft';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statusArray = Object.entries(statusCounts || {}).map(([status, count]) => ({
        status: STATUS_LABELS[status] || status,
        count: count as number,
      }));
      setStatusData(statusArray);

      // Count by award type
      const awardCounts = applications?.reduce((acc, app) => {
        const typeName = (app.award_types as { type_name: string } | null)?.type_name || 'ไม่ระบุ';
        acc[typeName] = (acc[typeName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const awardArray = Object.entries(awardCounts || {}).map(([award_type, count]) => ({
        award_type,
        count: count as number,
      }));
      setAwardData(awardArray);

      // Monthly data (last 6 months)
      const months: MonthlyData[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
        
        const monthApps = applications?.filter(app => {
          const appDate = new Date(app.created_at || '');
          return appDate.getMonth() === date.getMonth() && 
                 appDate.getFullYear() === date.getFullYear();
        }) || [];

        const approved = monthApps.filter(app => app.current_status === 'approved').length;

        months.push({
          month: monthName,
          applications: monthApps.length,
          approved,
        });
      }
      setMonthlyData(months);

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
        <TabsTrigger value="status">ตามสถานะ</TabsTrigger>
        <TabsTrigger value="trend">แนวโน้ม</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Pie Chart - By Award Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">จำแนกตามประเภทรางวัล</CardTitle>
              <CardDescription>สัดส่วนใบสมัครแต่ละประเภท</CardDescription>
            </CardHeader>
            <CardContent>
              {awardData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  ยังไม่มีข้อมูล
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={awardData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ award_type, percent }) => 
                        `${award_type} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {awardData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart - By Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">จำแนกตามสถานะ</CardTitle>
              <CardDescription>จำนวนใบสมัครในแต่ละขั้นตอน</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  ยังไม่มีข้อมูล
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="status" 
                      type="category" 
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="status">
        <Card>
          <CardHeader>
            <CardTitle>สถานะใบสมัครทั้งหมด</CardTitle>
            <CardDescription>แสดงจำนวนใบสมัครในแต่ละสถานะ</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                ยังไม่มีข้อมูล
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="status" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trend">
        <Card>
          <CardHeader>
            <CardTitle>แนวโน้มรายเดือน</CardTitle>
            <CardDescription>จำนวนใบสมัครและการอนุมัติย้อนหลัง 6 เดือน</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                ยังไม่มีข้อมูล
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="applications" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="ใบสมัครทั้งหมด"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="approved" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="อนุมัติแล้ว"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
