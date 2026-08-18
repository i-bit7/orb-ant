import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import OrbAnt from '@/pages/orb-ant';
import Admin from '@/pages/admin';

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  if (location === '/admin') return <Admin />;
  return <OrbAnt />;
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
