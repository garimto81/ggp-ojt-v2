// OJT Master v2.6.1 - Admin Dashboard Component

import { useState, useEffect } from 'react';
import { useDocs } from '../contexts/DocsContext';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../contexts/ToastContext';
import {
  supabase,
  checkAllProvidersStatus,
  setLLMProvider,
  getCurrentProvider,
  getAvailableProviders,
  LLM_PROVIDERS,
} from '../utils/api';
import { confirmDeleteWithCSRF, formatDate } from '../utils/helpers';

export default function AdminDashboard() {
  const { allDocs, deleteDocument, isLoading: docsLoading } = useDocs();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('users');
  const [allUsers, setAllUsers] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // LLM Provider state
  const [llmStatus, setLlmStatus] = useState({});
  const [activeProvider, setActiveProvider] = useState(getCurrentProvider());
  const [isCheckingLLM, setIsCheckingLLM] = useState(false);

  // Load admin data
  useEffect(() => {
    const loadAdminData = async () => {
      setIsLoading(true);
      try {
        // Load users
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (!usersError) setAllUsers(users || []);

        // Load learning records
        const { data: records, error: recordsError } = await supabase
          .from('learning_records')
          .select('*')
          .order('completed_at', { ascending: false });

        if (!recordsError) setAllRecords(records || []);
      } catch (e) {
        console.error('Admin data load error:', e);
        Toast.error('관리자 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminData();
  }, []);

  // Change user role
  const handleRoleChange = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole, updated_at: Date.now() })
        .eq('id', userId);

      if (error) throw error;

      setAllUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      Toast.success(`역할이 ${newRole}(으)로 변경되었습니다.`);
    } catch (e) {
      console.error('Role change error:', e);
      Toast.error('역할 변경에 실패했습니다: ' + e.message);
    }
  };

  // Change user department
  const handleDepartmentChange = async (userId, newDepartment) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ department: newDepartment || null, updated_at: Date.now() })
        .eq('id', userId);

      if (error) throw error;

      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, department: newDepartment || null } : u))
      );
      Toast.success('부서가 변경되었습니다.');
    } catch (e) {
      console.error('Department change error:', e);
      Toast.error('부서 변경에 실패했습니다: ' + e.message);
    }
  };

  // Delete document
  const handleDeleteDoc = async (docId) => {
    const doc = allDocs.find((d) => d.id === docId);
    if (!doc) return;

    if (!confirmDeleteWithCSRF(doc.title)) {
      Toast.warning('제목이 일치하지 않습니다. 삭제가 취소되었습니다.');
      return;
    }

    try {
      await deleteDocument(docId);
      Toast.success('문서가 삭제되었습니다.');
    } catch (e) {
      console.error('Delete doc error:', e);
      Toast.error('문서 삭제에 실패했습니다: ' + e.message);
    }
  };

  // Check LLM providers status
  const checkLLMStatus = async () => {
    setIsCheckingLLM(true);
    try {
      const status = await checkAllProvidersStatus();
      setLlmStatus(status);
      setActiveProvider(getCurrentProvider());
    } catch (e) {
      console.error('LLM status check error:', e);
    } finally {
      setIsCheckingLLM(false);
    }
  };

  // Change LLM provider
  const handleProviderChange = (providerName) => {
    const success = setLLMProvider(providerName);
    if (success) {
      setActiveProvider(providerName);
      Toast.success(`LLM Provider가 ${providerName}(으)로 변경되었습니다.`);
    } else {
      Toast.error('Provider 변경에 실패했습니다.');
    }
  };

  // Calculate stats
  const stats = {
    totalUsers: allUsers.length,
    totalDocs: allDocs.length,
    totalRecords: allRecords.length,
    passRate: allRecords.length
      ? Math.round((allRecords.filter((r) => r.passed).length / allRecords.length) * 100)
      : 0,
  };

  if (isLoading || docsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">총 사용자</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">총 문서</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalDocs}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">학습 기록</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalRecords}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">통과율</p>
          <p className="text-2xl font-bold text-green-600">{stats.passRate}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b flex">
          {['users', 'docs', 'stats', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'settings') checkLLMStatus();
              }}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'users' && '사용자 관리'}
              {tab === 'docs' && '콘텐츠 관리'}
              {tab === 'stats' && '통계'}
              {tab === 'settings' && 'AI 설정'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">이름</th>
                    <th className="pb-3 font-medium">역할</th>
                    <th className="pb-3 font-medium">부서</th>
                    <th className="pb-3 font-medium">가입일</th>
                    <th className="pb-3 font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-3">{u.name}</td>
                      <td className="py-3">
                        <select
                          value={u.role || ''}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                          disabled={u.id === user?.id}
                        >
                          <option value="admin">Admin</option>
                          <option value="mentor">Mentor</option>
                          <option value="mentee">Mentee</option>
                        </select>
                      </td>
                      <td className="py-3">
                        <input
                          type="text"
                          value={u.department || ''}
                          onChange={(e) => {
                            // Update local state immediately for responsive UI
                            setAllUsers((prev) =>
                              prev.map((usr) =>
                                usr.id === u.id ? { ...usr, department: e.target.value } : usr
                              )
                            );
                          }}
                          onBlur={(e) => {
                            // Save to database on blur
                            const originalUser = allUsers.find((usr) => usr.id === u.id);
                            if (originalUser?.department !== e.target.value) {
                              handleDepartmentChange(u.id, e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          placeholder="부서 입력"
                          className="px-2 py-1 border rounded text-sm w-32"
                        />
                      </td>
                      <td className="py-3 text-sm text-gray-500">{formatDate(u.created_at)}</td>
                      <td className="py-3">
                        {u.id === user?.id && <span className="text-xs text-gray-400">(본인)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Docs Tab */}
          {activeTab === 'docs' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">제목</th>
                    <th className="pb-3 font-medium">팀</th>
                    <th className="pb-3 font-medium">작성자</th>
                    <th className="pb-3 font-medium">생성일</th>
                    <th className="pb-3 font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {allDocs.map((doc) => (
                    <tr key={doc.id} className="border-b last:border-0">
                      <td className="py-3">{doc.title}</td>
                      <td className="py-3 text-sm">{doc.team}</td>
                      <td className="py-3 text-sm">{doc.author_name}</td>
                      <td className="py-3 text-sm text-gray-500">{formatDate(doc.created_at)}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="text-center py-8 text-gray-500">
              차트 컴포넌트가 여기에 표시됩니다.
              <br />
              (Chart.js 통합 예정)
            </div>
          )}

          {/* Settings Tab - LLM Provider Configuration */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">LLM Provider 설정</h3>
                <button
                  onClick={checkLLMStatus}
                  disabled={isCheckingLLM}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  {isCheckingLLM ? '확인 중...' : '상태 새로고침'}
                </button>
              </div>

              <p className="text-sm text-gray-500">
                AI 콘텐츠 생성에 사용할 LLM Provider를 선택하세요. Fallback 체인이 설정되어 있어
                선택한 Provider 실패 시 자동으로 다른 Provider로 전환됩니다.
              </p>

              <div className="grid grid-cols-3 gap-4">
                {/* Gemini */}
                <div
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                    activeProvider === 'gemini'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleProviderChange('gemini')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">Google Gemini</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        llmStatus.gemini?.online
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {llmStatus.gemini?.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Model: {llmStatus.gemini?.model || 'gemini-2.0-flash-exp'}
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• URL Context Tool 지원</li>
                    <li>• PDF 직접 분석 가능</li>
                    <li>• 무료 티어 제공</li>
                  </ul>
                  {activeProvider === 'gemini' && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">✓ 현재 선택됨</div>
                  )}
                </div>

                {/* Groq */}
                <div
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                    activeProvider === 'groq'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleProviderChange('groq')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">Groq Cloud</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        llmStatus.groq?.online
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {llmStatus.groq?.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Model: {llmStatus.groq?.model || 'llama-3.3-70b-versatile'}
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• 업계 최고속 (0.14s 지연)</li>
                    <li>• 무료 티어 제공</li>
                    <li>• Llama 3.3 70B 한국어 우수</li>
                  </ul>
                  {activeProvider === 'groq' && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">✓ 현재 선택됨</div>
                  )}
                </div>

                {/* Ollama */}
                <div
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                    activeProvider === 'ollama'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleProviderChange('ollama')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">Ollama (Local)</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        llmStatus.ollama?.online
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {llmStatus.ollama?.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Model: {llmStatus.ollama?.model || 'qwen3:8b'}
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• API 비용 $0</li>
                    <li>• 완전한 데이터 프라이버시</li>
                    <li>• 로컬 서버 필요</li>
                  </ul>
                  {activeProvider === 'ollama' && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">✓ 현재 선택됨</div>
                  )}
                </div>
              </div>

              {/* Fallback Chain Info */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="font-medium text-amber-800 mb-2">Fallback 체인</h4>
                <p className="text-sm text-amber-700">
                  선택한 Provider 실패 시 자동으로 다음 순서로 전환됩니다:
                  <br />
                  <span className="font-mono text-xs">
                    {activeProvider} →{' '}
                    {getAvailableProviders()
                      .filter((p) => p !== activeProvider)
                      .join(' → ')}
                  </span>
                </p>
              </div>

              {/* Environment Variables Info */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h4 className="font-medium text-gray-700 mb-2">환경 변수 설정</h4>
                <p className="text-xs text-gray-600 mb-2">.env 파일에 다음 변수를 설정하세요:</p>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                  {`# Provider 선택
VITE_LLM_PROVIDER=gemini

# Gemini
VITE_GEMINI_API_KEY=your-key

# Groq (https://console.groq.com)
VITE_GROQ_API_KEY=your-key

# Ollama (로컬)
VITE_OLLAMA_URL=http://localhost:11434`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
