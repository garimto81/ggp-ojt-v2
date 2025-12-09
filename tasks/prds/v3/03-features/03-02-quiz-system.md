# 03-02. Quiz System

> **Parent**: [Master PRD](../00-master-prd.md) | **Version**: 3.0.0

## 3.2.1 Overview

퀴즈 시스템은 AI가 생성한 문제를 기반으로 학습자의 이해도를 평가합니다.

### Key Features

| 기능 | 설명 |
|------|------|
| 자동 생성 | 교육 자료 기반 AI 퀴즈 생성 |
| 랜덤 출제 | 문제 풀(10-20문항)에서 랜덤 4문항 |
| 즉시 피드백 | 정답/오답 + 해설 제공 |
| 재시험 | 무제한 재도전 가능 |

---

## 3.2.2 Quiz Structure

### Question Types

| 유형 | 비율 | 설명 | 예시 |
|------|------|------|------|
| **Recall** | 40% | 핵심 용어, 정의 기억 | "OJT의 약자는?" |
| **Comprehension** | 35% | 개념 이해, 관계 파악 | "A와 B의 차이점은?" |
| **Application** | 25% | 실무 상황 적용 | "다음 상황에서 올바른 대응은?" |

### Difficulty Levels

| 난이도 | 비율 | 특징 |
|--------|------|------|
| Easy | 30% | 명시적 정보, 단순 기억 |
| Medium | 50% | 추론 필요, 복합 정보 |
| Hard | 20% | 응용, 비판적 사고 |

---

## 3.2.3 Quiz Flow

```
┌─────────────────────────────────────────────────┐
│  1. 학습 완료                                    │
│     - 모든 섹션 읽음 확인                         │
│     - "퀴즈 시작" 버튼 클릭                       │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  2. 문제 출제                                    │
│     - quiz_pools에서 랜덤 4문항 추출             │
│     - 난이도/유형 균형 고려                       │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  3. 문제 풀이                                    │
│     - 4지선다 선택                               │
│     - 시간 제한 없음 (v3.0)                      │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  4. 결과 확인                                    │
│     - 점수 표시 (n/4)                           │
│     - 통과 여부 (3/4 이상 통과)                  │
│     - 오답 해설                                  │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  5. 기록 저장                                    │
│     - learning_records 저장                     │
│     - learning_progress 업데이트                │
└─────────────────────────────────────────────────┘
```

---

## 3.2.4 Scoring Rules

### Pass Criteria

```javascript
const QUIZ_CONFIG = {
  QUESTIONS_PER_TEST: 4,      // 한 번에 출제되는 문항 수
  PASS_THRESHOLD: 3,          // 통과 기준 (3/4 = 75%)
  TOTAL_POOL: 20,             // 문제 풀 최대 크기
  MIN_POOL: 10,               // 문제 풀 최소 크기
};
```

### Score Calculation

| 점수 | 결과 | 메시지 |
|------|------|--------|
| 4/4 | Perfect | "완벽합니다! 다음 단계로 진행하세요." |
| 3/4 | Pass | "통과! 오답 해설을 확인해보세요." |
| 2/4 | Fail | "아쉽네요. 자료를 다시 읽고 재도전하세요." |
| 0-1/4 | Fail | "좀 더 집중해서 학습해주세요." |

---

## 3.2.5 Retry Logic

### 재시험 규칙

| 규칙 | 내용 |
|------|------|
| 재시험 횟수 | 무제한 |
| 문제 변경 | 재시험 시 새로운 4문항 랜덤 추출 |
| 점수 기록 | 최고 점수만 기록 (`best_score`) |
| 시도 횟수 | 모든 시도 카운트 (`quiz_attempts`) |

### Anti-Cheating

| 방법 | 설명 |
|------|------|
| 랜덤 출제 | 같은 문제 반복 최소화 |
| 보기 셔플 | 정답 위치 랜덤화 (옵션) |
| AI 문제 변형 | 같은 내용 다른 표현 (v3.1 계획) |

---

## 3.2.6 Database Schema

### quiz_pools Table

```sql
CREATE TABLE quiz_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES ojt_docs(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,           -- ["보기1", "보기2", "보기3", "보기4"]
  correct_index INTEGER NOT NULL,   -- 0-3
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT CHECK (category IN ('recall', 'comprehension', 'application')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_correct_index CHECK (correct_index >= 0 AND correct_index <= 3)
);

CREATE INDEX idx_quiz_pools_doc ON quiz_pools(doc_id);
CREATE INDEX idx_quiz_pools_difficulty ON quiz_pools(difficulty);
```

### Quiz Result in learning_records

```sql
-- 기존 learning_records 테이블 활용
-- score: 맞은 개수 (0-4)
-- total_questions: 출제 문항 수 (기본 4)
-- passed: 통과 여부 (score >= 3)
```

---

## 3.2.7 UI Components

### QuizModal

```jsx
<QuizModal
  questions={selectedQuestions}  // 4문항
  onComplete={(result) => {
    // result: { score, answers, passed }
    saveLearningRecord(result);
  }}
  onClose={() => setShowQuiz(false)}
/>
```

### QuizResult

```jsx
<QuizResult
  score={3}
  total={4}
  passed={true}
  wrongAnswers={[
    { question: "...", userAnswer: 1, correctAnswer: 2, explanation: "..." }
  ]}
  onRetry={() => startQuiz()}
  onNext={() => goToNextDoc()}
/>
```

---

## 3.2.8 Future Enhancements (v3.1+)

| 기능 | 설명 |
|------|------|
| 시간 제한 | 문항당 60초 타이머 |
| 힌트 시스템 | 1회 힌트 사용 가능 |
| 오답 노트 | 틀린 문제 모아보기 |
| 적응형 난이도 | 실력에 따른 난이도 조절 |

---

## Related Documents

- [AI Content Generation](./03-01-ai-content.md)
- [Database Schema](../04-database/04-01-schema.md)
- [Dashboard](./03-03-dashboard.md)
