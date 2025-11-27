# Task List: RBAC 및 웹 배포 (PRD-0001)

## 📊 Progress Summary

| Phase | Status | Progress |
|-------|--------|----------|
| Setup | ⏸️ Pending | 0/2 |
| M1: Google OAuth | ⏸️ Pending | 0/4 |
| M2: 역할 관리 | ⏸️ Pending | 0/3 |
| M3: 보안 규칙 | ⏸️ Pending | 0/2 |
| M4: 배포 | ⏸️ Pending | 0/4 |
| M5: 테스트 | ⏸️ Pending | 0/6 |

**Overall: 0/21 (0%)**

---

## Task 0: Setup

- [ ] **0.1** 기능 브랜치 생성
  - Priority: High
  - Command: `git checkout -b feature/0001-rbac-deployment`

- [ ] **0.2** CLAUDE.md 업데이트
  - Priority: Low
  - Note: 인증 관련 설정 추가

---

## Task 1: M1 - Google OAuth 인증 구현

- [ ] **1.1** Firebase Auth Import 추가
  - Priority: High
  - File: `index.html`
  - Code:
    ```javascript
    import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
    ```

- [ ] **1.2** Google 로그인 핸들러 구현
  - Priority: High
  - Depends: 1.1
  - File: `index.html`

- [ ] **1.3** 익명 로그인 코드 제거
  - Priority: High
  - Depends: 1.2
  - Note: `signInAnonymously` 호출 삭제

- [ ] **1.4** 로그인 UI 컴포넌트 추가
  - Priority: High
  - Depends: 1.2
  - Note: Google 로그인 버튼, 로딩 상태

---

## Task 2: M2 - 역할 선택/저장 로직

- [ ] **2.1** 역할 선택 화면 검증
  - Priority: Medium
  - Note: 기존 RoleSelectionPage 컴포넌트 확인

- [ ] **2.2** Firestore 프로필 저장 로직 검증
  - Priority: Medium
  - Depends: 2.1
  - Path: `artifacts/{appId}/users/{uid}/profile/me`

- [ ] **2.3** 재접속 시 역할 자동 로드 검증
  - Priority: Medium
  - Depends: 2.2

---

## Task 3: M3 - Firestore 보안 규칙

- [ ] **3.1** 보안 규칙 파일 작성
  - Priority: High
  - File: `firestore.rules`
  - Note: PRD 섹션 3.3 참조

- [ ] **3.2** Firebase Console에 규칙 적용
  - Priority: High
  - Depends: 3.1
  - Note: Firestore > Rules 탭

---

## Task 4: M4 - Vercel 배포

- [ ] **4.1** Firebase Console 설정
  - Priority: High
  - Steps:
    - Authentication > Google 활성화
    - 승인된 도메인 추가

- [ ] **4.2** GitHub 레포지토리 푸시
  - Priority: High
  - Status: ✅ Completed
  - URL: https://github.com/garimto81/ggp-ojt-v2

- [ ] **4.3** Vercel 프로젝트 생성
  - Priority: High
  - Depends: 4.2

- [ ] **4.4** 환경 변수 설정
  - Priority: High
  - Depends: 4.3
  - Variables: `FIREBASE_CONFIG`, `APP_ID`

---

## Task 5: M5 - E2E 테스트

- [ ] **5.1** TC-001: Google 로그인 테스트
  - Priority: High
  - Expected: 팝업 → 인증 → 앱 복귀

- [ ] **5.2** TC-002: 신규 사용자 역할 선택 테스트
  - Priority: High
  - Expected: Firestore에 프로필 생성

- [ ] **5.3** TC-003: 기존 사용자 재접속 테스트
  - Priority: High
  - Expected: 저장된 역할 대시보드로 이동

- [ ] **5.4** TC-004: 멘토 문서 CRUD 테스트
  - Priority: Medium
  - Expected: 생성/수정/삭제 정상 작동

- [ ] **5.5** TC-005: 멘티 권한 제한 테스트
  - Priority: Medium
  - Expected: 문서 삭제 시 권한 오류

- [ ] **5.6** TC-006: 로그아웃 테스트
  - Priority: Low
  - Expected: 로그인 화면으로 복귀

---

## Notes

- 현재 코드에 역할 관리 로직(M2)은 이미 구현되어 있음
- M1 완료 후 M2 검증만 필요
- M3, M4는 Firebase Console 작업 필요
