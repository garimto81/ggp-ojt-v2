// OJT Master v2.10.0 - Main Application Component (WebLLM Only)

import { useEffect } from 'react';
import { useAuth } from '@features/auth/hooks/AuthContext';
import { Toast } from '@contexts/ToastContext';
import { VIEW_STATES } from '@/constants';

// Layouts
import Header from '@layouts/Header';

// UI Components
import { Spinner } from '@components/ui';

// Feature Components
import RoleSelectionPage from '@features/auth/components/RoleSelectionPage';
import PendingApprovalPage from '@features/auth/components/PendingApprovalPage';
import AdminDashboard from '@features/admin/components/AdminDashboard';
import MentorDashboard from '@features/docs/components/MentorDashboard';
import MenteeList from '@features/learning/components/MenteeList';
import MenteeStudy from '@features/learning/components/MenteeStudy';

function App() {
  const { viewState, isLoading } = useAuth();

  // Listen for sync complete events (Issue #60)
  useEffect(() => {
    const handleSyncComplete = (event) => {
      const { success, failed } = event.detail;
      if (success > 0 && failed === 0) {
        Toast.success(`${success}개 항목 동기화 완료`);
      } else if (success > 0 && failed > 0) {
        Toast.warning(`${success}개 동기화 완료, ${failed}개 실패`);
      } else if (failed > 0) {
        Toast.error(`${failed}개 항목 동기화 실패`);
      }
    };

    window.addEventListener('syncComplete', handleSyncComplete);
    return () => window.removeEventListener('syncComplete', handleSyncComplete);
  }, []);

  // Loading state
  if (isLoading || viewState === VIEW_STATES.LOADING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="xl" color="green" className="mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Role selection (unauthenticated or new user)
  if (viewState === VIEW_STATES.ROLE_SELECT) {
    return <RoleSelectionPage />;
  }

  // Pending approval (Issue #105: Email users waiting for admin approval)
  if (viewState === VIEW_STATES.PENDING_APPROVAL) {
    return <PendingApprovalPage />;
  }

  // Main app with header
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {viewState === VIEW_STATES.ADMIN_DASHBOARD && <AdminDashboard />}
        {viewState === VIEW_STATES.MENTOR_DASHBOARD && <MentorDashboard />}
        {viewState === VIEW_STATES.MENTEE_LIST && <MenteeList />}
        {viewState === VIEW_STATES.MENTEE_STUDY && <MenteeStudy />}
      </main>
    </div>
  );
}

export default App;
