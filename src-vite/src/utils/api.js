// OJT Master v2.14.0 - API Re-export Hub (Issue #59, #114)
// 모듈 분리 후 하위 호환성을 위한 re-export

// Supabase Client
// TODO (Issue #114): Replace with direct REST API calls to local PostgreSQL
// - Current: Supabase JS client → Supabase Cloud
// - Target: Direct fetch() → Local PostgreSQL REST endpoint (PostgREST)
// - URL: VITE_API_URL (e.g., http://10.10.100.209/api)
export { supabase } from './supabaseClient';

// AI Services
export { checkAIStatus, generateOJTContent } from '@features/ai/services/contentGenerator';
export { validateQuizQuality, regenerateQuizQuestions } from '@features/ai/services/quizValidator';
export {
  createFallbackContent,
  createPlaceholderQuiz,
  normalizeQuizQuestion,
} from '@features/ai/services/fallbackContent';

// Document Services
export { extractUrlText } from '@features/docs/services/urlExtractor';

// Security Utilities
export { validateUrlForSSRF } from './security/validateUrl';

// R2 Upload and PDF Services
import { R2_CONFIG, PDF_CONFIG } from '@/constants';

/**
 * Upload image to R2
 * @param {File} file - Image file
 * @returns {Promise<string>} - Public URL of uploaded image
 */
export async function uploadImageToR2(file) {
  // Validate file type
  if (!R2_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    throw new Error('허용되지 않는 파일 형식입니다.');
  }

  // Validate file size
  if (file.size > R2_CONFIG.MAX_SIZE) {
    throw new Error('파일 크기가 10MB를 초과합니다.');
  }

  // Step 1: Get upload key
  const prepareResponse = await fetch(R2_CONFIG.WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  });

  if (!prepareResponse.ok) {
    const error = await prepareResponse.json();
    throw new Error(error.error || '업로드 준비 실패');
  }

  const { key, publicUrl } = await prepareResponse.json();

  // Step 2: Upload file
  const uploadResponse = await fetch(`${R2_CONFIG.WORKER_URL}/upload`, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'X-Upload-Key': key,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(error.error || '업로드 실패');
  }

  return publicUrl;
}

/**
 * Upload file to R2 (generic, supports images and PDFs)
 * @param {File} file - File to upload
 * @param {string} type - 'image' or 'pdf'
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export async function uploadFileToR2(file, type = 'image') {
  // Validate file type
  if (!R2_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    throw new Error('허용되지 않는 파일 형식입니다.');
  }

  // Validate file size
  if (file.size > R2_CONFIG.MAX_SIZE) {
    throw new Error('파일 크기가 10MB를 초과합니다.');
  }

  // Generate unique key with type prefix
  const prefix = type === 'pdf' ? 'pdfs' : 'images';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const extension = file.name.split('.').pop();
  const key = `${prefix}/${timestamp}-${randomStr}.${extension}`;

  // Step 1: Get upload key
  const prepareResponse = await fetch(R2_CONFIG.WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: key,
      contentType: file.type,
      fileSize: file.size,
    }),
  });

  if (!prepareResponse.ok) {
    const error = await prepareResponse.json();
    throw new Error(error.error || '업로드 준비 실패');
  }

  const { key: uploadKey, publicUrl } = await prepareResponse.json();

  // Step 2: Upload file
  const uploadResponse = await fetch(`${R2_CONFIG.WORKER_URL}/upload`, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'X-Upload-Key': uploadKey,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(error.error || '업로드 실패');
  }

  return publicUrl;
}

/**
 * Extract text from PDF file using pdfjs-dist
 * @param {File} pdfFile - PDF file
 * @returns {Promise<string>} - Extracted text content
 */
export async function extractPdfText(pdfFile) {
  // Dynamic import to avoid issues in test environment
  const pdfjsLib = await import('pdfjs-dist');

  // Configure PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_SRC;

  // Read file as ArrayBuffer
  const arrayBuffer = await pdfFile.arrayBuffer();

  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = Math.min(pdf.numPages, PDF_CONFIG.MAX_PAGES);
  const textParts = [];

  // Extract text from each page
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n\n');
}
