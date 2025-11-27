# PRD-0001: 역할 기반 접근 제어(RBAC) 및 웹 배포 시스템

## 1. 개요 (Overview)

### 1.1 목적
OJT Master 애플리케이션에 실제 운영 환경에서 사용 가능한 인증 시스템과 역할 기반 접근 제어(RBAC)를 구현하고, 웹 배포를 통해 실사용자가 접근할 수 있도록 한다.

### 1.2 배경
현재 시스템은 익명 로그인(`signInAnonymously`)을 사용하는 프로토타입 상태로, 실제 사용자 식별이 불가능하며 데이터 보안이 취약하다. 멘토/멘티 간 데이터 접근 권한 분리가 필요하다.

### 1.3 범위
- Google OAuth 인증 구현
- Firestore 보안 규칙 설정
- 역할 기반 데이터 접근 제어
- Vercel 배포 환경 구성

---

## 2. 요구사항 (Requirements)

### 2.1 기능 요구사항 (Functional Requirements)

| ID | 우선순위 | 요구사항 | 설명 |
|----|---------|---------|------|
| FR-001 | P0 | Google 로그인 | 익명 로그인 대신 Google OAuth 인증 사용 |
| FR-002 | P0 | 역할 선택 및 저장 | 최초 로그인 시 멘토/멘티 역할 선택, Firestore에 영구 저장 |
| FR-003 | P0 | 역할 기반 화면 라우팅 | 저장된 역할에 따라 적절한 대시보드로 자동 이동 |
| FR-004 | P1 | 멘토 전용 기능 | OJT 자료 생성, 수정, 삭제 권한 |
| FR-005 | P1 | 멘티 읽기 전용 | 공개된 OJT 자료 조회 및 퀴즈 응시만 가능 |
| FR-006 | P2 | 로그아웃 기능 | 세션 종료 및 로그인 화면으로 복귀 |

### 2.2 비기능 요구사항 (Non-Functional Requirements)

| ID | 우선순위 | 요구사항 | 설명 |
|----|---------|---------|------|
| NFR-001 | P0 | 데이터 보안 | Firestore 보안 규칙으로 무단 접근 차단 |
| NFR-002 | P0 | HTTPS 배포 | Vercel을 통한 SSL 인증서 자동 적용 |
| NFR-003 | P1 | 세션 유지 | 브라우저 재접속 시 로그인 상태 유지 |

---

## 3. 기술 설계 (Technical Design)

### 3.1 인증 흐름

```
[사용자] → [Google OAuth] → [Firebase Auth]
                                    ↓
                            [onAuthStateChanged]
                                    ↓
                    [Firestore: users/{uid}/profile/me 조회]
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            [프로필 존재]                    [프로필 없음]
                    ↓                               ↓
        [역할에 따라 대시보드 이동]         [역할 선택 화면]
```

### 3.2 Firestore 데이터 구조

```
artifacts/{appId}/
├── users/{userId}/
│   ├── profile/me          # 사용자 역할 정보
│   │   ├── uid: string
│   │   ├── role: "mentor" | "mentee"
│   │   └── joinedAt: timestamp
│   └── ojt_docs/{docId}    # 멘토가 생성한 문서
│       ├── title: string
│       ├── team: string
│       ├── step: number
│       ├── sections: array
│       ├── quiz: array
│       ├── authorId: string
│       └── createdAt: timestamp
└── public/                  # (향후 확장) 공개 문서 컬렉션
    └── ojt_docs/{docId}
```

### 3.3 Firestore 보안 규칙

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 사용자 프로필: 본인만 읽기/쓰기
    match /artifacts/{appId}/users/{userId}/profile/me {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // OJT 문서: 작성자는 모든 권한, 타인은 읽기만
    match /artifacts/{appId}/users/{userId}/ojt_docs/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // 멘티 읽기 허용 (확장 시 public 컬렉션 사용 권장)
    }
  }
}
```

### 3.4 코드 변경 사항

#### 3.4.1 Firebase Auth Import 추가
```javascript
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
```

#### 3.4.2 Google 로그인 핸들러
```javascript
const handleLogin = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login error:", error);
  }
};
```

#### 3.4.3 initAuth 함수 수정
- `signInAnonymously` 호출 제거
- Google 로그인 버튼 UI 추가

---

## 4. 배포 계획 (Deployment Plan)

### 4.1 Vercel 배포 절차

1. GitHub 레포지토리에 코드 푸시
2. Vercel 프로젝트 생성 및 레포 연결
3. 환경 변수 설정 (Firebase 설정값)
4. 자동 배포 트리거

### 4.2 Firebase 설정

1. Firebase Console > Authentication > Sign-in method에서 Google 활성화
2. Firestore Rules 탭에서 보안 규칙 적용
3. 승인된 도메인에 Vercel 배포 URL 추가

---

## 5. 테스트 계획 (Test Plan)

| ID | 테스트 항목 | 예상 결과 |
|----|-----------|----------|
| TC-001 | Google 로그인 시도 | 팝업 → 인증 → 앱 복귀 |
| TC-002 | 신규 사용자 역할 선택 | Firestore에 프로필 생성 |
| TC-003 | 기존 사용자 재접속 | 저장된 역할 대시보드로 이동 |
| TC-004 | 멘토: 문서 생성/삭제 | 정상 작동 |
| TC-005 | 멘티: 문서 삭제 시도 | 권한 오류 발생 |
| TC-006 | 로그아웃 | 로그인 화면으로 복귀 |

---

## 6. 위험 요소 (Risks)

| 위험 | 영향 | 완화 방안 |
|-----|-----|---------|
| 멘토 데이터 멘티 공유 불가 | 멘티가 다른 멘토의 자료 열람 불가 | `public` 컬렉션 도입 또는 공유 로직 추가 |
| Google 인증 실패 | 서비스 이용 불가 | 에러 핸들링 및 재시도 UI |
| 보안 규칙 오설정 | 데이터 유출 또는 접근 차단 | 배포 전 규칙 시뮬레이터로 테스트 |

---

## 7. 마일스톤 (Milestones)

| 단계 | 내용 |
|-----|-----|
| M1 | Google OAuth 인증 구현 |
| M2 | 역할 선택/저장 로직 완성 |
| M3 | Firestore 보안 규칙 적용 |
| M4 | Vercel 배포 및 도메인 설정 |
| M5 | E2E 테스트 완료 |

---

## 8. 참고 자료 (References)

- [Firebase Authentication - Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Vercel Deployment Guide](https://vercel.com/docs)
