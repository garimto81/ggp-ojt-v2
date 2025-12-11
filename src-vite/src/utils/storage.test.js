/**
 * Storage 유틸리티 테스트
 * @agent content-create-agent
 * @blocks storage.pdf
 * @issue #202 - PDF 파일 Supabase Storage 저장
 */

import { describe, it, expect } from 'vitest';
import {
  STORAGE_BUCKET,
  STORAGE_CONFIG,
  validateFileSize,
  validateFileType,
  validateFile,
  generateStoragePath,
  formatFileSize,
} from './storage';

// Mock File 객체 생성 헬퍼
function createMockFile(name, size, type = 'application/pdf') {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('storage', () => {
  describe('STORAGE_CONFIG', () => {
    it('should have correct bucket name', () => {
      expect(STORAGE_BUCKET).toBe('pdfs');
    });

    it('should have 50MB max file size', () => {
      expect(STORAGE_CONFIG.MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    });

    it('should only allow PDF mime type', () => {
      expect(STORAGE_CONFIG.ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(STORAGE_CONFIG.ALLOWED_MIME_TYPES).toHaveLength(1);
    });
  });

  describe('validateFileSize', () => {
    it('should pass for files under 50MB', () => {
      const file = createMockFile('test.pdf', 10 * 1024 * 1024); // 10MB
      const result = validateFileSize(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for files exactly 50MB', () => {
      const file = createMockFile('test.pdf', 50 * 1024 * 1024); // 50MB
      const result = validateFileSize(file);
      expect(result.valid).toBe(true);
    });

    it('should fail for files over 50MB', () => {
      const file = createMockFile('test.pdf', 51 * 1024 * 1024); // 51MB
      const result = validateFileSize(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('50MB');
    });

    it('should show current file size in error', () => {
      const file = createMockFile('test.pdf', 60 * 1024 * 1024); // 60MB
      const result = validateFileSize(file);
      expect(result.error).toContain('60');
    });
  });

  describe('validateFileType', () => {
    it('should pass for PDF mime type', () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const result = validateFileType(file);
      expect(result.valid).toBe(true);
    });

    it('should pass for .pdf extension with wrong mime type', () => {
      const file = createMockFile('test.pdf', 1024, 'application/octet-stream');
      const result = validateFileType(file);
      expect(result.valid).toBe(true);
    });

    it('should fail for non-PDF files', () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const result = validateFileType(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PDF');
    });

    it('should fail for text files', () => {
      const file = createMockFile('test.txt', 1024, 'text/plain');
      const result = validateFileType(file);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should pass for valid PDF under size limit', () => {
      const file = createMockFile('test.pdf', 10 * 1024 * 1024);
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should fail size validation first', () => {
      const file = createMockFile('test.pdf', 60 * 1024 * 1024);
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('MB');
    });

    it('should fail type validation for non-PDF', () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PDF');
    });
  });

  describe('generateStoragePath', () => {
    it('should include docId in path', () => {
      const docId = 'doc-123';
      const path = generateStoragePath(docId, 'test.pdf');
      expect(path).toContain('doc-123');
    });

    it('should include documents prefix', () => {
      const path = generateStoragePath('abc', 'test.pdf');
      expect(path).toMatch(/^documents\//);
    });

    it('should include timestamp for uniqueness', () => {
      const path = generateStoragePath('doc', 'test.pdf');
      // 타임스탬프가 포함되어 있어야 함
      expect(path).toMatch(/documents\/doc\/\d+_test\.pdf/);
    });

    it('should sanitize special characters in filename', () => {
      const path = generateStoragePath('doc', 'my file (1).pdf');
      expect(path).not.toContain(' ');
      expect(path).not.toContain('(');
      expect(path).not.toContain(')');
    });

    it('should preserve Korean characters', () => {
      const path = generateStoragePath('doc', '한글파일.pdf');
      expect(path).toContain('한글파일');
    });

    it('should replace spaces with underscores', () => {
      const path = generateStoragePath('doc', 'my test file.pdf');
      expect(path).toContain('my_test_file.pdf');
    });
  });

  describe('formatFileSize', () => {
    it('should format 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    it('should format MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
    });

    it('should format GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format with decimals', () => {
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    });
  });
});
