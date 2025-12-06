// OJT Master v2.10.0 - Admin Analytics Hook (Issue #54)

import { useMemo } from 'react';

/**
 * Calculate mentor contribution stats
 * @param {Array} docs - All documents
 * @returns {Array} - Mentor stats sorted by document count
 */
export function useMentorContribution(docs) {
  return useMemo(() => {
    const mentorMap = new Map();

    docs.forEach((doc) => {
      if (!doc.author_id) return;

      const existing = mentorMap.get(doc.author_id) || {
        id: doc.author_id,
        name: doc.author_name || '알 수 없음',
        docCount: 0,
        teams: new Set(),
      };

      existing.docCount++;
      if (doc.team) existing.teams.add(doc.team);

      mentorMap.set(doc.author_id, existing);
    });

    return Array.from(mentorMap.values())
      .map((m) => ({ ...m, teams: Array.from(m.teams) }))
      .sort((a, b) => b.docCount - a.docCount);
  }, [docs]);
}

/**
 * Calculate mentee learning progress stats
 * @param {Array} records - Learning records
 * @param {Array} users - All users
 * @param {Array} docs - All documents
 * @returns {Object} - Progress stats by user and overall
 */
export function useLearningProgress(records, users, docs) {
  return useMemo(() => {
    const mentees = users.filter((u) => u.role === 'mentee');
    const totalDocs = docs.length;

    // Per-user progress
    const userProgress = mentees.map((user) => {
      const userRecords = records.filter((r) => r.user_id === user.id);
      const completedDocs = new Set(userRecords.filter((r) => r.passed).map((r) => r.doc_id));
      const passedCount = completedDocs.size;
      const attemptedCount = new Set(userRecords.map((r) => r.doc_id)).size;

      // Calculate average score
      const avgScore = userRecords.length
        ? Math.round(userRecords.reduce((sum, r) => sum + (r.score || 0), 0) / userRecords.length)
        : 0;

      return {
        id: user.id,
        name: user.name,
        department: user.department,
        passedCount,
        attemptedCount,
        totalDocs,
        progressPercent: totalDocs ? Math.round((passedCount / totalDocs) * 100) : 0,
        avgScore,
      };
    });

    // Overall stats
    const overallStats = {
      totalMentees: mentees.length,
      activeMentees: userProgress.filter((u) => u.attemptedCount > 0).length,
      completedAllMentees: userProgress.filter((u) => u.progressPercent === 100).length,
      avgProgressPercent: userProgress.length
        ? Math.round(
            userProgress.reduce((sum, u) => sum + u.progressPercent, 0) / userProgress.length
          )
        : 0,
    };

    return { userProgress, overallStats };
  }, [records, users, docs]);
}

/**
 * Calculate quiz weakness analysis by section/topic
 * @param {Array} records - Learning records with quiz details
 * @param {Array} docs - Documents with quiz data
 * @returns {Array} - Weakness stats sorted by fail rate
 */
export function useQuizWeakness(records, docs) {
  return useMemo(() => {
    // Create doc map for quick lookup
    const docMap = new Map(docs.map((d) => [d.id, d]));

    // Aggregate pass/fail by document
    const docStats = new Map();

    records.forEach((record) => {
      const doc = docMap.get(record.doc_id);
      if (!doc) return;

      const existing = docStats.get(record.doc_id) || {
        docId: record.doc_id,
        title: doc.title,
        team: doc.team,
        attempts: 0,
        passes: 0,
        totalScore: 0,
      };

      existing.attempts++;
      if (record.passed) existing.passes++;
      existing.totalScore += record.score || 0;

      docStats.set(record.doc_id, existing);
    });

    return Array.from(docStats.values())
      .map((stat) => ({
        ...stat,
        failRate: stat.attempts
          ? Math.round(((stat.attempts - stat.passes) / stat.attempts) * 100)
          : 0,
        avgScore: stat.attempts ? Math.round(stat.totalScore / stat.attempts) : 0,
      }))
      .filter((stat) => stat.attempts >= 3) // Only show docs with enough data
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 10); // Top 10 weakest
  }, [records, docs]);
}

/**
 * Calculate time-based learning activity
 * @param {Array} records - Learning records
 * @returns {Object} - Activity by day/week/month
 */
export function useLearningActivity(records) {
  return useMemo(() => {
    const now = new Date();
    const last7Days = [];
    const last4Weeks = [];

    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayRecords = records.filter((r) => {
        const recordDate = new Date(r.completed_at).toISOString().split('T')[0];
        return recordDate === dateStr;
      });

      last7Days.push({
        date: dateStr,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        total: dayRecords.length,
        passed: dayRecords.filter((r) => r.passed).length,
      });
    }

    // Last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const weekRecords = records.filter((r) => {
        const recordDate = new Date(r.completed_at);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });

      last4Weeks.push({
        label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}~${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
        total: weekRecords.length,
        passed: weekRecords.filter((r) => r.passed).length,
      });
    }

    return { last7Days, last4Weeks };
  }, [records]);
}

/**
 * Calculate team-based stats
 * @param {Array} docs - Documents
 * @param {Array} records - Learning records
 * @returns {Array} - Stats per team
 */
export function useTeamStats(docs, records) {
  return useMemo(() => {
    const teamMap = new Map();

    docs.forEach((doc) => {
      const team = doc.team || '미분류';
      const existing = teamMap.get(team) || {
        team,
        docCount: 0,
        docIds: new Set(),
      };

      existing.docCount++;
      existing.docIds.add(doc.id);
      teamMap.set(team, existing);
    });

    // Add learning stats per team
    return Array.from(teamMap.values())
      .map((teamStat) => {
        const teamRecords = records.filter((r) => teamStat.docIds.has(r.doc_id));
        const passedRecords = teamRecords.filter((r) => r.passed);

        return {
          team: teamStat.team,
          docCount: teamStat.docCount,
          totalAttempts: teamRecords.length,
          passRate: teamRecords.length
            ? Math.round((passedRecords.length / teamRecords.length) * 100)
            : 0,
        };
      })
      .sort((a, b) => b.docCount - a.docCount);
  }, [docs, records]);
}
