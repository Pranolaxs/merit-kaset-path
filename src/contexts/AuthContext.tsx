import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as AuthUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserRole, 
  PersonnelPosition, 
  StudentProfile, 
  PersonnelProfile,
  POSITION_LABELS 
} from '@/types/database';

interface UserData {
  id: string;
  auth_user_id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

interface AuthContextType {
  authUser: AuthUser | null;
  session: Session | null;
  user: UserData | null;
  studentProfile: StudentProfile | null;
  personnelProfile: PersonnelProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isStaff: boolean;
  isAdmin: boolean;
  getPositionLabel: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [personnelProfile, setPersonnelProfile] = useState<PersonnelProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setAuthUser(session?.user ?? null);
        
        // Defer user data fetch with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setUser(null);
          setStudentProfile(null);
          setPersonnelProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (authUserId: string) => {
    try {
      // Fetch user record
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      
      if (userData) {
        setUser(userData as UserData);

        // Fetch student profile if student
        if (userData.role === 'student') {
          const { data: studentData } = await supabase
            .from('student_profiles')
            .select('*, department:departments(*, faculty:faculties(*))')
            .eq('user_id', userData.id)
            .maybeSingle();
          
          setStudentProfile(studentData as StudentProfile | null);
        }

        // Fetch personnel profile if staff/admin
        if (userData.role === 'staff' || userData.role === 'admin') {
          const { data: personnelData } = await supabase
            .from('personnel_profiles')
            .select('*, department:departments(*), faculty:faculties(*)')
            .eq('user_id', userData.id)
            .maybeSingle();
          
          setPersonnelProfile(personnelData as PersonnelProfile | null);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { first_name: firstName, last_name: lastName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setSession(null);
    setUser(null);
    setStudentProfile(null);
    setPersonnelProfile(null);
  };

  const isStaff = user?.role === 'staff' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const getPositionLabel = () => {
    if (personnelProfile?.position) {
      return POSITION_LABELS[personnelProfile.position];
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{
      authUser,
      session,
      user,
      studentProfile,
      personnelProfile,
      loading,
      signIn,
      signUp,
      signOut,
      isStaff,
      isAdmin,
      getPositionLabel,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Re-export types for convenience
export { POSITION_LABELS } from '@/types/database';
export type { PersonnelPosition } from '@/types/database';
