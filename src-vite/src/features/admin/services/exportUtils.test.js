// OJT Master v2.10.0 - Export Utils Tests (Phase 6)

import { describe, it, expect, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { exportToExcel, exportToCSV, exportToPDF } from './exportUtils';

// Mock dependencies
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

vi.mock('jspdf', () => {
  const mockPDF = function () {
    return {
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
        getNumberOfPages: () => 1,
      },
      setFontSize: vi.fn(),
      text: vi.fn(),
      line: vi.fn(),
      addPage: vi.fn(),
      setPage: vi.fn(),
      save: vi.fn(),
    };
  };
  return {
    default: mockPDF,
  };
});

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

describe('exportUtils', () => {
  const mockData = {
    overallStats: {
      totalMentees: 10,
      activeMentees: 8,
      completedAllMentees: 3,
      avgProgressPercent: 65,
    },
    userProgress: [
      {
        id: 'user1',
        name: '김철수',
        department: '개발팀',
        passedCount: 5,
        totalDocs: 10,
        progressPercent: 50,
        avgScore: 85,
      },
    ],
    quizWeakness: [
      {
        docId: 'doc1',
        title: 'React 기초',
        team: 'Frontend',
        attempts: 10,
        failRate: 40,
        avgScore: 72,
      },
    ],
    teamStats: [
      {
        team: 'Frontend',
        docCount: 5,
        totalAttempts: 20,
        avgScore: 80,
      },
    ],
    passRate: 75,
    totalUsers: 20,
    totalDocs: 15,
    totalRecords: 50,
    allRecords: [],
    allUsers: [],
    allDocs: [],
  };

  describe('exportToExcel', () => {
    it('should create workbook with multiple sheets', () => {
      vi.clearAllMocks();
      exportToExcel(mockData);

      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledTimes(4); // 4 sheets
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(4);
      expect(XLSX.writeFile).toHaveBeenCalled();
    });

    it('should handle empty data arrays', () => {
      vi.clearAllMocks();
      const emptyData = {
        ...mockData,
        userProgress: [],
        quizWeakness: [],
        teamStats: [],
      };

      exportToExcel(emptyData);

      // Should only create overview sheet
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('exportToCSV', () => {
    it('should show alert when no records', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      exportToCSV({ ...mockData, allRecords: [] });

      expect(alertSpy).toHaveBeenCalledWith('내보낼 학습 기록이 없습니다.');
      alertSpy.mockRestore();
    });

    it('should export CSV with records', async () => {
      const { saveAs } = await import('file-saver');
      const dataWithRecords = {
        ...mockData,
        allRecords: [
          {
            id: 'rec1',
            user_id: 'user1',
            doc_id: 'doc1',
            score: 85,
            total_questions: 10,
            passed: true,
            completed_at: '2024-01-01',
          },
        ],
      };

      exportToCSV(dataWithRecords);

      expect(saveAs).toHaveBeenCalled();
      const blob = saveAs.mock.calls[0][0];
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('exportToPDF', () => {
    it('should generate PDF with stats', () => {
      // PDF generation doesn't throw errors
      expect(() => exportToPDF(mockData)).not.toThrow();
    });
  });
});
