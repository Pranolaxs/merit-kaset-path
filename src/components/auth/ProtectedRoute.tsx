import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
  requireAnyRole?: boolean;
  excludeRoles?: AppRole[];
  requireProfileComplete?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles, 
  requireAnyRole = true,
  excludeRoles,
  requireProfileComplete = false,
}: ProtectedRouteProps) {
  const { user, appRoles, isLoading, hasRole, hasAnyRole, isProfileComplete } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check excluded roles
  if (excludeRoles && excludeRoles.length > 0) {
    const hasExcludedRole = excludeRoles.some(role => hasRole(role));
    if (hasExcludedRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
            <p className="text-muted-foreground">คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p>
          </div>
        </div>
      );
    }
  }

  // Check required roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess = requireAnyRole 
      ? hasAnyRole(requiredRoles)
      : requiredRoles.every(role => hasRole(role));

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
            <p className="text-muted-foreground">คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p>
          </div>
        </div>
      );
    }
  }

  // Check if profile setup is required
  if (requireProfileComplete && !isProfileComplete) {
    return <Navigate to="/profile-setup" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
