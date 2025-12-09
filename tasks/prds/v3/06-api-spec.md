# 06. API Specification

> **Parent**: [Master PRD](./00-master-prd.md) | **Version**: 3.0.0

## 6.1 Supabase Client Setup

```javascript
// utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## 6.2 Auth API

### Sign In with Google

```javascript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

### Sign In with Email

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
```

### Sign Up with Email

```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: { name: 'User Name' },
  },
});
```

### Sign Out

```javascript
const { error } = await supabase.auth.signOut();
```

### Get Session

```javascript
const { data: { session } } = await supabase.auth.getSession();
```

---

## 6.3 Users API

### Get Current User Profile

```javascript
const { data, error } = await supabase
  .from('users')
  .select('id, name, email, role, department, team_id, status')
  .eq('id', session.user.id)
  .single();
```

### Create User Profile (회원가입 후)

```javascript
const { data, error } = await supabase
  .from('users')
  .insert({
    id: session.user.id,
    name: 'User Name',
    email: session.user.email,
    role: 'mentee',  // 기본값
    auth_provider: 'google',
  })
  .select()
  .single();
```

### Update User Profile

```javascript
const { data, error } = await supabase
  .from('users')
  .update({ name: 'New Name', department: 'Engineering' })
  .eq('id', userId)
  .select()
  .single();
```

### Get All Users (Admin Only)

```javascript
const { data, error } = await supabase
  .from('users')
  .select('id, name, email, role, department, status, created_at')
  .order('created_at', { ascending: false });
```

---

## 6.4 Documents API

### List Documents

```javascript
// 전체 문서 (published만)
const { data, error } = await supabase
  .from('ojt_docs')
  .select(`
    id, title, team, step, author_name, estimated_minutes,
    section_count, quiz_count, status, created_at
  `)
  .eq('status', 'published')
  .order('team')
  .order('step');

// 팀별 필터
const { data, error } = await supabase
  .from('ojt_docs')
  .select('*')
  .eq('team', 'Development')
  .eq('status', 'published');

// 내 문서 (Mentor)
const { data, error } = await supabase
  .from('ojt_docs')
  .select('*')
  .eq('author_id', userId)
  .order('created_at', { ascending: false });
```

### Get Document with Sections & Quiz

```javascript
// 문서 상세
const { data: doc, error: docError } = await supabase
  .from('ojt_docs')
  .select('*')
  .eq('id', docId)
  .single();

// 섹션
const { data: sections, error: sectionsError } = await supabase
  .from('doc_sections')
  .select('*')
  .eq('doc_id', docId)
  .order('section_order');

// 퀴즈 (랜덤 4문항)
const { data: quiz, error: quizError } = await supabase
  .from('quiz_pools')
  .select('*')
  .eq('doc_id', docId)
  .limit(4);  // 실제로는 클라이언트에서 셔플
```

### Create Document

```javascript
const { data, error } = await supabase
  .from('ojt_docs')
  .insert({
    title: 'New Document',
    team: 'Development',
    step: 1,
    author_id: userId,
    author_name: userName,
    source_type: 'manual',
    status: 'draft',
  })
  .select()
  .single();
```

### Create Sections

```javascript
const sections = [
  { title: 'Section 1', content: '...', key_points: ['a', 'b'], section_order: 0 },
  { title: 'Section 2', content: '...', key_points: ['c', 'd'], section_order: 1 },
];

const { data, error } = await supabase
  .from('doc_sections')
  .insert(sections.map(s => ({ ...s, doc_id: docId })))
  .select();
```

### Create Quiz Questions

```javascript
const quizQuestions = [
  {
    question: 'What is...?',
    options: ['A', 'B', 'C', 'D'],
    correct_index: 0,
    explanation: 'Because...',
    difficulty: 'medium',
    category: 'comprehension',
  },
  // ...
];

const { data, error } = await supabase
  .from('quiz_pools')
  .insert(quizQuestions.map(q => ({ ...q, doc_id: docId })))
  .select();
```

### Update Document

```javascript
const { data, error } = await supabase
  .from('ojt_docs')
  .update({
    title: 'Updated Title',
    status: 'published',
    updated_at: new Date().toISOString(),
  })
  .eq('id', docId)
  .select()
  .single();
```

### Delete Document (Cascade)

```javascript
// doc_sections, quiz_pools는 ON DELETE CASCADE로 자동 삭제
const { error } = await supabase
  .from('ojt_docs')
  .delete()
  .eq('id', docId);
```

---

## 6.5 Learning API

### Get Learning Progress

```javascript
const { data, error } = await supabase
  .from('learning_progress')
  .select('*')
  .eq('user_id', userId)
  .eq('doc_id', docId)
  .single();
```

### Update Learning Progress

```javascript
const { data, error } = await supabase
  .from('learning_progress')
  .upsert({
    user_id: userId,
    doc_id: docId,
    status: 'in_progress',
    current_section: 2,
    total_time_seconds: 300,
    last_accessed_at: new Date().toISOString(),
  })
  .select()
  .single();
```

### Save Learning Record (퀴즈 완료)

```javascript
const { data, error } = await supabase
  .from('learning_records')
  .upsert({
    user_id: userId,
    doc_id: docId,
    score: 3,
    total_questions: 4,
    passed: true,
    completed_at: new Date().toISOString(),
  })
  .select()
  .single();
```

### Get User's Learning History

```javascript
const { data, error } = await supabase
  .from('learning_records')
  .select(`
    *,
    doc:ojt_docs(id, title, team)
  `)
  .eq('user_id', userId)
  .order('completed_at', { ascending: false });
```

---

## 6.6 Teams API

### List Teams

```javascript
const { data, error } = await supabase
  .from('teams')
  .select('*')
  .eq('is_active', true)
  .order('display_order');
```

### Create Team (Admin)

```javascript
const { data, error } = await supabase
  .from('teams')
  .insert({
    name: 'Engineering',
    slug: 'engineering',
    display_order: 1,
  })
  .select()
  .single();
```

---

## 6.7 Feedback API

### Submit Feedback

```javascript
const { data, error } = await supabase
  .from('doc_feedback')
  .upsert({
    doc_id: docId,
    user_id: userId,
    rating: 5,
    comment: 'Very helpful!',
  })
  .select()
  .single();
```

### Get Document Feedback

```javascript
const { data, error } = await supabase
  .from('doc_feedback')
  .select('rating, comment, created_at')
  .eq('doc_id', docId)
  .order('created_at', { ascending: false });
```

---

## 6.8 Error Handling

```javascript
// API 호출 래퍼
async function apiCall(operation) {
  try {
    const { data, error } = await operation;

    if (error) {
      console.error('API Error:', error);

      // RLS 에러
      if (error.code === '42501') {
        throw new Error('권한이 없습니다.');
      }

      // 중복 에러
      if (error.code === '23505') {
        throw new Error('이미 존재하는 데이터입니다.');
      }

      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    toast.error(err.message);
    throw err;
  }
}

// 사용 예
const users = await apiCall(
  supabase.from('users').select('*')
);
```

---

## Related Documents

- [Database Schema](./04-database/04-01-schema.md)
- [RLS Policies](./04-database/04-02-rls-policies.md)
- [Tech Stack](./05-tech-stack.md)
