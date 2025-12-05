// OJT Master v2.7.0 - Split View Layout Component (FR-803)
// 드래그 리사이즈 가능한 분할 레이아웃

import { useState, useCallback, useRef, useEffect } from 'react';

const MIN_PANEL_WIDTH = 200; // 최소 패널 너비 (px)
const DEFAULT_SPLIT_RATIO = 0.5; // 기본 분할 비율

export default function SplitViewLayout({
  leftPanel,
  rightPanel,
  initialRatio = DEFAULT_SPLIT_RATIO,
  minLeftWidth = MIN_PANEL_WIDTH,
  minRightWidth = MIN_PANEL_WIDTH,
  className = '',
}) {
  const containerRef = useRef(null);
  const [splitRatio, setSplitRatio] = useState(initialRatio);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;

      // 비율 계산 (최소 너비 제한 적용)
      const minRatio = minLeftWidth / containerWidth;
      const maxRatio = 1 - minRightWidth / containerWidth;
      const newRatio = Math.max(minRatio, Math.min(maxRatio, mouseX / containerWidth));

      setSplitRatio(newRatio);
    },
    [isDragging, minLeftWidth, minRightWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 글로벌 마우스 이벤트 등록
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 터치 지원
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;

      const touch = e.touches[0];
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const touchX = touch.clientX - containerRect.left;

      const minRatio = minLeftWidth / containerWidth;
      const maxRatio = 1 - minRightWidth / containerWidth;
      const newRatio = Math.max(minRatio, Math.min(maxRatio, touchX / containerWidth));

      setSplitRatio(newRatio);
    },
    [isDragging, minLeftWidth, minRightWidth]
  );

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleTouchMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={`flex h-full ${className}`}>
      {/* Left Panel */}
      <div className="overflow-auto" style={{ width: `${splitRatio * 100}%` }}>
        {leftPanel}
      </div>

      {/* Resizer */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`
          w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize
          flex-shrink-0 relative group transition-colors
          ${isDragging ? 'bg-blue-500' : ''}
        `}
      >
        {/* Drag Handle Visual */}
        <div
          className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-4 h-8 rounded bg-gray-300 group-hover:bg-blue-400
          flex items-center justify-center
          ${isDragging ? 'bg-blue-500' : ''}
        `}
        >
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-gray-500 rounded" />
            <div className="w-0.5 h-4 bg-gray-500 rounded" />
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="overflow-auto" style={{ width: `${(1 - splitRatio) * 100}%` }}>
        {rightPanel}
      </div>
    </div>
  );
}
