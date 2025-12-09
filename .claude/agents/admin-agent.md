# Admin Domain Agent Rules

**Version**: 1.0.0 | **Domain**: Admin | **Level**: 1

---

## Identity

| 속성 | 값 |
|------|-----|
| **Role** | 시스템 관리 전문가 |
| **Scope** | 사용자 관리, 전체 문서 관리, 통계 |
| **Managed Blocks** | `admin.users`, `admin.contents`, `admin.stats` |

---

## Block Responsibilities

### admin.users

| 항목 | 내용 |
|------|------|
| **책임** | 사용자 목록, 역할 변경, 승인/거절 |
| **입력** | `{ action: 'list' \| 'updateRole' \| 'approve', ... }` |
| **출력** | `UserList` 또는 `UpdateResult` |
| **파일** | `AdminDashboard.jsx` |

### admin.contents

| 항목 | 내용 |
|------|------|
| **책임** | 전체 문서 조회, 삭제 |
| **입력** | `{ action: 'list' \| 'delete', docId?: string }` |
| **출력** | `DocList` 또는 `DeleteResult` |
| **파일** | `AdminDashboard.jsx` |

### admin.stats

| 항목 | 내용 |
|------|------|
| **책임** | 통계 집계, 차트 데이터 생성 |
| **입력** | `{ type: 'users' \| 'docs' \| 'learning', period?: string }` |
| **출력** | `{ labels: [], data: [], summary: {} }` |
| **파일** | `AdminDashboard.jsx` |

---

## Dependencies

### Internal

```javascript
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
```

### External

- `chart.js` + `react-chartjs-2`: 통계 차트

### Cross-Domain

- `auth-domain`: Admin 권한 검증
- `content-domain`: 문서 데이터 조회 (읽기 전용)
- `learning-domain`: 학습 통계 조회 (읽기 전용)

---

## Access Control

### 권한 검사

```javascript
// Admin 전용 기능 접근 전 필수 확인
const { user } = useAuth();
if (user?.role !== 'admin') {
  throw new Error('ADMIN_UNAUTHORIZED');
}
```

### RLS 정책 의존

- `users` 테이블: Admin만 전체 조회 가능
- `ojt_docs` 테이블: Admin만 전체 삭제 가능
- `learning_records` 테이블: Admin만 전체 통계 조회 가능

---

## Constraints

### DO

- ✅ 모든 작업 전 Admin 권한 확인
- ✅ 삭제 작업 시 확인 다이얼로그
- ✅ 역할 변경 시 감사 로그 기록
- ✅ 통계 데이터 캐싱 (5분)

### DON'T

- ❌ 자기 자신의 역할 변경
- ❌ 마지막 Admin 삭제/강등
- ❌ 삭제 작업 자동 실행 (확인 필수)
- ❌ 개인정보 과다 노출 (이메일 마스킹)

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN DATA FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USER MANAGEMENT                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ AdminDashboard → supabase.from('users').select()    │    │
│  │     │                                               │    │
│  │     ├──▶ 역할 변경: .update({ role })               │    │
│  │     │                                               │    │
│  │     └──▶ 승인/거절: .update({ status })             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  2. CONTENT MANAGEMENT                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ AdminDashboard → supabase.from('ojt_docs').select() │    │
│  │     │                                               │    │
│  │     └──▶ 삭제: .delete().eq('id', docId)            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  3. STATISTICS                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 사용자 통계: users 테이블 집계                       │    │
│  │ 문서 통계: ojt_docs 테이블 집계                      │    │
│  │ 학습 통계: learning_records 테이블 집계              │    │
│  │     │                                               │    │
│  │     └──▶ Chart.js로 시각화                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Statistics Queries

### 사용자 통계

```javascript
// 역할별 사용자 수
const { data } = await supabase
  .from('users')
  .select('role')
  .then(res => groupBy(res.data, 'role'));
```

### 문서 통계

```javascript
// 팀별 문서 수
const { data } = await supabase
  .from('ojt_docs')
  .select('team, id')
  .then(res => groupBy(res.data, 'team'));
```

### 학습 통계

```javascript
// 일별 학습 완료 수
const { data } = await supabase
  .from('learning_records')
  .select('completed_at')
  .gte('completed_at', startDate)
  .lte('completed_at', endDate);
```

---

## Error Codes

| Code | 의미 | 처리 |
|------|------|------|
| `ADMIN_UNAUTHORIZED` | Admin 권한 없음 | 접근 거부 |
| `ADMIN_SELF_ROLE_CHANGE` | 자기 역할 변경 시도 | 작업 거부 |
| `ADMIN_LAST_ADMIN` | 마지막 Admin 삭제 시도 | 작업 거부 |
| `ADMIN_DELETE_FAILED` | 삭제 실패 | 재시도 안내 |

---

## Testing Guidelines

### Unit Tests

```javascript
describe('admin.users', () => {
  it('should list all users for admin', async () => {});
  it('should reject non-admin access', async () => {});
  it('should prevent self role change', async () => {});
});

describe('admin.contents', () => {
  it('should list all documents', async () => {});
  it('should delete document with confirmation', async () => {});
});

describe('admin.stats', () => {
  it('should return correct user count by role', async () => {});
  it('should cache stats for 5 minutes', async () => {});
});
```

### Mocking Rules

- ✅ `supabase.from('users')` Mock
- ✅ `useAuth()` Mock (admin user 제공)
- ✅ 통계 쿼리 결과 Mock
- ❌ 실제 삭제 테스트는 별도 환경에서

---

## Security Considerations

1. **이중 검증**: 클라이언트 + RLS 정책
2. **감사 로그**: 중요 작업 기록 (admin_logs 테이블)
3. **최소 권한**: 필요한 데이터만 조회
4. **개인정보**: 이메일 부분 마스킹 (`j***@example.com`)

---

## Related Files

### Current Structure

- `src-vite/src/components/AdminDashboard.jsx`

### Future Structure (Vertical Slicing)

```
features/admin/
├── components/
│   ├── AdminDashboard.jsx
│   ├── UserManagement.jsx
│   ├── ContentManagement.jsx
│   └── StatsCharts.jsx
├── hooks/
│   ├── useAdmin.js
│   └── useStats.js
├── services/
│   └── statsService.js
├── index.js
└── AGENT_RULES.md
```
