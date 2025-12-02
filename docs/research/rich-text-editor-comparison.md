# React/Next.js 블록 기반 리치 텍스트 에디터 비교 분석

> 조사일: 2025-11-30
> 목적: 블로그 작성에 최적화된 에디터 선택

---

## 개요

블로그 작성을 위한 블록 기반 리치 텍스트 에디터 6종을 심층 조사하여 비교 분석합니다.

---

## 1. Editor.js

### 기본 정보
- **GitHub**: https://github.com/editor-js/editorjs-core
- **라이선스**: Apache 2.0 (무료 오픈소스)
- **유지보수**: CodeX 팀
- **React 지원**: 비공식 래퍼 (`react-editor-js`)

### 주요 특징
- **블록 스타일 에디터**: 모든 콘텐츠가 블록 단위 (paragraph, header, image 등)
- **JSON 출력**: 깔끔한 JSON 형식으로 데이터 저장
- **플러그인 시스템**: 필요한 블록만 설치하여 사용
- **기본 포함**: Paragraph 블록만 기본 제공, 나머지는 별도 설치

### 이미지/파일 업로드
- 전용 Image Block 플러그인 제공 (`@editorjs/image`)
- 드래그 앤 드롭: 기본 미지원 (커스텀 구현 필요)
- 파일 업로드 로직 직접 구현 필요

### 확장성
- ✅ 커스텀 블록 생성 가능
- ✅ 플러그인 형태로 기능 추가
- ❌ React 네이티브 지원 아님 (래퍼 사용)

### Supabase Storage 연동
- 직접 구현 필요 (공식 예제 없음)
- API 호출을 통한 업로드 로직 작성 필요

### 번들 사이즈 & 성능
- **번들 크기**: 경량 (플러그인 방식으로 필요한 것만 로드)
- **성능**: 좋음 (JSON 기반으로 빠른 파싱)

### 장점
- JSON 출력으로 데이터 구조화가 명확
- 플러그인 방식으로 가벼운 빌드 가능
- 무료 오픈소스

### 단점
- React 공식 지원 없음
- 드래그 앤 드롭 등 기능은 직접 구현 필요
- 비교적 적은 커뮤니티 규모

---

## 2. BlockNote

### 기본 정보
- **GitHub**: https://github.com/TypeCellOS/BlockNote
- **GitHub Stars**: 약 7,000+ (2025년 기준)
- **라이선스**: MPL-2.0 (상업적 사용 가능)
- **기반 기술**: ProseMirror + Tiptap
- **React 지원**: ✅ 네이티브 지원 (`@blocknote/react`)

### 주요 특징
- **노션 스타일 에디터**: 노션과 유사한 UX 제공
- **즉시 사용 가능**: 메뉴, 툴바, 애니메이션 등 내장
- **실시간 협업**: 멀티플레이어 편집 지원
- **타입 안전성**: TypeScript 완벽 지원

### UI 컴포넌트
- ✅ 슬래시(/) 메뉴
- ✅ 포맷 메뉴
- ✅ 드래그 앤 드롭 블록 이동
- ✅ Tab/Shift+Tab 중첩 및 들여쓰기
- ✅ 플레이스홀더 및 애니메이션

### 이미지/파일 업로드
- **파일 업로드 지원**: ✅ 내장 (`uploadFile` prop)
- **드래그 앤 드롭**: ✅ 지원 (블록 이동 + 파일 드롭)
- **예제**: https://www.blocknotejs.org/examples/backend/file-uploading

```typescript
async function uploadFile(file: File) {
  const body = new FormData();
  body.append("file", file);
  const ret = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: body,
  });
  return (await ret.json()).data.url.replace(
    "tmpfiles.org/",
    "tmpfiles.org/dl/",
  );
}

const editor = useCreateBlockNote({
  uploadFile,
});
```

### 확장성
- ✅ 커스텀 블록 스키마 생성
- ✅ 플러그인 확장
- ✅ 완전한 타입 안전성 및 자동완성

### Supabase Storage 연동
- `uploadFile` 콜백에서 Supabase Storage API 호출
- `supabase.storage.from('bucketName').upload()` 통합 용이

### 번들 사이즈 & 성능
- **번들 크기**: 중간 (Tiptap + ProseMirror 포함)
- **성능**: 우수 (ProseMirror의 효율적인 DOM 업데이트)

### 변환 기능
- JSON ↔ Markdown ↔ HTML 상호 변환 지원

### 장점
- 노션 스타일 UX 즉시 사용 가능
- React 네이티브 지원
- 파일 업로드 내장, Supabase 연동 용이
- 실시간 협업 지원
- 100% 오픈소스, 상업적 사용 가능

### 단점
- Tiptap + ProseMirror 종속으로 번들 크기 증가
- 커스터마이징 깊이가 Tiptap보다 제한적
- 비교적 신생 프로젝트 (Tiptap/Lexical 대비)

---

## 3. Tiptap

### 기본 정보
- **GitHub**: https://github.com/ueberdosis/tiptap
- **GitHub Stars**: 33,686+ (2025년 기준)
- **라이선스**: MIT (Core), 유료 플러그인 있음
- **기반 기술**: ProseMirror
- **React 지원**: ✅ 네이티브 지원 (`@tiptap/react`)

### 주요 특징
- **헤드리스 프레임워크**: UI 없이 에디터 로직만 제공
- **100+ 확장 기능**: Core/Pro/Cloud 확장 생태계
- **실시간 협업**: Yjs, Liveblocks 통합
- **Markdown/JSON 출력**: 다양한 포맷 지원

### 이미지/파일 업로드
- **이미지 확장**: `@tiptap/extension-image` (기본 제공)
- **드래그 앤 드롭**: ✅ `FileHandler` 확장 또는 `editorProps.handleDrop` 사용
- **ImageUploadNode**: Tiptap UI Components 제공 (유료)

**무료 드래그 앤 드롭 구현 예제**:
```javascript
editorProps: {
  handleDrop: function(view, event, slice, moved) {
    if (!moved && event.dataTransfer && event.dataTransfer.files[0]) {
      let file = event.dataTransfer.files[0];
      // 업로드 로직 (Supabase Storage 등)
    }
  }
}
```

### 확장성
- ✅ 100+ 확장 플러그인 생태계
- ✅ 커스텀 노드/마크 시스템
- ✅ ProseMirror API 완전 접근

### Supabase Storage 연동
- `handleDrop` 또는 `uploadFile` 함수에서 Supabase API 호출
- 커뮤니티 예제 풍부

### 번들 사이즈 & 성능
- **번들 크기**: 중간 (사용하는 확장에 따라 변동)
- **성능**: 우수 (ProseMirror의 효율적인 렌더링)
- **최적화 팁**: `shouldRerenderOnTransaction: false` 설정 필요

### 장점
- 강력한 확장 생태계
- React 네이티브 지원
- 실시간 협업 기능
- 대규모 커뮤니티 (33k+ stars)
- 헤드리스 아키텍처로 완전한 UI 커스터마이징 가능

### 단점
- UI 컴포넌트 직접 구현 필요 (헤드리스)
- 일부 고급 기능 유료 (Pro/Cloud)
- 설정이 복잡할 수 있음
- 성능 최적화를 위한 추가 설정 필요

---

## 4. Novel.sh

### 기본 정보
- **GitHub**: https://github.com/steven-tey/novel
- **라이선스**: Apache-2.0
- **기반 기술**: Tiptap + OpenAI + Vercel AI SDK
- **React 지원**: ✅ React/Next.js 전용

### 주요 특징
- **AI 자동완성**: OpenAI 기반 AI 컨텐츠 생성
- **노션 스타일**: WYSIWYG 에디터
- **올인원 패키지**: 설치 후 즉시 사용 가능
- **Vercel 최적화**: Vercel 배포 환경에 최적화

### 이미지/파일 업로드
- **Vercel Blob 통합**: ✅ 내장 (환경변수만 설정)
- **드래그 앤 드롭**: ✅ 지원
- **이미지 처리**: Vercel Blob 자동 저장
- **환경변수**: `BLOB_READ_WRITE_TOKEN` 필요

### AI 기능
- **자동완성**: AI 기반 텍스트 제안
- **API 엔드포인트**: `/api/generate` 필요
- **OpenAI 통합**: Vercel AI SDK 사용

### 확장성
- ✅ Tiptap 확장 추가 가능
- ✅ 커스텀 확장 지원
- ⚠️ Vercel Blob에 종속적

### Supabase Storage 연동
- ⚠️ 기본은 Vercel Blob, Supabase 전환 시 커스텀 필요
- Tiptap 기반이므로 업로드 로직 교체 가능

### 번들 사이즈 & 성능
- **번들 크기**: 중간-대형 (Tiptap + OpenAI SDK 포함)
- **성능**: 우수 (Tiptap 기반)

### 장점
- AI 자동완성 즉시 사용 가능
- Vercel 배포 시 이미지 업로드 자동 처리
- 노션 스타일 UX
- 설정 없이 바로 사용 가능

### 단점
- Vercel 생태계 종속적
- Supabase Storage 사용 시 커스터마이징 필요
- AI 기능 사용 시 OpenAI API 비용 발생
- Vercel Blob 스토리지 비용

---

## 5. Plate

### 기본 정보
- **GitHub**: https://github.com/udecode/plate
- **GitHub Stars**: 10,000+ (2025년 기준)
- **사용자**: 10,000+ 개발자
- **기반 기술**: Slate.js + ShadCN UI
- **React 지원**: ✅ React 전용

### 주요 특징
- **플러그인 아키텍처**: 50+ 플러그인
- **헤드리스 디자인**: Radix UI 기반 무스타일 컴포넌트
- **AI 통합**: MCP(Model Context Protocol) 지원
- **상태 관리**: Zustand 사용

### 이미지/파일 업로드
- 플러그인을 통한 이미지 업로드 지원
- 드래그 앤 드롭: 플러그인 설정 필요
- 커스텀 업로드 로직 구현 가능

### 확장성
- ✅ 50+ 헤드리스 플러그인
- ✅ 커스텀 플러그인 생성
- ✅ ShadCN UI로 스타일링

### Supabase Storage 연동
- 업로드 플러그인에서 Supabase API 호출
- 커뮤니티 예제 필요

### 번들 사이즈 & 성능
- **번들 크기**: 중간-대형 (Slate + 플러그인)
- **성능**: 우수 (Slate의 효율적인 모델)

### 장점
- AI 통합 (MCP 지원)
- 강력한 플러그인 생태계
- ShadCN UI로 모던한 디자인
- TypeScript 완벽 지원

### 단점
- 학습 곡선 높음 (Slate.js, React Hooks, 플러그인)
- 설정 복잡도 높음 (AI, MCP, Tailwind CSS 등)
- 직렬화 및 커스텀 플러그인 작성 어려움

---

## 6. Lexical (Meta)

### 기본 정보
- **GitHub**: https://github.com/facebook/lexical
- **GitHub Stars**: 22,538+ (2025년 기준)
- **개발**: Meta (Facebook)
- **React 지원**: ✅ React 18+ (`@lexical/react`)

### 주요 특징
- **확장 가능한 프레임워크**: 최소한의 코어
- **Meta 생산 환경 검증**: Facebook, Instagram, WhatsApp 사용
- **접근성**: 웹 표준 준수
- **플랫폼 독립성**: DOM 기반 라이브러리 모두 지원 가능

### 이미지/파일 업로드
- 플러그인을 통한 이미지 노드 추가
- 드래그 앤 드롭: 커스텀 플러그인 구현 필요

### 확장성
- ✅ 플러그인 시스템
- ✅ 커스텀 노드 생성
- ⚠️ Pure decorations 부재 (스타일링 제한)

### Supabase Storage 연동
- 커스텀 플러그인에서 Supabase API 호출
- 직접 구현 필요

### 번들 사이즈 & 성능
- **번들 크기**: 매우 경량 (코어 22KB min+gzip)
- **성능**: 매우 우수 (Meta의 최적화된 DOM 조정)
- **Lazy Loading**: 플러그인 지연 로딩 가능

### DOM 조정 최적화
- Virtual DOM 없이 직접 DOM 업데이트
- 변경된 부분만 diff 계산하여 성능 극대화

### 장점
- 가장 가벼운 번들 크기 (22KB)
- 블레이징 퍼포먼스
- Meta의 지속적인 유지보수
- 확장성 우수
- TypeScript 친화적

### 단점
- UI 컴포넌트 직접 구현 필요
- 문서 부족 (커뮤니티 피드백)
- 초기 설정 복잡도 높음
- 플러그인 생태계 작음 (Tiptap 대비)

---

## 비교표

| 항목 | Editor.js | BlockNote | Tiptap | Novel.sh | Plate | Lexical |
|------|-----------|-----------|--------|----------|-------|---------|
| **GitHub Stars** | N/A | 7,000+ | 33,686+ | N/A | 10,000+ | 22,538+ |
| **React 지원** | 비공식 | ✅ 네이티브 | ✅ 네이티브 | ✅ 네이티브 | ✅ 네이티브 | ✅ 네이티브 |
| **번들 크기** | 경량 | 중간 | 중간 | 중-대 | 중-대 | 매우 경량 (22KB) |
| **드래그앤드롭** | ❌ | ✅ | ✅ (커스텀) | ✅ | ✅ (플러그인) | ⚠️ (커스텀) |
| **이미지 업로드** | 플러그인 | ✅ 내장 | ✅ 확장 | ✅ Vercel Blob | ✅ 플러그인 | ⚠️ 커스텀 |
| **UI 컴포넌트** | ✅ 내장 | ✅ 내장 | ❌ 헤드리스 | ✅ 내장 | ❌ 헤드리스 | ❌ 헤드리스 |
| **AI 기능** | ❌ | ❌ | ⚠️ 유료 | ✅ OpenAI | ✅ MCP | ❌ |
| **실시간 협업** | ❌ | ✅ | ✅ | ❌ | ❌ | ⚠️ (커스텀) |
| **커스텀 블록** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Supabase 연동** | 직접 구현 | 용이 | 용이 | Vercel 종속 | 직접 구현 | 직접 구현 |
| **라이선스** | Apache 2.0 | MPL-2.0 | MIT (유료 있음) | Apache-2.0 | MIT | MIT |
| **학습 곡선** | 보통 | 낮음 | 중간 | 낮음 | 높음 | 높음 |
| **성능** | 좋음 | 우수 | 우수 | 우수 | 우수 | 매우 우수 |

---

## Supabase Storage 연동 용이성

### 1위: BlockNote
- `uploadFile` prop만 구현하면 즉시 사용 가능
- 공식 예제 제공
- 타입 안전성 보장

```typescript
const editor = useCreateBlockNote({
  uploadFile: async (file: File) => {
    const { data, error } = await supabase.storage
      .from('blog-images')
      .upload(`public/${file.name}`, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(data.path);
    return publicUrl;
  }
});
```

### 2위: Tiptap
- `editorProps.handleDrop` 또는 `FileHandler` 확장 사용
- 커뮤니티 예제 풍부
- 유연한 커스터마이징 가능

### 3위: Novel.sh
- Vercel Blob에서 Supabase로 전환 필요
- Tiptap 기반이므로 이론적으로 가능하나 공식 예제 없음

### 4위: Plate, Lexical, Editor.js
- 직접 구현 필요
- 공식 예제 부재

---

## 블로그 작성 시나리오별 추천

### 시나리오 1: 빠른 프로토타입 + 노션 스타일 UX
**추천**: **BlockNote**

**이유**:
- ✅ 노션 스타일 UX 즉시 사용 가능
- ✅ 파일 업로드 내장, Supabase 연동 용이
- ✅ 실시간 협업 지원
- ✅ 타입 안전성 우수
- ✅ 설정 간단, 학습 곡선 낮음

**적합한 경우**:
- 빠르게 MVP 구축
- 노션과 유사한 편집 경험 제공
- 멀티플레이어 블로그 플랫폼
- TypeScript 프로젝트

---

### 시나리오 2: 완전한 UI 커스터마이징 + 대규모 커뮤니티
**추천**: **Tiptap**

**이유**:
- ✅ 100+ 확장 플러그인 생태계
- ✅ 헤드리스 아키텍처로 완전한 UI 제어
- ✅ 33,000+ GitHub stars, 강력한 커뮤니티
- ✅ 실시간 협업 (Yjs, Liveblocks)
- ✅ Markdown/JSON 출력 지원

**적합한 경우**:
- 브랜드 고유 디자인 시스템 구현
- 독특한 UX 요구사항
- 대규모 커뮤니티 지원 필요
- ProseMirror 경험 있음

---

### 시나리오 3: 최고 성능 + 최소 번들 크기
**추천**: **Lexical**

**이유**:
- ✅ 코어 22KB로 가장 가벼움
- ✅ Meta의 프로덕션 검증 (Facebook, Instagram)
- ✅ 블레이징 퍼포먼스
- ✅ 확장성 우수
- ✅ Lazy loading 지원

**적합한 경우**:
- 모바일 최적화 필수
- 성능이 최우선
- Meta 생태계 신뢰
- 초기 설정 복잡도 감수 가능

---

### 시나리오 4: AI 자동완성 + Vercel 배포
**추천**: **Novel.sh**

**이유**:
- ✅ AI 자동완성 즉시 사용 가능
- ✅ Vercel Blob 이미지 자동 처리
- ✅ 설정 없이 바로 사용
- ✅ 노션 스타일 UX

**적합한 경우**:
- Vercel 배포 환경
- AI 글쓰기 도우미 필요
- 빠른 프로토타입 (Vercel Blob 사용 OK)

⚠️ **주의**: Supabase Storage 사용 시 커스터마이징 필요

---

### 시나리오 5: AI 통합 + ShadCN UI 디자인 시스템
**추천**: **Plate**

**이유**:
- ✅ AI MCP 통합
- ✅ ShadCN UI로 모던한 디자인
- ✅ 50+ 플러그인
- ✅ TypeScript 완벽 지원

**적합한 경우**:
- ShadCN UI 사용 중인 프로젝트
- AI 기능 통합 필요
- Slate.js 경험 있음

⚠️ **주의**: 학습 곡선 높음, 초기 설정 복잡

---

### 시나리오 6: JSON 출력 + 마이크로서비스 아키텍처
**추천**: **Editor.js**

**이유**:
- ✅ 깔끔한 JSON 출력
- ✅ 플러그인 방식으로 가벼운 빌드
- ✅ 프레임워크 독립적

**적합한 경우**:
- JSON 기반 데이터 구조 필요
- 여러 플랫폼에서 콘텐츠 재사용
- React 외 프레임워크 사용 가능성

⚠️ **주의**: React 공식 지원 없음, 드래그 앤 드롭 직접 구현 필요

---

## 최종 추천

### 🏆 1순위: BlockNote (블로그 작성에 최적)

**선택 이유**:
1. **즉시 사용 가능**: 노션 스타일 UX, 파일 업로드 내장
2. **Supabase 연동 용이**: `uploadFile` prop만 구현
3. **실시간 협업**: 멀티플레이어 블로그 가능
4. **낮은 학습 곡선**: 빠른 프로토타입 구축
5. **상업적 사용 가능**: MPL-2.0 라이선스
6. **타입 안전성**: TypeScript 완벽 지원

**사용 예시**:
```typescript
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { supabase } from "./supabaseClient";

function Editor() {
  const editor = useCreateBlockNote({
    uploadFile: async (file: File) => {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(`public/${fileName}`, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(data.path);

      return publicUrl;
    }
  });

  return <BlockNoteView editor={editor} />;
}
```

---

### 🥈 2순위: Tiptap (커스터마이징이 중요한 경우)

**선택 이유**:
1. **완전한 UI 제어**: 헤드리스 아키텍처
2. **강력한 생태계**: 100+ 확장, 33k+ stars
3. **실시간 협업**: Yjs, Liveblocks 지원
4. **유연한 확장성**: 커스텀 노드/마크

**사용 예시**:
```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

const editor = useEditor({
  extensions: [StarterKit, Image],
  editorProps: {
    handleDrop: async (view, event, slice, moved) => {
      if (!moved && event.dataTransfer?.files[0]) {
        const file = event.dataTransfer.files[0];
        const { data } = await supabase.storage
          .from('blog-images')
          .upload(`public/${file.name}`, file);
        // 이미지 노드 삽입 로직
      }
    }
  }
});
```

---

### 🥉 3순위: Lexical (성능이 최우선인 경우)

**선택 이유**:
1. **최소 번들 크기**: 22KB
2. **최고 성능**: Meta의 최적화
3. **Meta 검증**: Facebook, Instagram 사용
4. **확장성**: 플러그인 시스템

⚠️ **주의**: UI 컴포넌트 직접 구현 필요, 학습 곡선 높음

---

## 참고 자료

### Editor.js
- [Editor.js 공식 사이트](https://editorjs.io/)
- [react-editor-js](https://www.npmjs.com/package/react-editor-js)
- [Editor.js Image Block](https://github.com/editor-js/image)
- [DEV: EditorJs in ReactJs](https://dev.to/sumankalia/how-to-integrate-editorjs-in-reactjs-2l6l)

### BlockNote
- [BlockNote 공식 사이트](https://www.blocknotejs.org/)
- [GitHub - TypeCellOS/BlockNote](https://github.com/TypeCellOS/BlockNote)
- [File Upload Example](https://www.blocknotejs.org/examples/backend/file-uploading)
- [Custom Blocks](https://www.blocknotejs.org/docs/custom-schemas/custom-blocks)

### Tiptap
- [Tiptap 공식 사이트](https://tiptap.dev/)
- [GitHub - ueberdosis/tiptap](https://github.com/ueberdosis/tiptap)
- [React Installation](https://tiptap.dev/docs/editor/getting-started/install/react)
- [FileHandler Extension](https://tiptap.dev/docs/editor/extensions/functionality/filehandler)
- [Codemzy: Drag and Drop Images](https://www.codemzy.com/blog/tiptap-drag-drop-image)

### Novel.sh
- [Novel 공식 사이트](https://novel.sh/)
- [GitHub - steven-tey/novel](https://github.com/steven-tey/novel)
- [Vercel Template](https://vercel.com/templates/next.js/novel)
- [Image Upload Discussion](https://github.com/steven-tey/novel/discussions/36)

### Plate
- [Plate 공식 사이트](https://platejs.org/)
- [GitHub - udecode/plate](https://github.com/udecode/plate)
- [Editor Documentation](https://platejs.org/docs/editor)

### Lexical
- [Lexical 공식 사이트](https://lexical.dev/)
- [GitHub - facebook/lexical](https://github.com/facebook/lexical)
- [React Getting Started](https://lexical.dev/docs/getting-started/react)
- [npm - lexical](https://www.npmjs.com/package/lexical)

### Supabase Storage
- [React Native Storage](https://supabase.com/blog/react-native-storage)
- [React User Management App](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
- [Storage Upload API](https://supabase.com/docs/reference/javascript/storage-from-upload)
- [Standard Uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)

### 비교 분석 자료
- [Liveblocks: Which RTE framework in 2025?](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025)
- [DEV: 10 Top Rich Text Editors for React 2025](https://dev.to/joodi/10-top-rich-text-editors-for-react-developers-in-2025-5a2m)
- [Cotocus: Top 10 RTE Tools 2025](https://www.cotocus.com/blog/top-10-rich-text-editors-tools-in-2025-features-pros-cons-comparison/)
- [npm trends: Draft.js vs Lexical vs Tiptap](https://npmtrends.com/draft-js-vs-lexical-vs-medium-editor-vs-quill-vs-slate-vs-tiptap)
- [Best of JS: Rich Text Editors](https://bestofjs.org/projects?page=1&limit=30&tags=rich-text-editor&sort=daily)

---

## 결론

블로그 작성을 위한 에디터로는 **BlockNote**를 1순위로 추천합니다. 노션 스타일의 직관적인 UX, 간편한 파일 업로드, Supabase Storage 연동 용이성, 낮은 학습 곡선이 블로그 프로젝트에 최적화되어 있습니다.

만약 브랜드 고유의 디자인 시스템이 필요하거나 완전한 UI 제어가 필요하다면 **Tiptap**을, 성능과 번들 크기가 최우선이라면 **Lexical**을 고려하세요.

---

**작성자**: Claude Code
**조사 날짜**: 2025-11-30
**프로젝트**: ggp_ojt_v2
