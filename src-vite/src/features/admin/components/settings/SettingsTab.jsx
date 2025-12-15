// OJT Master - Admin Settings Tab (Admin Page Redesign)

import { AdminLogsViewer } from './AdminLogsViewer';
import { NotificationSettings } from './NotificationSettings';
import { SystemSettings } from './SystemSettings';

/**
 * Settings Tab Component
 * - 시스템 설정, 알림 설정, 시스템 로그 통합 관리
 */
export default function SettingsTab() {
  return (
    <div
      role="tabpanel"
      id="tabpanel-settings"
      aria-labelledby="tab-settings"
      className="space-y-6"
    >
      {/* System Settings Section */}
      <section aria-labelledby="settings-system-title">
        <h2 id="settings-system-title" className="sr-only">
          시스템 설정
        </h2>
        <SystemSettings />
      </section>

      {/* Notification Settings Section */}
      <section aria-labelledby="settings-notification-title">
        <h2 id="settings-notification-title" className="sr-only">
          알림 설정
        </h2>
        <NotificationSettings />
      </section>

      {/* Admin Logs Section */}
      <section aria-labelledby="settings-logs-title">
        <h2 id="settings-logs-title" className="sr-only">
          시스템 로그
        </h2>
        <AdminLogsViewer />
      </section>
    </div>
  );
}
