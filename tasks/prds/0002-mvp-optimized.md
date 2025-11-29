# PRD-0002: OJT Master MVP 최적화 설계 (로컬 버전)

> ⚠️ **레거시 문서**: 이 PRD는 로컬 Ollama 기반 v1.x 설계입니다.
>
> 현재 v2.0.0은 **Google Gemini API + Supabase** 아키텍처를 사용합니다.
> 최신 설계: [0003-web-deployment.md](./0003-web-deployment.md)

---

## 1. 목표

### 핵심 목표 (PRD 원본)
- **Input Minimization**: 비정형 데이터 → 고품질 교육 자료
- **Output Maximization**: AI 커리큘럼 + 퀴즈 자동 생성
- **Data-Driven**: 학습 결과 데이터화

### MVP 범위 (Phase 1)
> **텍스트 입력 → AI 자료 생성 → 4지선다 퀴즈**

### 설계 원칙
- **100% 로컬/오픈소스**: 외부 서비스 의존성 제거
- **무료**: API 키, 구독료 없음
- **오프라인 지원**: 인터넷 연결 없이도 기본 기능 동작

---

## 2. 역할 정의

### 멘토 (Mentor)
- OJT 자료 생성 (AI 변환)
- 자신이 만든 자료 관리 (조회, 삭제)
- 생성한 자료는 **자동으로 모든 멘티에게 공개**

### 멘티 (Mentee)
- **자신의 데이터 없음** (생성 권한 없음)
- 모든 멘토가 생성한 공개 자료 열람
- 자료 학습 + 퀴즈 응시

### 데이터 흐름
```
[멘토] → 자료 생성 → [IndexedDB: ojt_docs]
                            ↓
                    (같은 브라우저의 모든 사용자 접근 가능)
                            ↓
[멘티] → 자료 목록 조회 → 학습 → 퀴즈
```

---

## 3. 기술 스택

### 최소 기술 구성 (100% 로컬)

| 영역 | 기술 | 이유 |
|------|------|------|
| **Frontend** | React 18 (CDN) | 빌드 불필요, 즉시 실행 |
| **Styling** | Tailwind CSS (CDN) | 설치 불필요 |
| **Icons** | Lucide React (CDN) | 경량 아이콘 |
| **AI** | Ollama (로컬) | 무료, 오픈소스 LLM |
| **Auth** | 로컬 인증 | 이름 기반, localStorage |
| **DB** | IndexedDB | 브라우저 내장 NoSQL |
| **Hosting** | 파일 시스템 | 브라우저에서 직접 열기 |

### 비용: $0 (완전 무료)

### Ollama 설정
```bash
# 설치 (Windows)
winget install Ollama.Ollama

# 모델 다운로드 (권장: llama3.2:3b - 경량)
ollama pull llama3.2:3b

# 서버 실행 (기본 포트 11434)
ollama serve
```

---

## 4. IndexedDB 데이터 구조

### 데이터베이스: `OJTMasterDB`

```
Store: users
─────────────
{
  id: string (자동 생성),
  name: string,
  role: "mentor" | "mentee",
  createdAt: timestamp
}

Store: ojt_docs
───────────────
{
  id: string (자동 생성),
  title: string,
  team: string,
  step: number,
  sections: [{ title, content }],
  quiz: [{ id, question, options, answer }],
  author: string (displayName),
  authorId: string (사용자 id),
  createdAt: timestamp
}
```

### 접근 규칙 (앱 레벨)

| Store | 읽기 | 쓰기 |
|-------|------|------|
| `users` | 본인만 | 본인만 |
| `ojt_docs` | 모든 로그인 사용자 | 작성자만 |

---

## 5. 기능 명세

### 5.1 인증 (Auth)

| ID | 기능 | 설명 |
|----|------|------|
| A-01 | 로컬 로그인 | 이름 입력으로 간편 로그인 |
| A-02 | 역할 선택 | 최초 로그인 시 멘토/멘티 선택 |
| A-03 | 자동 라우팅 | 역할에 따라 대시보드 분기 |
| A-04 | 로그아웃 | localStorage 세션 종료 |

### 5.2 멘토 기능

| ID | 기능 | 설명 |
|----|------|------|
| M-01 | 자료 입력 | 팀, 단계, 내용 입력 폼 |
| M-02 | AI 변환 | Ollama API로 구조화 + 퀴즈 생성 |
| M-03 | 미리보기 | 생성 결과 확인 |
| M-04 | 저장 | IndexedDB에 저장 |
| M-05 | 내 자료 목록 | 자신이 만든 자료 조회 |
| M-06 | 삭제 | 자신의 자료만 삭제 가능 |

### 5.3 멘티 기능

| ID | 기능 | 설명 |
|----|------|------|
| L-01 | 팀 선택 | 학습할 팀 선택 |
| L-02 | 자료 목록 | 해당 팀의 모든 공개 자료 |
| L-03 | 자료 학습 | 섹션별 내용 읽기 |
| L-04 | 퀴즈 도전 | 20문제 중 4문제 랜덤 출제 |
| L-05 | 결과 확인 | 3/4 이상 정답 시 통과 |

---

## 6. AI 프롬프트 설계

### Ollama 연동
```javascript
const OLLAMA_URL = "http://localhost:11434";
const OLLAMA_MODEL = "llama3.2:3b";

// API 호출
const response = await fetch(`${OLLAMA_URL}/api/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: OLLAMA_MODEL,
    prompt: prompt,
    stream: false
  })
});
```

### 입력
- 비정형 텍스트 (메모, 회의록 등)
- 대상 팀
- 단계 (Step)

### 출력 (JSON)
```json
{
  "title": "문서 제목",
  "sections": [
    { "title": "섹션 제목", "content": "상세 내용" }
  ],
  "quiz": [
    {
      "id": 1,
      "question": "문제",
      "options": ["A", "B", "C", "D"],
      "answer": 0
    }
  ]
}
```

### 퀴즈 로직
- AI가 20문제 생성
- 학습자에게 4문제 랜덤 출제
- 매번 다른 문제 조합 (부정행위 방지)
- 3문제 이상 정답 시 통과

---

## 7. 실행 방법

### 사전 요구사항

1. **Ollama 설치 및 실행**
   ```bash
   # Windows
   winget install Ollama.Ollama

   # macOS
   brew install ollama

   # 모델 다운로드
   ollama pull llama3.2:3b

   # 서버 실행
   ollama serve
   ```

2. **CORS 설정** (선택사항)
   - Ollama는 기본적으로 localhost에서 CORS 허용
   - 다른 도메인에서 사용 시 환경변수 설정 필요:
   ```bash
   OLLAMA_ORIGINS=* ollama serve
   ```

### 실행

```bash
# 방법 1: 파일 직접 열기
# 브라우저에서 index.html 파일 열기 (file:// 프로토콜)

# 방법 2: 로컬 서버 (권장)
npx serve .
# 또는
python -m http.server 8000
```

### Ollama 상태 확인
- 앱 상단에 "Ollama: 연결됨" 표시 확인
- 연결 실패 시 "Ollama: 연결 안됨" 경고 표시

---

## 8. Phase 2 로드맵 (향후)

| 우선순위 | 기능 | 설명 |
|:--------:|------|------|
| 1 | 학습 진도 추적 | 멘티별 완료 현황 (IndexedDB) |
| 2 | PDF 업로드 | 파일 텍스트 추출 (pdf.js) |
| 3 | 대시보드 | 팀별/개인별 통계 |
| 4 | 데이터 내보내기 | JSON 파일로 백업/복원 |
| 5 | 오답 노트 | 틀린 문제 복습 |
| 6 | 서버 버전 | Node.js + SQLite로 다중 사용자 지원 |

---

## 9. 파일 구조

```
ggp_ojt_v2/
├── index.html          # 전체 앱 (단일 파일)
├── docs/
│   ├── prd.md          # 원본 PRD
│   └── guide.md        # 배포 가이드
└── tasks/
    └── prds/
        └── 0002-mvp-optimized.md  # 이 문서
```

---

## 10. 제한사항

### 현재 버전 (로컬)
- **단일 브라우저**: 데이터는 IndexedDB에 저장되어 해당 브라우저에서만 접근 가능
- **데이터 공유 불가**: 다른 컴퓨터/브라우저 간 데이터 공유 안됨
- **백업 필요**: 브라우저 데이터 삭제 시 자료 손실

### 해결 방안 (Phase 2)
- JSON 내보내기/가져오기 기능 추가
- 서버 버전 개발 (Node.js + SQLite)
- WebRTC P2P 데이터 동기화

---

## 11. Firebase 버전과 비교

| 항목 | Firebase 버전 | 로컬 버전 |
|------|---------------|-----------|
| **AI** | Gemini API (무료 티어) | Ollama (완전 무료) |
| **DB** | Firestore (클라우드) | IndexedDB (브라우저) |
| **Auth** | Google OAuth | 이름 기반 |
| **다중 사용자** | 지원 | 미지원 (단일 브라우저) |
| **오프라인** | 제한적 | 완전 지원 |
| **비용** | $0 (무료 티어) | $0 (완전 무료) |
| **설정 복잡도** | 중간 (Firebase 설정) | 낮음 (Ollama만 설치) |
