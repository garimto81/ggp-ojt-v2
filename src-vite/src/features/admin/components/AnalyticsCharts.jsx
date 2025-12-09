// OJT Master v2.10.0 - Analytics Charts Component (Issue #54)

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Common chart options
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: { size: 12 },
        usePointStyle: true,
      },
    },
  },
};

/**
 * Learning Activity Chart (Line)
 */
export function ActivityChart({ data, title = '학습 활동 추이' }) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: '총 시도',
        data: data.map((d) => d.total),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
      },
      {
        label: '통과',
        data: data.map((d) => d.passed),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const options = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: title,
        font: { size: 14, weight: 'bold' },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
}

/**
 * Team Stats Chart (Bar)
 */
export function TeamStatsChart({ data }) {
  const chartData = {
    labels: data.map((d) => d.team),
    datasets: [
      {
        label: '문서 수',
        data: data.map((d) => d.docCount),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
      },
      {
        label: '시도 횟수',
        data: data.map((d) => d.totalAttempts),
        backgroundColor: 'rgba(168, 85, 247, 0.7)',
      },
    ],
  };

  const options = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: '팀별 콘텐츠 현황',
        font: { size: 14, weight: 'bold' },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}

/**
 * Pass Rate Doughnut Chart
 */
export function PassRateChart({ passRate, label = '전체 통과율' }) {
  const chartData = {
    labels: ['통과', '실패'],
    datasets: [
      {
        data: [passRate, 100 - passRate],
        backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    ...commonOptions,
    cutout: '60%',
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: label,
        font: { size: 14, weight: 'bold' },
      },
    },
  };

  return (
    <div className="h-48 relative">
      <Doughnut data={chartData} options={options} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-700">{passRate}%</span>
      </div>
    </div>
  );
}

/**
 * Mentor Contribution Chart (Horizontal Bar)
 */
export function MentorContributionChart({ data }) {
  const top5 = data.slice(0, 5);

  const chartData = {
    labels: top5.map((d) => d.name),
    datasets: [
      {
        label: '작성 문서 수',
        data: top5.map((d) => d.docCount),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
      },
    ],
  };

  const options = {
    ...commonOptions,
    indexAxis: 'y',
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: '멘토 기여도 TOP 5',
        font: { size: 14, weight: 'bold' },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}

/**
 * Progress Distribution Chart (Bar)
 */
export function ProgressDistributionChart({ userProgress }) {
  // Group users by progress ranges
  const ranges = [
    { label: '0%', min: 0, max: 0 },
    { label: '1-25%', min: 1, max: 25 },
    { label: '26-50%', min: 26, max: 50 },
    { label: '51-75%', min: 51, max: 75 },
    { label: '76-99%', min: 76, max: 99 },
    { label: '100%', min: 100, max: 100 },
  ];

  const distribution = ranges.map((range) => ({
    label: range.label,
    count: userProgress.filter(
      (u) => u.progressPercent >= range.min && u.progressPercent <= range.max
    ).length,
  }));

  const chartData = {
    labels: distribution.map((d) => d.label),
    datasets: [
      {
        label: '멘티 수',
        data: distribution.map((d) => d.count),
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',
          'rgba(249, 115, 22, 0.7)',
          'rgba(234, 179, 8, 0.7)',
          'rgba(132, 204, 22, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(16, 185, 129, 0.7)',
        ],
      },
    ],
  };

  const options = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: '멘티 진도율 분포',
        font: { size: 14, weight: 'bold' },
      },
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}
