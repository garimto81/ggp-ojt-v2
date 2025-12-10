// OJT Master v2.17.0 - Main Application Component
// Block Agent System v1.1.0 - Feature-based imports with lazy loading

import { useEffect, useState, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkAIStatus } from '@/utils/api';
import { VIEW_STATES } from '@/constants';

// Shared layouts (always loaded)
import Header from '@/components/Header';

// Feature-based components with lazy loading
const RoleSelectionPage = lazy(() =>
  import('@features/auth').then((m) => ({ default: m.RoleSelectionPage }))
);
const AdminDashboard = lazy(() =>
  import('@features/admin').then((m) => ({ default: m.AdminDashboard }))
);
const MentorDashboard = lazy(() =>
  import('@features/content/create').then((m) => ({ default: m.MentorDashboard }))
);
const MenteeList = lazy(() =>
  import('@features/learning/study').then((m) => ({ default: m.MenteeList }))
);
const MenteeStudy = lazy(() =>
  import('@features/learning/study').then((m) => ({ default: m.MenteeStudy }))
);

// Loading fallback component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const { viewState, isLoading } = useAuth();
  const [aiStatus, setAiStatus] = useState({ online: false, model: '' });

  // Check AI status on mount
  useEffect(() => {
    checkAIStatus().then(setAiStatus);
    const interval = setInterval(() => {
      checkAIStatus().then(setAiStatus);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (isLoading || viewState === VIEW_STATES.LOADING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Role selection (unauthenticated or new user)
  if (viewState === VIEW_STATES.ROLE_SELECT) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <RoleSelectionPage />
      </Suspense>
    );
  }

  // Main app with header
  return (
    <div className="min-h-screen bg-gray-50">
      <Header aiStatus={aiStatus} />

      <main className="container mx-auto px-4 py-6">
        <Suspense fallback={<LoadingSpinner />}>
          {viewState === VIEW_STATES.ADMIN_DASHBOARD && <AdminDashboard />}
          {viewState === VIEW_STATES.MENTOR_DASHBOARD && <MentorDashboard aiStatus={aiStatus} />}
          {viewState === VIEW_STATES.MENTEE_LIST && <MenteeList />}
          {viewState === VIEW_STATES.MENTEE_STUDY && <MenteeStudy />}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
