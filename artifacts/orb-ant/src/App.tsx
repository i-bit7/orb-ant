import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import OrbAnt from '@/pages/orb-ant';
import Admin from '@/pages/admin';

const queryClient = new QueryClient();

// Dev-only admin shortcut — hidden in production builds
const IS_DEV = import.meta.env.DEV;

function DevAdminButton() {
  if (!IS_DEV) return null;
  return (
    <Link href="/admin">
      <span
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4,
          color: 'rgba(255,255,255,0.4)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          userSelect: 'none',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
      >
        Admin ↗
      </span>
    </Link>
  );
}

function Router() {
  const [location] = useLocation();
  if (location === '/admin') return <Admin />;
  return (
    <>
      <OrbAnt />
      <DevAdminButton />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary resetKey="root">
          <Router />
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
