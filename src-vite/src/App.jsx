// OJT Master v2.9.0 - Main Application Component (WebLLM Only)

import { useAuth } from './features/auth/hooks/AuthContext';
import { VIEW_STATES } from './constants';

// Layouts
import Header from './layouts/Header';

// Feature Components
import RoleSelectionPage from './features/auth/components/RoleSelectionPage';
import AdminDashboard from './features/admin/components/AdminDashboard';
import MentorDashboard from './features/docs/components/MentorDashboard';
import MenteeList from './features/learning/components/MenteeList';
import MenteeStudy from './features/learning/components/MenteeStudy';

function App() {
  const { viewState, isLoading } = useAuth();

  // Debug log
  console.log('[App] Render - viewState:', viewState, ', isLoading:', isLoading);

  // Loading state
  if (isLoading || viewState === VIEW_STATES.LOADING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Role selection (unauthenticated or new user)
  if (viewState === VIEW_STATES.ROLE_SELECT) {
    return <RoleSelectionPage />;
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
