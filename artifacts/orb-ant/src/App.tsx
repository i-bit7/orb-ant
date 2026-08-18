import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import OrbAnt from '@/pages/orb-ant';
import Admin from '@/pages/admin';
import Login from '@/pages/login';

const queryClient = new QueryClient();

const IS_DEV = import.meta.env.DEV;

function DevAdminButton() {
  const { user } = useAuth();
  if (!IS_DEV) return null;
  return (
    <Link href="/admin">
      <span
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${user?.profile.role === 'admin' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 4,
          color: user?.profile.role === 'admin' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
          fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          userSelect: 'none', backdropFilter: 'blur(4px)',
        }}
      >
        {user?.profile.role === 'admin' ? 'Admin ↗' : 'Admin (dev)'}
      </span>
    </Link>
  );
}

function Router() {
  const [location] = useLocation();
  const { user, loading } = useAuth();

  if (location === '/login') return <Login />;

  if (location === '/admin') {
    if (loading) return <FullBlack />;
    if (!user) return <AccessDenied reason="로그인이 필요합니다" />;
    if (user.profile.role !== 'admin') return <AccessDenied reason="관리자 권한이 필요합니다" />;
    return <Admin />;
  }

  return (
    <>
      <OrbAnt />
      <DevAdminButton />
    </>
  );
}

function FullBlack() {
  return <div style={{ position: 'fixed', inset: 0, background: '#000' }} />;
}

function AccessDenied({ reason }: { reason: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', gap: 12,
    }}>
      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Access Denied
      </p>
      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{reason}</p>
      <Link href="/">
        <span style={{ marginTop: 16, fontSize: 10, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          ← 홈으로
        </span>
      </Link>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ErrorBoundary resetKey="root">
            <Router />
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
