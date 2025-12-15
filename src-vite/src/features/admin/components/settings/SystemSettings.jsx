// OJT Master - System Settings Component

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/api';
import { Toast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/constants';

const DEFAULT_DEPARTMENTS = ['개발팀', '디자인팀', '기획팀', '마케팅팀', '운영팀', '인사팀'];

/**
 * System Settings Component
 * - 기본 부서 목록 편집
 * - 신규 가입자 기본 역할
 * - 퀴즈 통과 기준 점수
 * - 자동 숨김 신고 건수
 */
export function SystemSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings state
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [defaultRole, setDefaultRole] = useState('mentee');
  const [quizPassScore, setQuizPassScore] = useState(70);
  const [autoHideReportCount, setAutoHideReportCount] = useState(3);

  // New department input
  const [newDepartment, setNewDepartment] = useState('');

  // Load settings from Supabase
  useEffect(() => {
    const loadSettings = async () => {
      if (!isAdmin) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('key, value')
          .in('key', [
            'default_departments',
            'default_role',
            'quiz_pass_score',
            'auto_hide_report_count',
          ]);

        if (error) throw error;

        // Parse settings
        data?.forEach((setting) => {
          switch (setting.key) {
            case 'default_departments':
              setDepartments(setting.value);
              break;
            case 'default_role':
              setDefaultRole(setting.value);
              break;
            case 'quiz_pass_score':
              setQuizPassScore(Number(setting.value));
              break;
            case 'auto_hide_report_count':
              setAutoHideReportCount(Number(setting.value));
              break;
          }
        });
      } catch (error) {
        console.error('Settings load error:', error);
        Toast.error('설정을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isAdmin]);

  // Save settings to Supabase
  const handleSave = async () => {
    if (!isAdmin) {
      Toast.error('관리자 권한이 필요합니다.');
      return;
    }

    setIsSaving(true);
    try {
      // Prepare updates
      const updates = [
        {
          key: 'default_departments',
          value: departments,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          key: 'default_role',
          value: defaultRole,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          key: 'quiz_pass_score',
          value: quizPassScore,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          key: 'auto_hide_report_count',
          value: autoHideReportCount,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
      ];

      // Upsert all settings
      for (const update of updates) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }

      // Log admin action (audit_logs 실제 스키마에 맞춤 - 실패해도 설정 저장은 성공)
      // DB CHECK 허용값: ROLE_CHANGE, LOGIN, LOGOUT, DOC_CREATE, DOC_UPDATE, DOC_DELETE, SECURITY_ALERT, SETTINGS_UPDATE
      try {
        await supabase.from('audit_logs').insert({
          event_type: 'SETTINGS_UPDATE',
          table_name: 'admin_settings',
          performed_by: user.id,
          metadata: {
            departments: departments.length,
            defaultRole,
            quizPassScore,
            autoHideReportCount,
          },
        });
      } catch (logError) {
        console.warn('Audit log insert failed:', logError);
      }

      Toast.success('설정이 저장되었습니다.');
    } catch (error) {
      console.error('Settings save error:', error);
      Toast.error('설정 저장에 실패했습니다: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new department
  const handleAddDepartment = () => {
    const trimmed = newDepartment.trim();
    if (!trimmed) {
      Toast.warning('부서명을 입력하세요.');
      return;
    }
    if (departments.includes(trimmed)) {
      Toast.warning('이미 존재하는 부서입니다.');
      return;
    }
    setDepartments([...departments, trimmed]);
    setNewDepartment('');
  };

  // Remove department
  const handleRemoveDepartment = (dept) => {
    if (departments.length <= 1) {
      Toast.warning('최소 1개의 부서는 유지해야 합니다.');
      return;
    }
    setDepartments(departments.filter((d) => d !== dept));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">시스템 설정</h3>
        <button
          onClick={handleSave}
          disabled={isSaving || !isAdmin}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Default Departments */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">기본 부서 목록</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {departments.map((dept) => (
            <div
              key={dept}
              className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-sm text-blue-700"
            >
              <span>{dept}</span>
              <button
                type="button"
                onClick={() => handleRemoveDepartment(dept)}
                className="text-blue-500 hover:text-blue-700"
                aria-label={`${dept} 삭제`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
            placeholder="새 부서명 입력"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddDepartment}
            className="rounded-lg bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            추가
          </button>
        </div>
      </div>

      {/* Default Role */}
      <div className="space-y-2">
        <label htmlFor="default-role" className="block text-sm font-medium text-gray-700">
          신규 가입자 기본 역할
        </label>
        <select
          id="default-role"
          value={defaultRole}
          onChange={(e) => setDefaultRole(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="mentee">Mentee (멘티)</option>
          <option value="mentor">Mentor (멘토)</option>
        </select>
      </div>

      {/* Quiz Pass Score */}
      <div className="space-y-2">
        <label htmlFor="quiz-pass-score" className="block text-sm font-medium text-gray-700">
          퀴즈 통과 기준 점수
        </label>
        <div className="flex items-center gap-4">
          <input
            id="quiz-pass-score"
            type="number"
            min="0"
            max="100"
            value={quizPassScore}
            onChange={(e) => setQuizPassScore(Number(e.target.value))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <span className="text-sm text-gray-500">점 (0-100)</span>
        </div>
      </div>

      {/* Auto Hide Report Count */}
      <div className="space-y-2">
        <label htmlFor="auto-hide-count" className="block text-sm font-medium text-gray-700">
          자동 숨김 신고 건수
        </label>
        <div className="flex items-center gap-4">
          <input
            id="auto-hide-count"
            type="number"
            min="1"
            max="10"
            value={autoHideReportCount}
            onChange={(e) => setAutoHideReportCount(Number(e.target.value))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <span className="text-sm text-gray-500">건 이상 신고 시 자동으로 콘텐츠 숨김 처리</span>
        </div>
      </div>
    </div>
  );
}
