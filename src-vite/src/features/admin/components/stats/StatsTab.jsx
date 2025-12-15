// OJT Master v2.10.0 - Statistics Tab Component (Phase 6)
// Note: Export feature excluded per user request

import {
  ActivityChart,
  TeamStatsChart,
  PassRateChart,
  MentorContributionChart,
  ProgressDistributionChart,
} from '../AnalyticsCharts';

export default function StatsTab({
  stats,
  overallStats,
  last7Days,
  mentorContribution,
  userProgress,
  teamStats,
  quizWeakness,
}) {
  return (
    <div role="tabpanel" id="tabpanel-stats" aria-labelledby="tab-stats">
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-600">총 멘티</p>
            <p className="text-xl font-bold text-blue-800">{overallStats.totalMentees}명</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-600">활동 멘티</p>
            <p className="text-xl font-bold text-green-800">{overallStats.activeMentees}명</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <p className="text-sm text-purple-600">전체 완료</p>
            <p className="text-xl font-bold text-purple-800">
              {overallStats.completedAllMentees}명
            </p>
          </div>
          <div className="rounded-lg bg-orange-50 p-4">
            <p className="text-sm text-orange-600">평균 진도</p>
            <p className="text-xl font-bold text-orange-800">{overallStats.avgProgressPercent}%</p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <ActivityChart data={last7Days} title="최근 7일 학습 활동" />
          </div>
          <div className="rounded-lg border bg-white p-4">
            <PassRateChart passRate={stats.passRate} />
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <MentorContributionChart data={mentorContribution} />
          </div>
          <div className="rounded-lg border bg-white p-4">
            <ProgressDistributionChart userProgress={userProgress} />
          </div>
        </div>

        {/* Team Stats Chart */}
        {teamStats.length > 0 && (
          <div className="rounded-lg border bg-white p-4">
            <TeamStatsChart data={teamStats} />
          </div>
        )}

        {/* Weakness Table */}
        {quizWeakness.length > 0 && (
          <div className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-sm font-bold text-gray-700">
              취약 파트 분석 (실패율 높은 문서)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2">문서</th>
                    <th className="pb-2">팀</th>
                    <th className="pb-2">시도</th>
                    <th className="pb-2">실패율</th>
                    <th className="pb-2">평균 점수</th>
                  </tr>
                </thead>
                <tbody>
                  {quizWeakness.map((item) => (
                    <tr key={item.docId} className="border-b last:border-0">
                      <td className="py-2">{item.title}</td>
                      <td className="py-2 text-gray-500">{item.team}</td>
                      <td className="py-2">{item.attempts}</td>
                      <td className="py-2">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            item.failRate >= 50
                              ? 'bg-red-100 text-red-700'
                              : item.failRate >= 30
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {item.failRate}%
                        </span>
                      </td>
                      <td className="py-2">{item.avgScore}점</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mentee Progress Table */}
        {userProgress.length > 0 && (
          <div className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-sm font-bold text-gray-700">멘티별 진도 현황</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2">이름</th>
                    <th className="pb-2">부서</th>
                    <th className="pb-2">완료/전체</th>
                    <th className="pb-2">진도율</th>
                    <th className="pb-2">평균 점수</th>
                  </tr>
                </thead>
                <tbody>
                  {userProgress.slice(0, 10).map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-2">{user.name}</td>
                      <td className="py-2 text-gray-500">{user.department || '-'}</td>
                      <td className="py-2">
                        {user.passedCount}/{user.totalDocs}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-full rounded-full ${
                                user.progressPercent === 100
                                  ? 'bg-green-500'
                                  : user.progressPercent >= 50
                                    ? 'bg-blue-500'
                                    : 'bg-orange-500'
                              }`}
                              style={{ width: `${user.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs">{user.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="py-2">{user.avgScore}점</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {userProgress.length > 10 && (
                <p className="mt-2 text-center text-xs text-gray-400">
                  상위 10명 표시 (전체 {userProgress.length}명)
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
