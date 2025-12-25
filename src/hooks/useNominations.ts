import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Nomination, AwardCategory, NominationStatus } from '@/types/nomination';

// Mock data for demonstration
const mockNominations: Nomination[] = [
  {
    id: '1',
    student: {
      id: 's1',
      studentId: '6510100001',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      email: 'somchai.j@ku.th',
      faculty: 'วิศวกรรมศาสตร์',
      department: 'วิศวกรรมคอมพิวเตอร์',
      year: 3,
      gpa: 3.75,
    },
    category: 'extracurricular',
    semester: 'first',
    academicYear: 2567,
    status: 'dean_pending',
    submittedAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    description: 'มีส่วนร่วมในกิจกรรมต่างๆ ของมหาวิทยาลัยอย่างสม่ำเสมอ',
    achievements: [
      'ประธานชมรมโปรแกรมมิ่ง',
      'ผู้นำค่ายอาสา 3 ครั้ง',
      'ได้รับรางวัลนิสิตดีเด่นด้านกิจกรรม ระดับคณะ',
    ],
    attachments: [],
    activityHours: 120,
    currentStep: 4,
    totalSteps: 8,
  },
  {
    id: '2',
    student: {
      id: 's2',
      studentId: '6510100042',
      firstName: 'สมหญิง',
      lastName: 'รักเรียน',
      email: 'somying.r@ku.th',
      faculty: 'วิทยาศาสตร์',
      department: 'วิทยาการคอมพิวเตอร์',
      year: 4,
      gpa: 3.92,
    },
    category: 'creativity',
    semester: 'first',
    academicYear: 2567,
    status: 'committee_voting',
    submittedAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-25T16:45:00Z',
    description: 'พัฒนาแอปพลิเคชันช่วยเหลือผู้พิการทางสายตา',
    achievements: [
      'รางวัลชนะเลิศ Startup Thailand League 2023',
      'ผลงานตีพิมพ์ในวารสารระดับนานาชาติ',
      'สิทธิบัตรการประดิษฐ์ 2 ฉบับ',
    ],
    attachments: [],
    currentStep: 6,
    totalSteps: 8,
  },
  {
    id: '3',
    student: {
      id: 's3',
      studentId: '6510100099',
      firstName: 'นพดล',
      lastName: 'มานะ',
      email: 'nopadol.m@ku.th',
      faculty: 'มนุษยศาสตร์',
      department: 'ภาษาอังกฤษ',
      year: 2,
      gpa: 3.65,
    },
    category: 'good_conduct',
    semester: 'first',
    academicYear: 2567,
    status: 'approved',
    submittedAt: '2024-01-05T11:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
    description: 'เป็นแบบอย่างที่ดีในด้านความประพฤติ',
    achievements: [
      'อาสาสมัครช่วยเหลือผู้สูงอายุทุกสัปดาห์',
      'ไม่เคยมีประวัติผิดวินัย',
      'ได้รับการยกย่องจากอาจารย์ที่ปรึกษา',
    ],
    attachments: [],
    currentStep: 8,
    totalSteps: 8,
  },
];

// Simulated API functions
const fetchNominations = async (): Promise<Nomination[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockNominations;
};

const fetchNominationById = async (id: string): Promise<Nomination | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockNominations.find(n => n.id === id) || null;
};

const createNomination = async (data: Partial<Nomination>): Promise<Nomination> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newNomination: Nomination = {
    id: Date.now().toString(),
    student: data.student!,
    category: data.category!,
    semester: 'first',
    academicYear: 2567,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: data.description || '',
    achievements: data.achievements || [],
    attachments: data.attachments || [],
    activityHours: data.activityHours,
    currentStep: 1,
    totalSteps: 8,
  };
  return newNomination;
};

const updateNominationStatus = async (
  id: string, 
  status: NominationStatus, 
  comment?: string
): Promise<Nomination> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const nomination = mockNominations.find(n => n.id === id);
  if (!nomination) throw new Error('Nomination not found');
  return { ...nomination, status, updatedAt: new Date().toISOString() };
};

// Custom hooks
export function useNominations() {
  return useQuery({
    queryKey: ['nominations'],
    queryFn: fetchNominations,
  });
}

export function useNomination(id: string) {
  return useQuery({
    queryKey: ['nomination', id],
    queryFn: () => fetchNominationById(id),
    enabled: !!id,
  });
}

export function useCreateNomination() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createNomination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nominations'] });
    },
  });
}

export function useUpdateNominationStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: NominationStatus; comment?: string }) =>
      updateNominationStatus(id, status, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nominations'] });
    },
  });
}

export function useNominationStats() {
  const { data: nominations } = useNominations();
  
  return {
    total: nominations?.length || 0,
    pending: nominations?.filter(n => 
      !['approved', 'rejected'].includes(n.status) && n.status !== 'draft'
    ).length || 0,
    approved: nominations?.filter(n => n.status === 'approved').length || 0,
    rejected: nominations?.filter(n => 
      n.status.includes('rejected') || n.status === 'rejected'
    ).length || 0,
  };
}
