// OJT Master v2.10.0 - API Re-export Hub (Issue #59)
// 모듈 분리 후 하위 호환성을 위한 re-export

// Supabase Client
export { supabase } from './supabaseClient';

// AI Services
export { checkAIStatus, generateOJTContent } from '../features/ai/services/contentGenerator';
export {
  validateQuizQuality,
  regenerateQuizQuestions,
} from '../features/ai/services/quizValidator';
export {
  createFallbackContent,
  createPlaceholderQuiz,
  normalizeQuizQuestion,
} from '../features/ai/services/fallbackContent';

// Document Services
export { extractUrlText } from '../features/docs/services/urlExtractor';

// Security Utilities
export { validateUrlForSSRF } from './security/validateUrl';

// R2 Image Upload (kept inline for simplicity)
import { R2_CONFIG } from '../constants';

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
