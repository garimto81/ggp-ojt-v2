# Statistics Export Feature (Phase 6)

## Overview
관리자 대시보드의 통계 탭에서 리포트를 다양한 형식으로 내보낼 수 있는 기능입니다.

## Features

### 지원 형식
- **Excel (.xlsx)**: 멀티 시트 리포트 (전체 통계, 멘티 진도, 취약 파트, 팀별 통계)
- **CSV (.csv)**: 학습 기록 원시 데이터
- **PDF (.pdf)**: 인쇄 가능한 텍스트 기반 리포트

### 내보내기 데이터

#### Excel 리포트 구성
1. **전체 통계 시트**: 시스템 전반 메트릭
   - 총 사용자, 문서, 학습 기록
   - 전체 통과율
   - 멘티 현황 (총/활동/완료)

2. **멘티 진도 시트**: 개별 멘티 진행 상황
   - 이름, 부서
   - 완료/전체 문서 수
   - 진도율, 평균 점수

3. **취약 파트 시트**: 실패율 높은 문서 분석
   - 문서명, 팀
   - 시도 횟수, 실패율
   - 평균 점수

4. **팀별 통계 시트**: 팀 단위 집계
   - 팀별 문서 수
   - 시도 횟수, 평균 점수

#### CSV 리포트
- 학습 기록 플랫 데이터
- 사용자명, 문서명 포함
- 엑셀/구글 시트에서 바로 분석 가능

#### PDF 리포트
- 경영진 보고용
- 주요 지표 + TOP 10 멘티 + TOP 5 취약 파트
- 페이지네이션 자동 처리

## Components

### StatsTab.jsx
통계 탭 메인 컴포넌트. 차트 렌더링 및 내보내기 버튼 통합.

```jsx
<StatsTab
  stats={stats}
  overallStats={overallStats}
  last7Days={last7Days}
  mentorContribution={mentorContribution}
  userProgress={userProgress}
  teamStats={teamStats}
  quizWeakness={quizWeakness}
  allRecords={allRecords}
  allUsers={allUsers}
  allDocs={allDocs}
/>
```

### ExportReportButton.jsx
내보내기 드롭다운 버튼. 3가지 형식 선택 가능.

## Services

### exportUtils.js
내보내기 로직 구현.

```js
import { exportToExcel, exportToCSV, exportToPDF } from '@features/admin/services/exportUtils';

// Excel 내보내기
exportToExcel(data, 'custom_filename'); // ojt_statistics_YYYY-MM-DD.xlsx

// CSV 내보내기
exportToCSV(data, 'learning_data'); // ojt_learning_records_YYYY-MM-DD.csv

// PDF 내보내기
exportToPDF(data); // ojt_statistics_YYYY-MM-DD.pdf
```

## Dependencies

```json
{
  "xlsx": "^0.18.5",         // Excel 생성
  "jspdf": "^2.5.2",         // PDF 생성
  "file-saver": "^2.0.5"     // 파일 다운로드
}
```

## Usage

1. 관리자 대시보드 → 통계 탭 이동
2. 우측 상단 "리포트 내보내기" 버튼 클릭
3. 원하는 형식 선택 (Excel / CSV / PDF)
4. 자동으로 파일 다운로드 (날짜 포함 파일명)

## File Structure

```
src-vite/src/features/admin/
├── components/
│   └── stats/
│       ├── StatsTab.jsx              # 통계 탭 컴포넌트
│       ├── ExportReportButton.jsx    # 내보내기 버튼
│       ├── index.js                  # Barrel export
│       └── README.md                 # 이 파일
└── services/
    ├── exportUtils.js                # 내보내기 로직
    └── exportUtils.test.js           # 유닛 테스트
```

## Testing

```bash
npm run test:run -- src/features/admin/services/exportUtils.test.js
```

## Notes

- 파일명에 자동으로 날짜 포함 (YYYY-MM-DD)
- CSV는 UTF-8 BOM 포함 (한글 깨짐 방지)
- PDF는 긴 데이터 자동 페이지 분할
- 빈 데이터 배열 처리 (시트 생략)
