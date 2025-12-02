# Lightweight Charting Libraries for React Admin Dashboard (CDN-based)

**Project Context**: React 18 via CDN (단일 HTML 파일 SPA)
**Use Cases**: 사용자 가입 추이, 콘텐츠 생성 통계, 퀴즈 통과율
**Required Charts**: Line (추이), Bar (비교), Donut (비율)

---

## 1. Chart.js + react-chartjs-2 ⭐ **추천 1순위**

### Bundle Size
- **Chart.js**: ~60KB (가장 가벼움)
- **Canvas 기반**: 모바일 성능 우수, 애니메이션 부드러움

### CDN URLs
```html
<!-- Chart.js Core -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

<!-- React-chartjs-2 (React Wrapper) -->
<script src="https://cdn.jsdelivr.net/npm/react-chartjs-2@5.2.0/dist/index.umd.min.js"></script>
```

### Minimal Code Example
```html
<!DOCTYPE html>
<html>
<head>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { Line, Bar, Doughnut } = window['react-chartjs-2'];

    function AdminDashboard() {
      // Line Chart: 사용자 가입 추이
      const signupData = {
        labels: ['1월', '2월', '3월', '4월', '5월'],
        datasets: [{
          label: '신규 가입자',
          data: [12, 19, 15, 25, 22],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4
        }]
      };

      // Bar Chart: 팀별 콘텐츠 생성 수
      const contentData = {
        labels: ['개발팀', '디자인팀', 'QA팀', '기획팀'],
        datasets: [{
          label: '생성된 문서',
          data: [45, 32, 28, 51],
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)'
          ]
        }]
      };

      // Donut Chart: 퀴즈 통과율
      const quizData = {
        labels: ['통과', '실패'],
        datasets: [{
          data: [78, 22],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0
        }]
      };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        }
      };

      return (
        <div style={{ padding: '20px' }}>
          <h2>관리자 대시보드</h2>

          <div style={{ height: '300px', marginBottom: '40px' }}>
            <h3>사용자 가입 추이</h3>
            <Line data={signupData} options={options} />
          </div>

          <div style={{ height: '300px', marginBottom: '40px' }}>
            <h3>팀별 콘텐츠 생성</h3>
            <Bar data={contentData} options={options} />
          </div>

          <div style={{ height: '300px' }}>
            <h3>퀴즈 통과율</h3>
            <Doughnut data={quizData} options={options} />
          </div>
        </div>
      );
    }

    ReactDOM.render(<AdminDashboard />, document.getElementById('root'));
  </script>
</body>
</html>
```

### Real-time Data Update
```javascript
// State로 데이터 관리 시 자동 업데이트
const [chartData, setChartData] = React.useState(initialData);

// Supabase에서 실시간 업데이트
React.useEffect(() => {
  const subscription = supabase
    .channel('learning_records')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'learning_records' },
      payload => {
        // 차트 데이터 업데이트
        setChartData(prev => updateChartData(prev, payload.new));
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

### Pros
- ✅ **가장 가벼움** (60KB) - 빠른 로딩
- ✅ **Canvas 기반** - 모바일 성능 우수
- ✅ **CDN 완벽 지원** - npm 없이 사용 가능
- ✅ **React 18 호환** - react-chartjs-2로 간편 통합
- ✅ **간단한 API** - 학습 곡선 낮음
- ✅ **실시간 업데이트** - State 변경 시 자동 리렌더링

### Cons
- ❌ 고급 차트 타입 제한적 (기본 차트만 제공)
- ❌ SVG 대비 스타일링 유연성 낮음

### 권장 사용 케이스
- ✅ **OJT Master Admin Dashboard** - 완벽히 적합
- ✅ 빠른 로딩이 중요한 경우
- ✅ 모바일 접근성이 높은 프로젝트

---

## 2. ApexCharts ⭐ **고급 기능 필요 시**

### Bundle Size
- **ApexCharts**: ~501KB minified / ~131KB gzipped
- **SVG 기반**: 확대/축소 품질 유지

### CDN URLs
```html
<script src="https://cdn.jsdelivr.net/npm/apexcharts@3.47.0/dist/apexcharts.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-apexcharts@1.4.1/dist/react-apexcharts.iife.min.js"></script>
```

### Minimal Code Example
```html
<script type="text/babel">
  // ApexCharts는 React Wrapper 없이 vanilla로 사용 권장 (CDN 호환성)
  function AdminDashboard() {
    const chartRef = React.useRef(null);

    React.useEffect(() => {
      const options = {
        chart: {
          type: 'line',
          height: 300,
          animations: { enabled: true }
        },
        series: [{
          name: '가입자',
          data: [12, 19, 15, 25, 22]
        }],
        xaxis: {
          categories: ['1월', '2월', '3월', '4월', '5월']
        }
      };

      const chart = new ApexCharts(chartRef.current, options);
      chart.render();

      return () => chart.destroy();
    }, []);

    return <div ref={chartRef}></div>;
  }
</script>
```

### Real-time Update
```javascript
// ApexCharts.updateSeries() 메서드 사용
chart.updateSeries([{
  name: '가입자',
  data: newData
}]);
```

### Pros
- ✅ **풍부한 차트 타입** (40+) - 히트맵, 트리맵 등 고급 차트
- ✅ **내장 애니메이션** - 부드러운 전환 효과
- ✅ **실시간 업데이트** 최적화
- ✅ **SVG 기반** - 확대 시 품질 유지

### Cons
- ❌ **무거움** (131KB gzipped) - Chart.js의 2배 이상
- ❌ **React Wrapper CDN 지원 약함** - vanilla JS 사용 권장
- ❌ 학습 곡선 높음

### 권장 사용 케이스
- ✅ 히트맵, 캔들스틱 등 고급 차트 필요 시
- ❌ 단순 Line/Bar/Donut만 필요한 경우 오버스펙

---

## 3. Recharts ⚠️ **CDN 사용 어려움**

### Bundle Size
- **Recharts**: ~중간 크기 (D3 의존성)
- **SVG 기반**: React 친화적

### CDN URLs
```html
<!-- CDN 사용 가능하지만 복잡함 -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/recharts@3.5.1/dist/Recharts.min.js"></script>
```

### CDN 호환성 문제
- ⚠️ **UMD 빌드 제공하지만 D3 의존성 복잡**
- ⚠️ **npm/webpack 환경 최적화됨**
- ⚠️ 단일 HTML 파일에서 사용 시 많은 수동 설정 필요

### Pros (npm 환경)
- ✅ React 친화적 API (JSX 컴포넌트)
- ✅ 깔끔한 SVG 렌더링
- ✅ React 18 완전 호환 (v3.x)

### Cons (CDN 환경)
- ❌ **CDN 사용 복잡** - 의존성 수동 관리 필요
- ❌ D3 번들 크기 추가
- ❌ **단일 HTML 파일에 부적합**

### 권장 사용 케이스
- ❌ **OJT Master에 비추천** - CDN 사용 어려움
- ✅ Create React App 등 빌드 환경에서만 권장

---

## 4. Plotly.js ⚠️ **과도한 기능**

### Bundle Size
- **Plotly.js**: ~3MB+ (Full), ~1MB (Basic)
- **WebGL/Canvas 혼합**

### CDN URLs
```html
<!-- Full 버전 (과도) -->
<script src="https://cdn.plot.ly/plotly-3.3.0.min.js"></script>

<!-- Basic 버전 (권장) -->
<script src="https://cdn.plot.ly/plotly-basic-3.3.0.min.js"></script>

<!-- React Wrapper -->
<script src="https://unpkg.com/react-plotly.js@latest/dist/create-plotly-component.js"></script>
```

### Minimal Code Example
```javascript
const Plot = createPlotlyComponent(Plotly);

function AdminDashboard() {
  return (
    <Plot
      data={[{
        x: ['1월', '2월', '3월'],
        y: [12, 19, 15],
        type: 'scatter',
        mode: 'lines+markers'
      }]}
      layout={{ width: 600, height: 400 }}
    />
  );
}
```

### Pros
- ✅ 과학적/통계적 차트 강력
- ✅ 3D 차트, 지도 지원

### Cons
- ❌ **매우 무거움** (기본 버전도 1MB+)
- ❌ **오버스펙** - 간단한 대시보드에 부적합
- ❌ CDN 로딩 시간 길음

### 권장 사용 케이스
- ❌ **OJT Master에 비추천** - 크기 대비 효용 낮음
- ✅ 과학 데이터 시각화, 3D 차트 필요 시만 사용

---

## 5. TradingView Lightweight Charts 📉 **금융 차트 전용**

### Bundle Size
- **Lightweight Charts**: ~45KB (매우 가벼움)

### CDN URLs
```html
<script src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>
```

### Pros
- ✅ **초경량** (45KB)
- ✅ 금융 차트 특화 (캔들스틱, 시계열)

### Cons
- ❌ **범용 차트 부족** - Bar, Donut 등 기본 차트 없음
- ❌ 금융 데이터에만 적합

### 권장 사용 케이스
- ❌ **OJT Master에 부적합** - 금융 차트만 지원
- ✅ 주식, 가격 추이 등 금융 데이터 전용

---

## 최종 추천

### 🏆 1순위: Chart.js + react-chartjs-2

**이유:**
1. ✅ **가장 가벼움** (60KB) - 웹 배포 최적화
2. ✅ **CDN 완벽 지원** - 단일 HTML 파일에 이상적
3. ✅ **필요한 차트 완벽 지원** (Line, Bar, Donut)
4. ✅ **React 18 호환** - State 기반 실시간 업데이트
5. ✅ **모바일 성능** - Canvas 렌더링으로 부드러움
6. ✅ **간단한 API** - 빠른 개발 가능

### 🥈 2순위: ApexCharts (고급 기능 필요 시)

**조건부 추천:**
- ✅ 히트맵, 혼합 차트 등 고급 기능 필요 시
- ⚠️ 크기 증가 (131KB) 감수 가능한 경우
- ⚠️ React Wrapper 대신 vanilla JS 사용 필요

### ❌ 비추천

| 라이브러리 | 비추천 이유 |
|------------|------------|
| Recharts | CDN 사용 복잡, D3 의존성 관리 어려움 |
| Plotly.js | 오버스펙, 무거움 (1MB+) |
| Lightweight Charts | 범용 차트 부족 (금융 전용) |

---

## 구현 가이드 (Chart.js)

### index.html에 통합

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>OJT Master - Admin Dashboard</title>

  <!-- Existing CDNs -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

  <!-- Babel for JSX -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- Supabase -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect } = React;

    // Chart.js 컴포넌트 생성
    function ChartComponent({ type, data, options }) {
      const canvasRef = React.useRef(null);
      const chartRef = React.useRef(null);

      useEffect(() => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');

          // 기존 차트 파괴
          if (chartRef.current) {
            chartRef.current.destroy();
          }

          // 새 차트 생성
          chartRef.current = new Chart(ctx, {
            type: type,
            data: data,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              ...options
            }
          });
        }

        return () => {
          if (chartRef.current) {
            chartRef.current.destroy();
          }
        };
      }, [type, data, options]);

      return <canvas ref={canvasRef}></canvas>;
    }

    // Admin Dashboard
    function AdminDashboard() {
      const [stats, setStats] = useState({
        signups: [],
        contentByTeam: [],
        quizPassRate: { passed: 0, failed: 0 }
      });

      useEffect(() => {
        loadStats();

        // Supabase 실시간 구독
        const subscription = supabase
          .channel('admin-stats')
          .on('postgres_changes',
            { event: '*', schema: 'public' },
            () => loadStats() // 변경 시 재로드
          )
          .subscribe();

        return () => subscription.unsubscribe();
      }, []);

      async function loadStats() {
        // 1. 월별 가입자 추이
        const { data: users } = await supabase
          .from('users')
          .select('created_at')
          .order('created_at');

        const monthlySignups = processMonthlyData(users);

        // 2. 팀별 콘텐츠 생성 수
        const { data: docs } = await supabase
          .from('ojt_docs')
          .select('team');

        const contentByTeam = processTeamData(docs);

        // 3. 퀴즈 통과율
        const { data: records } = await supabase
          .from('learning_records')
          .select('passed');

        const passRate = processPassRate(records);

        setStats({
          signups: monthlySignups,
          contentByTeam: contentByTeam,
          quizPassRate: passRate
        });
      }

      return (
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-8">관리자 대시보드</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 사용자 가입 추이 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">월별 가입자 추이</h2>
              <div style={{ height: '300px' }}>
                <ChartComponent
                  type="line"
                  data={{
                    labels: stats.signups.map(s => s.month),
                    datasets: [{
                      label: '신규 가입자',
                      data: stats.signups.map(s => s.count),
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4,
                      fill: true
                    }]
                  }}
                />
              </div>
            </div>

            {/* 팀별 콘텐츠 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">팀별 콘텐츠 생성</h2>
              <div style={{ height: '300px' }}>
                <ChartComponent
                  type="bar"
                  data={{
                    labels: stats.contentByTeam.map(c => c.team),
                    datasets: [{
                      label: '생성된 문서',
                      data: stats.contentByTeam.map(c => c.count),
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(34, 197, 94, 0.7)',
                        'rgba(251, 191, 36, 0.7)'
                      ]
                    }]
                  }}
                />
              </div>
            </div>

            {/* 퀴즈 통과율 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">퀴즈 통과율</h2>
              <div style={{ height: '300px' }}>
                <ChartComponent
                  type="doughnut"
                  data={{
                    labels: ['통과', '실패'],
                    datasets: [{
                      data: [
                        stats.quizPassRate.passed,
                        stats.quizPassRate.failed
                      ],
                      backgroundColor: ['#10b981', '#ef4444'],
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Helper functions
    function processMonthlyData(users) {
      // 월별 집계 로직
      const monthly = {};
      users.forEach(u => {
        const month = new Date(u.created_at).toLocaleDateString('ko-KR', { month: 'short' });
        monthly[month] = (monthly[month] || 0) + 1;
      });
      return Object.entries(monthly).map(([month, count]) => ({ month, count }));
    }

    function processTeamData(docs) {
      // 팀별 집계
      const teams = {};
      docs.forEach(d => {
        teams[d.team] = (teams[d.team] || 0) + 1;
      });
      return Object.entries(teams).map(([team, count]) => ({ team, count }));
    }

    function processPassRate(records) {
      const passed = records.filter(r => r.passed).length;
      const failed = records.length - passed;
      return { passed, failed };
    }

    ReactDOM.render(<AdminDashboard />, document.getElementById('root'));
  </script>
</body>
</html>
```

---

## 성능 최적화 팁

### 1. Chart.js 최적화
```javascript
// 불필요한 애니메이션 비활성화 (대용량 데이터)
options: {
  animation: {
    duration: 0 // 즉시 렌더링
  },
  plugins: {
    legend: {
      display: false // 범례 숨김으로 렌더링 속도 향상
    }
  }
}
```

### 2. 실시간 업데이트 디바운싱
```javascript
// 과도한 리렌더링 방지
const [chartData, setChartData] = useState(initialData);
const timeoutRef = useRef(null);

function updateChartData(newData) {
  clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => {
    setChartData(newData);
  }, 500); // 500ms 디바운스
}
```

### 3. 조건부 렌더링
```javascript
// 데이터 없을 때 차트 숨김
{stats.signups.length > 0 && (
  <ChartComponent type="line" data={signupData} />
)}
```

---

## 결론

**OJT Master Admin Dashboard**에는 **Chart.js**가 최적의 선택입니다:

1. ✅ 가벼운 번들 크기 (60KB) → Vercel 배포 최적화
2. ✅ CDN 완벽 지원 → 단일 HTML 파일 구조에 적합
3. ✅ 필요한 모든 차트 타입 제공 (Line, Bar, Donut)
4. ✅ Supabase 실시간 구독과 호환
5. ✅ 간단한 API → 빠른 개발

**다음 단계:**
1. `index.html`에 Chart.js CDN 추가
2. AdminDashboard 컴포넌트 구현
3. Supabase 통계 쿼리 작성
4. 역할 기반 접근 제어 (`role === 'Admin'`)
