// OJT Master v2.7.0 - Split View Layout Component
// FR-401: 원문 + 학습콘텐츠 분할 뷰

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Split View 레이아웃 컴포넌트
 * 40:60 비율로 원문과 학습콘텐츠 표시, 비율 조절 가능
 *
 * @param {React.ReactNode} leftPanel - 좌측 패널 (원문)
 * @param {React.ReactNode} rightPanel - 우측 패널 (학습콘텐츠)
 * @param {number} initialRatio - 초기 비율 (0-100, 좌측 %)
 * @param {number} minRatio - 최소 비율
 * @param {number} maxRatio - 최대 비율
 * @param {boolean} showDivider - 구분선 표시 여부
 */
export default function SplitViewLayout({
  leftPanel,
  rightPanel,
  initialRatio = 40,
  minRatio = 20,
  maxRatio = 80,
  showDivider = true,
}) {
  const [ratio, setRatio] = useState(initialRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // 드래그 시작
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // 드래그 중
  const handleDrag = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const newRatio = ((clientX - containerRect.left) / containerRect.width) * 100;

      setRatio(Math.max(minRatio, Math.min(maxRatio, newRatio)));
    },
    [isDragging, minRatio, maxRatio]
  );

  // 드래그 종료
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 전역 이벤트 리스너
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleDrag);
      document.addEventListener('touchend', handleDragEnd);

      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDrag);
        document.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  // 비율 리셋
  const handleReset = () => {
    setRatio(initialRatio);
  };

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full ${isDragging ? 'select-none cursor-col-resize' : ''}`}
    >
      {/* 좌측 패널 (원문) */}
      <div
        className="overflow-auto"
        style={{ width: `${ratio}%`, minWidth: `${minRatio}%`, maxWidth: `${maxRatio}%` }}
      >
        {leftPanel}
      </div>

      {/* 구분선 (드래그 핸들) */}
      {showDivider && (
        <div
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onDoubleClick={handleReset}
          className={`
            w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize
            flex-shrink-0 relative group transition-colors
            ${isDragging ? 'bg-blue-500' : ''}
          `}
          title="드래그하여 크기 조절, 더블클릭으로 초기화"
        >
          {/* 드래그 힌트 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div
              className={`
              w-1 h-8 rounded-full bg-gray-400 group-hover:bg-blue-500
              ${isDragging ? 'bg-blue-600' : ''}
            `}
            />
          </div>
        </div>
      )}

      {/* 우측 패널 (학습콘텐츠) */}
      <div className="flex-1 overflow-auto">{rightPanel}</div>
    </div>
  );
}

/**
 * 반응형 훅: 화면 크기에 따라 모드 결정
 * @returns {{ isMobile: boolean, isTablet: boolean, isDesktop: boolean }}
 */
export function useResponsive() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: windowWidth < 768,
    isTablet: windowWidth >= 768 && windowWidth < 1024,
    isDesktop: windowWidth >= 1024,
  };
}
