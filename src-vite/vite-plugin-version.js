/**
 * Vite Plugin: Version JSON Generator
 *
 * 빌드 완료 시 dist/version.json 파일을 자동 생성합니다.
 * 클라이언트에서 이 파일을 폴링하여 새 버전을 감지합니다.
 *
 * SSOT: src/version.js의 APP_VERSION을 읽어서 사용
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * version.js에서 APP_VERSION 추출
 * SSOT (Single Source of Truth) - version.js가 유일한 버전 정의 위치
 */
function getVersionFromSource() {
  try {
    const versionFilePath = resolve(__dirname, 'src', 'version.js');
    const content = readFileSync(versionFilePath, 'utf-8');

    // APP_VERSION = '2.34.0' 형태에서 버전 추출
    const match = content.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (match) {
      return match[1];
    }
  } catch (error) {
    console.warn('[Version] Failed to read version.js:', error.message);
  }

  // 폴백: package.json 버전
  return process.env.npm_package_version || '0.0.0';
}

export function versionJsonPlugin() {
  return {
    name: 'version-json-generator',

    // 빌드 완료 후 실행
    closeBundle() {
      const distPath = resolve(__dirname, 'dist');

      // dist 폴더가 없으면 생성
      if (!existsSync(distPath)) {
        mkdirSync(distPath, { recursive: true });
      }

      // 버전 정보 생성 (SSOT: version.js에서 읽기)
      const versionData = {
        version: getVersionFromSource(),
        buildHash: Date.now().toString(36), // 유니크 빌드 해시
        buildTime: new Date().toISOString(),
      };

      // version.json 파일 작성
      const versionPath = resolve(distPath, 'version.json');
      writeFileSync(versionPath, JSON.stringify(versionData, null, 2));

      console.log(`\n[Version] Generated version.json`);
      console.log(`  - Version: ${versionData.version}`);
      console.log(`  - Build Hash: ${versionData.buildHash}`);
      console.log(`  - Build Time: ${versionData.buildTime}\n`);
    },
  };
}
