# Task List: URL/PDF 콘텐츠 완전 기능 (PRD-0006)

**Created**: 2025-12-05
**PRD**: [0006-url-pdf-complete-features.md](prds/0006-url-pdf-complete-features.md)
**Related Issues**: #36, #43

---

## Phase 0: 사전 준비 (Prerequisites)

### Task 0.1: react-pdf 패키지 설치
- [ ] `cd src-vite && npm install react-pdf`
- Priority: **Critical**
- Estimate: 10min
- Blocks: Phase 2 전체

### Task 0.2: DocsContext CRUD 함수 추가
- [ ] `updateDocument(docId, updates)` 함수 구현
- [ ] `updateQuiz(docId, quizIndex, updates)` 함수 구현
- [ ] `deleteQuiz(docId, quizIndex)` 함수 구현
- [ ] `addQuiz(docId, quiz)` 함수 구현
- Priority: **Critical**
- Estimate: 2h
- File: `src-vite/src/contexts/DocsContext.jsx`
- Blocks: Phase 3 전체

### Task 0.3: R2 Worker 파일 크기 확대
- [ ] MAX_FILE_SIZE 10MB → 50MB 변경
- [ ] PDF 타입 명시적 지원 추가
- Priority: **Critical**
- Estimate: 30min
- File: `ojt-r2-upload/src/index.js`
- Blocks: Task 2.1

---

## Phase 1: URL 기능 완성 (P0)

### Task 1.1: URL 미리보기 패널 (FR-101)
- [ ] UrlPreviewPanel.jsx 컴포넌트 생성
- [ ] URL 입력 시 텍스트 추출 → 미리보기 표시
- [ ] 제목, 글자수, 예상 시간 표시
- [ ] 추출된 텍스트 첫 500자 미리보기
- Priority: **High**
- Estimate: 3h
- File: `src-vite/src/components/UrlPreviewPanel.jsx`
- Related: FR-101

### Task 1.2: 퀴즈 개별 수정 UI (FR-302)
- [ ] QuizEditor.jsx 컴포넌트 생성
- [ ] 인라인 편집 모드 (질문, 선택지, 정답)
- [ ] 저장/취소 버튼
- [ ] 더미 문제 하이라이트 유지
- Priority: **High**
- Estimate: 4h
- File: `src-vite/src/components/QuizEditor.jsx`
- Depends: Task 0.2
- Related: FR-302

### Task 1.3: 퀴즈 삭제 기능 (FR-305)
- [ ] 개별 퀴즈 삭제 버튼
- [ ] 최소 4개 유지 검증
- [ ] 확인 다이얼로그
- Priority: **Medium**
- Estimate: 1h
- Depends: Task 0.2, Task 1.2
- Related: FR-305

### Task 1.4: 퀴즈 재생성 개선 (FR-303)
- [ ] 원본 URL 컨텍스트 유지하여 재생성
- [ ] 재생성 개수 옵션 (선택/전체)
- Priority: **Medium**
- Estimate: 2h
- Depends: Task 1.2
- Related: FR-303

---

## Phase 2: PDF 기능 구현 (P1)

### Task 2.1: R2 Worker 청크 업로드
- [ ] POST /upload/pdf/init 엔드포인트
- [ ] PUT /upload/pdf/chunk/:id 엔드포인트
- [ ] POST /upload/pdf/complete/:id 엔드포인트
- [ ] 청크 병합 로직
- Priority: **High**
- Estimate: 4h
- File: `ojt-r2-upload/src/index.js`
- Depends: Task 0.3
- Related: FR-201

### Task 2.2: PDF 업로드 UI (FR-201)
- [ ] PdfUploader.jsx 컴포넌트 생성
- [ ] 드래그 앤 드롭 지원
- [ ] 파일 검증 (타입, 크기, MAGIC_NUMBER)
- [ ] 업로드 진행률 표시 (ProgressBar)
- [ ] 취소 버튼
- Priority: **High**
- Estimate: 4h
- File: `src-vite/src/components/PdfUploader.jsx`
- Depends: Task 2.1
- Related: FR-201

### Task 2.3: PDF 미리보기 (FR-201)
- [ ] 업로드 완료 후 첫 페이지 썸네일
- [ ] 페이지 수, 파일 크기 표시
- [ ] "전체보기" 버튼
- Priority: **High**
- Estimate: 2h
- Depends: Task 0.1, Task 2.2
- Related: FR-201

### Task 2.4: PDF 인앱 뷰어 (FR-403)
- [ ] PdfViewer.jsx 컴포넌트 생성 (react-pdf 래퍼)
- [ ] 페이지 네비게이션 (이전/다음)
- [ ] 확대/축소 컨트롤
- [ ] 전체화면 버튼
- [ ] 다운로드 링크
- Priority: **High**
- Estimate: 3h
- File: `src-vite/src/components/PdfViewer.jsx`
- Depends: Task 0.1
- Related: FR-403

### Task 2.5: MentorDashboard PDF 탭 통합
- [ ] PDF 탭 플레이스홀더 → 실제 UI 교체
- [ ] 업로드 → 미리보기 → 퀴즈 생성 흐름
- [ ] source_type='pdf', source_file 저장
- Priority: **High**
- Estimate: 2h
- File: `src-vite/src/components/MentorDashboard.jsx`
- Depends: Task 2.2, Task 2.3
- Related: FR-201

---

## Phase 3: 수정 기능 구현 (P2)

### Task 3.0: 문서 수정 진입점 UI
- [ ] MentorDashboard "내 문서" 목록에서 "수정" 버튼 → 편집 모드
- [ ] 편집 모달 또는 별도 뷰 선택 (모달 권장)
- [ ] 수정 중 상태 표시 (editingDoc !== null)
- [ ] 다른 문서 선택 시 "저장되지 않은 변경사항" 경고
- Priority: **High**
- Estimate: 2h
- Related: FR-102, FR-202

### Task 3.1: URL 문서 수정 UI (FR-102)
- [ ] DocumentEditModal.jsx 컴포넌트 생성
- [ ] 제목 수정 (텍스트 입력)
- [ ] 원본 URL 표시 + [변경] 버튼
- [ ] URL 변경 시:
  - [ ] 새 URL 입력 필드 표시
  - [ ] [재추출] 버튼 → 새 텍스트 추출
  - [ ] 기존 섹션 유지 vs 교체 선택
- [ ] 섹션 편집 (Quill 에디터)
  - [ ] 섹션별 제목/내용 수정
  - [ ] 섹션 추가/삭제/순서변경
- [ ] 팀/스텝 변경 드롭다운
- [ ] 저장 → updateDocument() 호출
- [ ] 취소 → 원본 복원 (confirm 다이얼로그)
- Priority: **High**
- Estimate: 5h
- File: `src-vite/src/components/DocumentEditModal.jsx`
- Depends: Task 0.2, Task 3.0
- Related: FR-102

### Task 3.2: PDF 문서 수정 UI (FR-202)
- [ ] DocumentEditModal에 PDF 분기 추가
- [ ] 기존 PDF 정보 표시:
  - [ ] 파일명, 크기, 페이지 수
  - [ ] 첫 페이지 썸네일 (PdfViewer 재사용)
  - [ ] [원본 보기] 버튼
- [ ] 파일 교체 옵션:
  - [ ] [PDF 교체] 버튼 → PdfUploader 표시
  - [ ] 새 파일 업로드 완료 시 선택:
    - [ ] "기존 퀴즈 유지" (섹션/퀴즈 그대로)
    - [ ] "퀴즈 재생성" (새 PDF 기반 퀴즈 생성)
  - [ ] 기존 R2 파일 삭제 여부 확인
- [ ] 섹션/퀴즈 편집 (Task 3.1과 공유)
- [ ] 저장 시 source_file 업데이트
- Priority: **High**
- Estimate: 4h
- Depends: Task 0.2, Task 3.1, Task 2.2
- Related: FR-202

### Task 3.2.1: R2 파일 삭제 로직
- [ ] R2 Worker DELETE 엔드포인트 확인/구현
- [ ] 문서 수정 시 기존 파일 삭제 API 호출
- [ ] 삭제 실패 시 orphan 파일 로그 기록
- Priority: **Medium**
- Estimate: 1h
- File: `ojt-r2-upload/src/index.js`
- Related: FR-202

### Task 3.3: Split View 레이아웃 (FR-401)
- [ ] SplitViewLayout.jsx 컴포넌트
- [ ] 40:60 비율 (원문:학습콘텐츠)
- [ ] 비율 조절 핸들 (resize)
- [ ] 독립 스크롤
- Priority: **Medium**
- Estimate: 3h
- File: `src-vite/src/components/SplitViewLayout.jsx`
- Depends: Task 2.4
- Related: FR-401

### Task 3.4: MenteeStudy Split View 통합
- [ ] source_type에 따른 원문 뷰어 분기
- [ ] URL → iframe 또는 새탭
- [ ] PDF → PdfViewer
- [ ] manual → 기존 섹션 표시
- Priority: **Medium**
- Estimate: 2h
- File: `src-vite/src/components/MenteeStudy.jsx`
- Depends: Task 3.3
- Related: FR-401

---

## Phase 4: 모바일 최적화 (P3)

### Task 4.1: Tab Switching 레이아웃 (FR-402)
- [ ] TabLayout.jsx 컴포넌트
- [ ] [학습] [원문] 탭 전환
- [ ] 반응형 감지 훅 (useResponsive)
- Priority: **Low**
- Estimate: 2h
- Depends: Task 3.3
- Related: FR-402

### Task 4.2: 퀴즈 추가 기능 (FR-304)
- [ ] "퀴즈 추가" 버튼
- [ ] 수동 추가: 빈 폼
- [ ] AI 추가: N개 생성 요청
- Priority: **Low**
- Estimate: 2h
- Depends: Task 0.2, Task 1.2
- Related: FR-304

### Task 4.3: 반응형 테스트
- [ ] Desktop (≥1024px) 테스트
- [ ] Tablet (768-1023px) 테스트
- [ ] Mobile (<768px) 테스트
- [ ] Playwright 반응형 테스트 추가
- Priority: **Low**
- Estimate: 2h
- Depends: Task 4.1

---

## Phase 5: 테스트 및 검증

### Task 5.1: E2E 테스트 작성
- [ ] e2e-url-workflow.spec.js
- [ ] e2e-pdf-workflow.spec.js
- [ ] e2e-quiz-editor.spec.js
- [ ] e2e-split-view.spec.js
- Priority: **Medium**
- Estimate: 4h
- Depends: Phase 4 완료

### Task 5.2: 단위 테스트 작성
- [ ] DocsContext CRUD 함수 테스트
- [ ] PDF 업로드 함수 테스트
- [ ] 퀴즈 검증 함수 테스트
- Priority: **Medium**
- Estimate: 3h
- Depends: Phase 4 완료

---

## Progress Summary

| Phase | Tasks | Completed | Progress |
|-------|-------|-----------|----------|
| Phase 0: Prerequisites | 3 | 3 | 100% |
| Phase 1: URL (P0) | 4 | 4 | 100% |
| Phase 2: PDF (P1) | 5 | 5 | 100% |
| Phase 3: 수정 (P2) | 6 | 6 | 100% |
| Phase 4: 모바일 (P3) | 3 | 3 | 100% |
| Phase 5: 테스트 | 2 | 2 | 100% |
| **Total** | **23** | **23** | **100%** |

---

## Dependencies Graph

```
Task 0.1 (react-pdf) ───────────────────────────┬─▶ Task 2.3, 2.4
Task 0.2 (DocsContext) ────┬─▶ Task 1.2, 1.3 ───┼─▶ Task 3.0, 3.1, 3.2, 4.2
Task 0.3 (R2 50MB) ────────┼─▶ Task 2.1 ────────┤
                           │                    │
                           ▼                    ▼
                     Task 2.2 ───────────▶ Task 2.5
                           │                    │
                           │                    ▼
                           │              Task 3.2 (PDF 수정)
                           │                    │
                           ▼                    │
Task 3.0 (수정 진입) ──▶ Task 3.1 (URL 수정) ◀──┘
                           │
                           ▼
                     Task 3.2.1 (R2 삭제)
                           │
                           ▼
                     Task 3.3 ──────────▶ Task 3.4 ──▶ Task 4.1
```
