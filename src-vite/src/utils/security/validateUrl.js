// OJT Master - URL Security Validator (Issue #59)
// SSRF 방어 로직

/**
 * Validate URL for SSRF attacks
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether the URL is safe
 */
export function validateUrlForSSRF(url) {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and internal IPs
    const blockedPatterns = [
      'localhost',
      '127.',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '192.168.',
      '169.254.',
      '0.0.0.0',
      'metadata.google',
      '169.254.169.254',
    ];

    return !blockedPatterns.some((pattern) => hostname === pattern || hostname.startsWith(pattern));
  } catch {
    return false;
  }
}
