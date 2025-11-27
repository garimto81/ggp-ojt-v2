# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJT Master - AI 기반 신입사원 교육 자료 생성 및 학습 관리 시스템

## Tech Stack

- **Frontend**: React (단일 파일 구조 - `index.html`)
- **Backend/DB**: Firebase (Firestore, Authentication)
- **AI**: Google Gemini API (`gemini-2.5-flash-preview-09-2025`)
- **Styling**: Tailwind CSS (CDN)
- **Icons**: Lucide React

## Architecture

단일 `index.html` 파일에 모든 React 코드가 포함된 SPA 구조:

```
index.html
├── Firebase 초기화 (Auth + Firestore)
├── Gemini AI 콘텐츠 생성 함수
├── App 컴포넌트
│   ├── 인증 상태 관리 (익명/커스텀 토큰)
│   ├── 역할 기반 뷰 분기 (Mentor/Mentee)
│   ├── MentorDashboard (자료 생성)
│   ├── MenteeList (로드맵 탐색)
│   └── MenteeStudy (학습 + 퀴즈)
└── 퀴즈 로직 (4문제 랜덤 추출, 3/4 통과)
```

## Firestore Data Structure

```
artifacts/{appId}/users/{userId}/
├── profile/me          # 사용자 역할 정보
└── ojt_docs/           # OJT 문서 컬렉션
    └── {docId}
        ├── title, team, step
        ├── sections[]
        └── quiz[] (20문제)
```

## Key Runtime Variables

Firebase 설정과 인증 토큰은 런타임에 주입됨:
- `__firebase_config` - Firebase 설정 JSON
- `__app_id` - 애플리케이션 ID
- `__initial_auth_token` - 초기 인증 토큰 (선택적)

## Development Notes

### 로컬 실행
Firebase 에뮬레이터 또는 실제 Firebase 프로젝트 연결 필요. `__firebase_config` 변수가 정의되어야 함.

### AI 생성 포맷
`generateOJTContent` 함수는 다음 JSON 구조를 반환:
```json
{
  "title": "문서 제목",
  "sections": [{"title": "...", "content": "..."}],
  "quiz": [{"id": 1, "question": "...", "options": [...], "answer": 0}]
}
```
퀴즈는 항상 20문제 생성, 학습자에게는 4문제 랜덤 출제.

### 역할 구분
- **Mentor**: 비정형 텍스트 → AI 변환 → Firestore 저장
- **Mentee**: 팀별 로드맵 탐색 → 문서 학습 → 퀴즈 평가
