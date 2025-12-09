// OJT Master - Notification Settings Component

import { useState } from 'react';
import { Toast } from '@contexts/ToastContext';

/**
 * Notification Settings Component
 * - UI only (실제 이메일 연동은 미구현)
 * - 신규 가입자 알림
 * - 콘텐츠 신고 알림
 * - 일일/주간 리포트 메일 (비활성)
 */
export function NotificationSettings() {
  const [settings, setSettings] = useState({
    newUserNotification: true,
    reportNotification: true,
    dailySummary: false,
    weeklyReport: false,
  });

  const handleToggle = (key) => {
    // UI only - 실제 저장은 미구현
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    Toast.info('알림 설정이 변경되었습니다 (UI 전용, 실제 이메일 연동 미구현)');
  };

  return (
    <div className="bg-white border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-bold text-gray-800">알림 설정</h3>
      <p className="text-sm text-gray-500">
        이메일 알림 기능은 현재 UI 전용입니다. 실제 이메일 연동은 미구현 상태입니다.
      </p>

      <div className="space-y-4">
        {/* New User Notification */}
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <label htmlFor="new-user-notification" className="font-medium text-gray-700">
              신규 가입자 알림
            </label>
            <p className="text-sm text-gray-500">새로운 사용자가 가입할 때 알림 받기</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="new-user-notification"
              type="checkbox"
              checked={settings.newUserNotification}
              onChange={() => handleToggle('newUserNotification')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Report Notification */}
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <label htmlFor="report-notification" className="font-medium text-gray-700">
              콘텐츠 신고 알림
            </label>
            <p className="text-sm text-gray-500">콘텐츠 신고가 접수될 때 알림 받기</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="report-notification"
              type="checkbox"
              checked={settings.reportNotification}
              onChange={() => handleToggle('reportNotification')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Daily Summary (Disabled) */}
        <div className="flex items-center justify-between py-3 border-b opacity-50">
          <div>
            <label htmlFor="daily-summary" className="font-medium text-gray-700">
              일일 통계 요약 메일
            </label>
            <p className="text-sm text-gray-500">매일 오전 9시 통계 요약 메일 받기 (준비 중)</p>
          </div>
          <label className="relative inline-flex items-center cursor-not-allowed">
            <input
              id="daily-summary"
              type="checkbox"
              checked={settings.dailySummary}
              disabled
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </label>
        </div>

        {/* Weekly Report (Disabled) */}
        <div className="flex items-center justify-between py-3 opacity-50">
          <div>
            <label htmlFor="weekly-report" className="font-medium text-gray-700">
              주간 리포트 메일
            </label>
            <p className="text-sm text-gray-500">
              매주 월요일 오전 주간 리포트 메일 받기 (준비 중)
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-not-allowed">
            <input
              id="weekly-report"
              type="checkbox"
              checked={settings.weeklyReport}
              disabled
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
