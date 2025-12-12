/**
 * Vite Plugin: Version JSON Generator
 *
 * 빌드 완료 시 dist/version.json 파일을 자동 생성합니다.
 * 클라이언트에서 이 파일을 폴링하여 새 버전을 감지합니다.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

      // 버전 정보 생성
      const versionData = {
        version: process.env.npm_package_version || '0.0.0',
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
