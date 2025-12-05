// ojt-r2-upload Worker Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock R2 bucket
const mockR2Bucket = {
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  delete: vi.fn().mockResolvedValue(undefined),
};

// Mock environment
const mockEnv = {
  R2_BUCKET: mockR2Bucket,
  R2_PUBLIC_URL: 'https://pub-test.r2.dev',
  ALLOWED_ORIGINS_PROD: 'https://ggp-ojt-v2.vercel.app',
  ALLOWED_ORIGINS_DEV: 'http://localhost:3000,http://localhost:5173',
};

// Import worker after mocks are set up
import worker from './index.js';

describe('ojt-r2-upload Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CORS', () => {
    it('handles OPTIONS preflight request', async () => {
      const request = new Request('https://worker.dev/', {
        method: 'OPTIONS',
        headers: { Origin: 'https://ggp-ojt-v2.vercel.app' },
      });

      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://ggp-ojt-v2.vercel.app'
      );
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('blocks requests from unauthorized origins', async () => {
      const request = new Request('https://worker.dev/health', {
        method: 'GET',
        headers: { Origin: 'https://evil-site.com' },
      });

      const response = await worker.fetch(request, mockEnv);
      const data = await response.json();

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('');
    });
  });

  describe('Health Check', () => {
    it('returns healthy status', async () => {
      const request = new Request('https://worker.dev/health', {
        method: 'GET',
        headers: { Origin: 'https://ggp-ojt-v2.vercel.app' },
      });

      const response = await worker.fetch(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('CORS Proxy (FR-801)', () => {
    it('requires url parameter', async () => {
      const request = new Request('https://worker.dev/proxy', {
        method: 'GET',
        headers: { Origin: 'https://ggp-ojt-v2.vercel.app' },
      });

      const response = await worker.fetch(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('url 파라미터');
    });

    it('validates URL format', async () => {
      const request = new Request('https://worker.dev/proxy?url=not-a-valid-url', {
        method: 'GET',
        headers: { Origin: 'https://ggp-ojt-v2.vercel.app' },
      });

      const response = await worker.fetch(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('유효하지 않은 URL');
    });

    it('blocks localhost URLs (SSRF protection)', async () => {
      const request = new Request('https://worker.dev/proxy?url=http://localhost:8080/secret', {
        method: 'GET',
        headers: { Origin: 'https://ggp-ojt-v2.vercel.app' },
      });

      const response = await worker.fetch(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('내부 네트워크');
    });

    it('blocks internal IP addresses (SSRF protection)', async () => {
      const internalIPs = ['127.0.0.1', '10.0.0.1', '192.168.1.1', '172.16.0.1'];

      for (const ip of internalIPs) {
        const request = new Request(`https://worker.dev/proxy?url=http://${ip}/`, {
          method: 'GET',
          headers: { Origin: 'https://ggp-ojt-v2.vercel.app' },
        });

        const response = await worker.fetch(request, mockEnv);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toContain('내부 네트워크');
      }
    });

    it('blocks non-http protocols', async () => {
      const request = new Request('https://worker.dev/proxy?url=file:///etc/passwd', {
        method: 'GET',
        headers: { Origin: 'https://ggp-ojt-v2.vercel.app' },
      });

      const response = await worker.fetch(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('프로토콜');
    });
  });

  describe('Upload Flow', () => {
    it('prepares upload with valid request', async () => {
      const request = new Request('https://worker.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://ggp-ojt-v2.vercel.app',
        },
        body: JSON.stringify({
          filename: 'test.png',
          contentType: 'image/png',
          fileSize: 1024,
        }),
      });

      const response = await worker.fetch(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.key).toMatch(/^uploads\/\d+-\w+\.png$/);
      expect(data.uploadUrl).toBe('https://worker.dev/upload');
      expect(data.publicUrl).toContain('pub-test.r2.dev');
    });

    it('rejects unsupported file types', async () => {
      const request = new Request('https://worker.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://ggp-ojt-v2.vercel.app',
        },
        body: JSON.stringify({
          filename: 'malware.exe',
          contentType: 'application/x-executable',
        }),
      });

      const response = await worker.fetch(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('허용되지 않는 파일 형식');
    });

    it('rejects files exceeding size limit', async () => {
      const request = new Request('https://worker.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://ggp-ojt-v2.vercel.app',
        },
        body: JSON.stringify({
          filename: 'large.png',
          contentType: 'image/png',
          fileSize: 20 * 1024 * 1024, // 20MB
        }),
      });

      const response = await worker.fetch(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('10MB');
    });
  });

  describe('Method Not Allowed', () => {
    it('returns 405 for unsupported methods', async () => {
      const request = new Request('https://worker.dev/unknown', {
        method: 'PATCH',
        headers: { Origin: 'https://ggp-ojt-v2.vercel.app' },
      });

      const response = await worker.fetch(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });
  });
});
