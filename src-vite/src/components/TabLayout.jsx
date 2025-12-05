// OJT Master v2.7.0 - Tab Layout Component
// FR-402: 모바일용 탭 전환 레이아웃

import { useState } from 'react';

/**
 * 탭 레이아웃 컴포넌트
 * 모바일에서 [학습] [원문] 탭 전환
 *
 * @param {React.ReactNode} studyPanel - 학습 콘텐츠 패널
 * @param {React.ReactNode} originalPanel - 원문 패널
 * @param {string} studyLabel - 학습 탭 라벨
 * @param {string} originalLabel - 원문 탭 라벨
 * @param {string} defaultTab - 기본 탭 ('study' | 'original')
 */
export default function TabLayout({
  studyPanel,
  originalPanel,
  studyLabel = '학습',
  originalLabel = '원문',
  defaultTab = 'study',
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="flex flex-col h-full">
      {/* 탭 헤더 */}
      <div className="flex border-b bg-white sticky top-0 z-10">
        <button
          onClick={() => setActiveTab('study')}
          className={`
            flex-1 py-3 px-4 text-sm font-medium text-center transition
            ${
              activeTab === 'study'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          {studyLabel}
        </button>
        <button
          onClick={() => setActiveTab('original')}
          className={`
            flex-1 py-3 px-4 text-sm font-medium text-center transition
            ${
              activeTab === 'original'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          {originalLabel}
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'study' ? studyPanel : originalPanel}
      </div>
    </div>
  );
}

/**
 * 반응형 뷰 컴포넌트
 * Desktop: Split View, Mobile/Tablet: Tab Layout
 *
 * @param {React.ReactNode} leftPanel - 좌측/원문 패널
 * @param {React.ReactNode} rightPanel - 우측/학습 패널
 * @param {boolean} isMobile - 모바일 모드 여부
 */
export function ResponsiveViewLayout({ leftPanel, rightPanel, isMobile }) {
  if (isMobile) {
    return (
      <TabLayout
        studyPanel={rightPanel}
        originalPanel={leftPanel}
        studyLabel="학습"
        originalLabel="원문"
      />
    );
  }

  // Desktop: Split View (lazy import to avoid circular deps)
  return (
    <div className="flex h-full">
      <div className="w-2/5 overflow-auto border-r">{leftPanel}</div>
      <div className="flex-1 overflow-auto">{rightPanel}</div>
    </div>
  );
}
