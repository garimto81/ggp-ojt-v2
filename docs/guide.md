웹 배포와 계정별 권한(Role-Based Access Control) 설정을 위해서는 크게 세 가지 단계가 필요합니다.

1.  **인증(Authentication) 강화:** 익명 로그인 대신 **Google 로그인**이나 이메일 로그인을 사용하여 사용자를 식별해야 합니다.
2.  **사용자 정보 및 권한 저장:** 사용자가 처음 로그인할 때 '멘토'인지 '멘티'인지 선택하게 하고, 이 정보를 **Firestore의 `users` 컬렉션**에 영구 저장해야 합니다.
3.  **보안 규칙(Security Rules) 설정:** 멘티가 멘토의 데이터를 수정하지 못하도록 Firebase 콘솔에서 규칙을 설정해야 합니다.

현재 프로토타입 코드를 \*\*"로그인 후 역할(Role)을 DB에 저장하고, 재접속 시 해당 권한을 자동으로 불러오는 구조"\*\*로 업그레이드해 드리겠습니다.

### 1\. 업데이트된 코드 (권한 관리 기능 추가)

기존의 단순 화면 전환(`setRole`) 방식을 제거하고, **DB에 저장된 사용자 정보(`userData`)를 기반으로 화면을 렌더링**하도록 변경했습니다.

http://googleusercontent.com/immersive_entry_chip/0

### 2\. 배포 및 보안 설정 가이드

웹으로 배포하고 실제 계정/권한 시스템이 작동하게 하려면 다음 절차를 따라주세요.

#### 1단계: 배포 (Vercel 추천)

가장 쉽고 빠른 방법은 **Vercel**을 사용하는 것입니다.

1.  GitHub에 현재 코드를 업로드합니다.
2.  [Vercel](https://vercel.com)에 로그인 후 'Add New Project'를 클릭합니다.
3.  GitHub 레포지토리를 연결합니다.
4.  **Framework Preset**을 `Next.js` (또는 Create React App)로 선택합니다.
5.  **Deploy** 버튼을 누르면 끝입니다.

#### 2단계: Firebase 보안 규칙 (Firestore Rules) 설정 **(필수)**

권한을 분리했으므로, 멘티가 데이터를 조작하지 못하게 막아야 합니다. Firebase Console \> Firestore Database \> Rules 탭에 다음 규칙을 붙여넣으세요.

````javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1. 사용자 프로필 규칙
    match /artifacts/{appId}/users/{userId}/profile/me {
      // 내 프로필은 내가 읽고 쓸 수 있음
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 2. OJT 문서 규칙
    match /artifacts/{appId}/users/{userId}/ojt_docs/{docId} {
      // 멘토(작성자)는 모든 권한 가짐
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // 멘티(다른 사용자)는 읽기만 가능 (실제 서비스 확장 시 public 컬렉션 사용 권장)
      // 현재 구조에서는 멘토가 자신의 문서를 멘티에게 보여주려면 
      // 별도의 공유 로직이나 'public' 컬렉션으로 복사하는 과정이 필요합니다.
    }
  }
}

#### 3단계: 인증 방식 변경 (코드 수정 필요)
현재 코드는 프로토타입용 `signInAnonymously`(익명 로그인)를 사용하고 있습니다. 실제 사용자를 식별하려면 **Google 로그인**으로 교체해야 합니다.

1.  Firebase Console > Authentication > Sign-in method 에서 **Google**을 사용 설정합니다.
2.  코드 상단의 `initAuth` 함수 부분을 다음과 같이 수정하면 됩니다.

```javascript
// (참고용 - 실제 코드에 적용 시)
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const handleLogin = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    // 로그인 성공 시 useEffect의 onAuthStateChanged가 트리거되어 프로필 확인 로직이 실행됨
  } catch (error) {
    console.error(error);
  }
};

이제 이 코드를 배포하면 사용자는 처음 접속 시 역할을 선택하고, 이후에는 자동으로 해당 대시보드로 접속하게 됩니다.
````