// OJT Master v2.10.0 - Export Utilities (Phase 6: Statistics Export)

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

/**
 * Export statistics data to Excel format
 * Creates multiple sheets: Overview, Mentees, Weakness, Teams
 */
export function exportToExcel(data, filename = 'ojt_statistics') {
  const {
    overallStats,
    userProgress,
    quizWeakness,
    teamStats,
    passRate,
    totalUsers,
    totalDocs,
    totalRecords,
  } = data;

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Overview Stats
  const overviewData = [
    ['OJT Master - 전체 통계', ''],
    ['항목', '값'],
    ['총 사용자', totalUsers],
    ['총 문서', totalDocs],
    ['총 학습 기록', totalRecords],
    ['전체 통과율', `${passRate}%`],
    [''],
    ['멘티 통계', ''],
    ['총 멘티', overallStats.totalMentees],
    ['활동 멘티', overallStats.activeMentees],
    ['전체 완료 멘티', overallStats.completedAllMentees],
    ['평균 진도율', `${overallStats.avgProgressPercent}%`],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, ws1, '전체 통계');

  // Sheet 2: Mentee Progress
  if (userProgress && userProgress.length > 0) {
    const menteeData = [
      ['멘티별 진도 현황', '', '', '', ''],
      ['이름', '부서', '완료/전체', '진도율(%)', '평균 점수'],
    ];

    userProgress.forEach((user) => {
      menteeData.push([
        user.name,
        user.department || '-',
        `${user.passedCount}/${user.totalDocs}`,
        user.progressPercent,
        user.avgScore,
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(menteeData);
    XLSX.utils.book_append_sheet(wb, ws2, '멘티 진도');
  }

  // Sheet 3: Quiz Weakness Analysis
  if (quizWeakness && quizWeakness.length > 0) {
    const weaknessData = [
      ['취약 파트 분석 (실패율 높은 문서)', '', '', '', ''],
      ['문서명', '팀', '시도 횟수', '실패율(%)', '평균 점수'],
    ];

    quizWeakness.forEach((item) => {
      weaknessData.push([item.title, item.team, item.attempts, item.failRate, item.avgScore]);
    });

    const ws3 = XLSX.utils.aoa_to_sheet(weaknessData);
    XLSX.utils.book_append_sheet(wb, ws3, '취약 파트');
  }

  // Sheet 4: Team Statistics
  if (teamStats && teamStats.length > 0) {
    const teamData = [
      ['팀별 통계', '', '', ''],
      ['팀', '문서 수', '시도 횟수', '평균 점수'],
    ];

    teamStats.forEach((team) => {
      teamData.push([team.team, team.docCount, team.totalAttempts, team.avgScore || 0]);
    });

    const ws4 = XLSX.utils.aoa_to_sheet(teamData);
    XLSX.utils.book_append_sheet(wb, ws4, '팀별 통계');
  }

  // Export file
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
}

/**
 * Export statistics data to CSV format
 * Simple flat format with all learning records
 */
export function exportToCSV(data, filename = 'ojt_learning_records') {
  const { allRecords, allUsers, allDocs } = data;

  if (!allRecords || allRecords.length === 0) {
    alert('내보낼 학습 기록이 없습니다.');
    return;
  }

  // Create CSV data
  const csvData = [
    ['학습 기록 데이터', '', '', '', '', '', ''],
    ['ID', '사용자 ID', '사용자명', '문서 ID', '문서명', '점수', '총 문항', '통과 여부', '완료일'],
  ];

  allRecords.forEach((record) => {
    const user = allUsers?.find((u) => u.id === record.user_id);
    const doc = allDocs?.find((d) => d.id === record.doc_id);

    csvData.push([
      record.id,
      record.user_id,
      user?.name || 'Unknown',
      record.doc_id,
      doc?.title || 'Unknown',
      record.score,
      record.total_questions,
      record.passed ? 'O' : 'X',
      record.completed_at,
    ]);
  });

  // Convert to CSV string
  const csvContent = csvData.map((row) => row.join(',')).join('\n');

  // Create blob and download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const timestamp = new Date().toISOString().split('T')[0];
  saveAs(blob, `${filename}_${timestamp}.csv`);
}

/**
 * Export statistics data to PDF format
 * Simple text-based table layout
 */
export function exportToPDF(data) {
  const { overallStats, userProgress, quizWeakness, passRate, totalUsers, totalDocs } = data;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(18);
  doc.text('OJT Master - 통계 리포트', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Date
  doc.setFontSize(10);
  const today = new Date().toLocaleDateString('ko-KR');
  doc.text(`생성일: ${today}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Overall Stats
  doc.setFontSize(14);
  doc.text('전체 통계', 15, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.text(`총 사용자: ${totalUsers}명`, 20, yPos);
  yPos += 6;
  doc.text(`총 문서: ${totalDocs}개`, 20, yPos);
  yPos += 6;
  doc.text(`전체 통과율: ${passRate}%`, 20, yPos);
  yPos += 10;

  // Mentee Stats
  doc.setFontSize(14);
  doc.text('멘티 현황', 15, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.text(`총 멘티: ${overallStats.totalMentees}명`, 20, yPos);
  yPos += 6;
  doc.text(`활동 멘티: ${overallStats.activeMentees}명`, 20, yPos);
  yPos += 6;
  doc.text(`전체 완료: ${overallStats.completedAllMentees}명`, 20, yPos);
  yPos += 6;
  doc.text(`평균 진도: ${overallStats.avgProgressPercent}%`, 20, yPos);
  yPos += 15;

  // Top 10 Mentees Progress
  if (userProgress && userProgress.length > 0) {
    doc.setFontSize(14);
    doc.text('멘티별 진도 TOP 10', 15, yPos);
    yPos += 10;

    doc.setFontSize(9);
    const top10 = userProgress.slice(0, 10);

    // Table header
    doc.text('이름', 20, yPos);
    doc.text('부서', 60, yPos);
    doc.text('진도', 100, yPos);
    doc.text('점수', 130, yPos);
    yPos += 6;

    // Draw line
    doc.line(15, yPos - 2, pageWidth - 15, yPos - 2);

    // Table rows
    top10.forEach((user) => {
      if (yPos > 270) {
        // New page
        doc.addPage();
        yPos = 20;
      }

      doc.text(user.name.substring(0, 12), 20, yPos);
      doc.text(user.department?.substring(0, 10) || '-', 60, yPos);
      doc.text(`${user.progressPercent}%`, 100, yPos);
      doc.text(`${user.avgScore}점`, 130, yPos);
      yPos += 6;
    });

    yPos += 10;
  }

  // Quiz Weakness (Top 5)
  if (quizWeakness && quizWeakness.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('취약 파트 TOP 5', 15, yPos);
    yPos += 10;

    doc.setFontSize(9);
    const top5 = quizWeakness.slice(0, 5);

    // Table header
    doc.text('문서명', 20, yPos);
    doc.text('팀', 90, yPos);
    doc.text('실패율', 130, yPos);
    doc.text('시도', 160, yPos);
    yPos += 6;

    // Draw line
    doc.line(15, yPos - 2, pageWidth - 15, yPos - 2);

    // Table rows
    top5.forEach((item) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(item.title.substring(0, 20), 20, yPos);
      doc.text(item.team, 90, yPos);
      doc.text(`${item.failRate}%`, 130, yPos);
      doc.text(`${item.attempts}회`, 160, yPos);
      yPos += 6;
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, {
      align: 'center',
    });
  }

  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`ojt_statistics_${timestamp}.pdf`);
}
