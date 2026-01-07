import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type UserRole = Database['public']['Enums']['user_role'];

interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  appRoles: AppRole[];
  isLoading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isApprover: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appRoles, setAppRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Get user from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('auth_user_id', userId)
        .single();

      if (userError || !userData) {
        console.error('Error fetching user:', userError);
        return;
      }

      // Get profile based on role
      let firstName = '';
      let lastName = '';

      if (userData.role === 'student') {
        const { data: studentProfile } = await supabase
          .from('student_profiles')
          .select('first_name, last_name')
          .eq('user_id', userData.id)
          .single();
        
        if (studentProfile) {
          firstName = studentProfile.first_name;
          lastName = studentProfile.last_name;
        }
      } else {
        const { data: personnelProfile } = await supabase
          .from('personnel_profiles')
          .select('first_name, last_name')
          .eq('user_id', userData.id)
          .single();
        
        if (personnelProfile) {
          firstName = personnelProfile.first_name;
          lastName = personnelProfile.last_name;
        }
      }

      setUserProfile({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        firstName,
        lastName,
      });

      // Fetch app roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.id);

      if (rolesData) {
        setAppRoles(rolesData.map(r => r.role));
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
          setAppRoles([]);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setAppRoles([]);
  };

  const hasRole = (role: AppRole) => {
    return appRoles.includes(role);
  };

  const hasAnyRole = (roles: AppRole[]) => {
    return roles.some(role => appRoles.includes(role));
  };

  const isApprover = hasAnyRole([
    'department_head',
    'associate_dean',
    'dean',
    'student_affairs',
    'committee_member',
    'committee_chairman',
    'president',
  ]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userProfile,
        appRoles,
        isLoading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        hasRole,
        hasAnyRole,
        isApprover,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
