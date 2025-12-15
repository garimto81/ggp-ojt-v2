// OJT Master v2.19.0 - Main Application Component
// Block Agent System v1.1.0 - Feature-based imports with lazy loading
// Issue #200: AI 상태 관리를 AIContext로 통합

import { Suspense, lazy } from 'react';

import Header from '@/components/Header';
import { VIEW_STATES } from '@/constants';
import { useAI } from '@/contexts/AIContext';
import { useAuth } from '@/contexts/AuthContext';

// Shared layouts (always loaded)

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
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}

function App() {
  const { viewState, isLoading } = useAuth();
  const { aiStatus } = useAI();

  // Loading state
  if (isLoading || viewState === VIEW_STATES.LOADING) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
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
