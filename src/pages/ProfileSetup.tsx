import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Loader2, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Campus {
  id: string;
  campus_name: string;
}

interface Faculty {
  id: string;
  faculty_name: string;
  campus_id: string | null;
}

interface Department {
  id: string;
  dept_name: string;
  faculty_id: string;
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, userProfile, refreshProfile, isProfileComplete } = useAuth();
  
  const [selectedCampus, setSelectedCampus] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if profile is already complete
  useEffect(() => {
    if (isProfileComplete && userProfile) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isProfileComplete, userProfile, navigate, location.state]);

  // Fetch campuses
  const { data: campuses = [] } = useQuery<Campus[]>({
    queryKey: ['campuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campuses')
        .select('id, campus_name')
        .order('campus_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch faculties based on selected campus
  const { data: faculties = [] } = useQuery<Faculty[]>({
    queryKey: ['faculties', selectedCampus],
    queryFn: async () => {
      let query = supabase
        .from('faculties')
        .select('id, faculty_name, campus_id')
        .order('faculty_name');
      
      if (selectedCampus) {
        query = query.eq('campus_id', selectedCampus);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCampus || campuses.length === 0,
  });

  // Fetch departments based on selected faculty
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments', selectedFaculty],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, dept_name, faculty_id')
        .eq('faculty_id', selectedFaculty)
        .order('dept_name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFaculty,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่พบข้อมูลผู้ใช้',
      });
      return;
    }

    if (!selectedFaculty) {
      toast({
        variant: 'destructive',
        title: 'กรุณาเลือกคณะ',
        description: 'กรุณาเลือกคณะที่สังกัด',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (userProfile.role === 'student') {
        // Update student profile
        const { error } = await supabase
          .from('student_profiles')
          .update({ department_id: selectedDepartment || null })
          .eq('user_id', userProfile.id);

        if (error) throw error;
      } else {
        // Update personnel profile
        const { error } = await supabase
          .from('personnel_profiles')
          .update({
            faculty_id: selectedFaculty,
            department_id: selectedDepartment || null,
          })
          .eq('user_id', userProfile.id);

        if (error) throw error;
      }

      await refreshProfile();

      toast({
        title: 'บันทึกข้อมูลสำเร็จ',
        description: 'ข้อมูลโปรไฟล์ของคุณได้รับการอัปเดตแล้ว',
      });

      // Navigate to the intended page or home
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">ตั้งค่าโปรไฟล์</CardTitle>
            <CardDescription>
              กรุณาเลือกคณะและภาควิชาที่คุณสังกัด
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campus Selection */}
              {campuses.length > 0 && (
                <div className="space-y-2">
                  <Label>วิทยาเขต</Label>
                  <Select value={selectedCampus} onValueChange={(value) => {
                    setSelectedCampus(value);
                    setSelectedFaculty('');
                    setSelectedDepartment('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกวิทยาเขต" />
                    </SelectTrigger>
                    <SelectContent>
                      {campuses.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.campus_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Faculty Selection */}
              <div className="space-y-2">
                <Label>คณะ <span className="text-destructive">*</span></Label>
                <Select 
                  value={selectedFaculty} 
                  onValueChange={(value) => {
                    setSelectedFaculty(value);
                    setSelectedDepartment('');
                  }}
                  disabled={campuses.length > 0 && !selectedCampus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกคณะ" />
                  </SelectTrigger>
                  <SelectContent>
                    {faculties.map((faculty) => (
                      <SelectItem key={faculty.id} value={faculty.id}>
                        {faculty.faculty_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department Selection */}
              <div className="space-y-2">
                <Label>ภาควิชา</Label>
                <Select 
                  value={selectedDepartment} 
                  onValueChange={setSelectedDepartment}
                  disabled={!selectedFaculty}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกภาควิชา (ไม่บังคับ)" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.dept_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full mt-6" 
                disabled={isSubmitting || !selectedFaculty}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    ดำเนินการต่อ
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
