/**
 * SectionViewer - 섹션 학습 뷰어
 * @agent learning-study-agent
 * @blocks learning.section
 *
 * 학습 완료 판단 (Issue #221):
 * - 퀴즈 있음 → 퀴즈 시작 (QuizSession에서 처리)
 * - 퀴즈 없음 → 열람 완료 버튼 클릭 시 learning_records 저장
 */

import { useState, useCallback } from 'react';

import { sanitizeHtml } from '@/utils/helpers';

import { useLearningRecord } from '@features/learning/quiz/hooks/useLearningRecord';

// iframe 임베딩이 불가능한 도메인 (변환 방법 없음)
const BLOCKED_DOMAINS = ['notion.so', 'notion.site', 'figma.com', 'miro.com'];

/**
 * URL을 iframe 임베딩 가능한 형태로 변환
 * Google Docs/Drive는 /preview 또는 ?embedded=true로 변환하면 iframe 허용
 *
 * @see https://support.google.com/docs/thread/24486495
 * @see https://requestly.com/blog/bypass-iframe-busting-header/
 */
function transformUrlForEmbed(url) {
  if (!url) return url;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    // Google Docs: /edit → /preview
    if (hostname === 'docs.google.com') {
      // /document/d/{ID}/edit → /document/d/{ID}/preview
      if (pathname.includes('/document/d/')) {
        return url.replace(/\/(edit|view)(\?.*)?$/, '/preview');
      }
      // /spreadsheets/d/{ID}/edit → /spreadsheets/d/{ID}/preview
      if (pathname.includes('/spreadsheets/d/')) {
        return url.replace(/\/(edit|view)(\?.*)?$/, '/preview');
      }
      // /presentation/d/{ID}/edit → /presentation/d/{ID}/embed
      if (pathname.includes('/presentation/d/')) {
        return url.replace(/\/(edit|view)(\?.*)?$/, '/embed');
      }
      // /forms/d/{ID}/viewform → 그대로 (이미 embed 가능)
      if (pathname.includes('/forms/')) {
        return url;
      }
    }

    // Google Sheets (sheets.google.com)
    if (hostname === 'sheets.google.com') {
      return url.replace(/\/(edit|view)(\?.*)?$/, '/preview');
    }

    // Google Slides (slides.google.com)
    if (hostname === 'slides.google.com') {
      return url.replace(/\/(edit|view)(\?.*)?$/, '/embed');
    }

    // Google Drive: /view → /preview
    if (hostname === 'drive.google.com') {
      // /file/d/{ID}/view → /file/d/{ID}/preview
      if (pathname.includes('/file/d/')) {
        return url.replace(/\/view(\?.*)?$/, '/preview');
      }
    }

    // 변환 불필요한 URL은 그대로 반환
    return url;
  } catch {
    return url;
  }
}

/**
 * URL이 iframe 임베딩이 완전히 불가능한 도메인인지 확인
 */
function isBlockedDomain(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return BLOCKED_DOMAINS.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
}

export default function SectionViewer({ doc, userId, onStudyComplete, onBackToList }) {
  const [currentSection, setCurrentSection] = useState(0);
  const [studyCompleted, setStudyCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const { saveViewCompletion } = useLearningRecord();

  // iframe 로드 오류 핸들러
  const handleIframeError = useCallback(() => {
    setIframeError(true);
  }, []);

  // 차단된 도메인이면 미리 에러 상태로 설정
  const isBlocked = isBlockedDomain(doc?.source_url);

  // Google Docs/Drive URL을 iframe 임베딩 가능한 형태로 변환
  const embedUrl = transformUrlForEmbed(doc?.source_url);

  const sections = doc?.sections || [];
  const totalSections = sections.length;
  const hasQuiz = doc?.quiz && doc.quiz.length > 0;
  const isAIProcessed = doc?.ai_processed !== false;

  const handlePrevSection = () => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
    }
  };

  const handleNextSection = () => {
    if (currentSection < totalSections - 1) {
      setCurrentSection((prev) => prev + 1);
    } else {
      setStudyCompleted(true);
    }
  };

  const handleStartQuiz = () => {
    if (onStudyComplete) {
      onStudyComplete();
    }
  };

  // 퀴즈 없는 문서 열람 완료 처리
  const handleViewComplete = async () => {
    if (!userId || !doc?.id) return;

    setIsSaving(true);
    try {
      await saveViewCompletion({ userId, docId: doc.id });
      onBackToList();
    } finally {
      setIsSaving(false);
    }
  };

  if (!doc) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">선택된 문서가 없습니다.</p>
        <button
          onClick={onBackToList}
          className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onBackToList} className="text-gray-500 transition hover:text-gray-700">
            ← 목록으로
          </button>
          <span className="text-sm text-gray-500">Step {doc.step || 1}</span>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-800">{doc.title}</h1>

        {doc.estimated_minutes && (
          <p className="text-sm text-gray-500">예상 학습 시간: {doc.estimated_minutes}분</p>
        )}

        {/* 원문 보기 버튼 */}
        {doc.source_url && (
          <a
            href={doc.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-600 transition hover:bg-blue-100"
          >
            <span>{doc.source_type === 'pdf' ? '📄' : '🔗'}</span>
            <span>{doc.source_type === 'pdf' ? 'PDF 원문 보기' : '원문 보기'}</span>
            {doc.source_file && (
              <span
                className="max-w-[150px] truncate text-xs text-blue-400"
                title={doc.source_file}
              >
                ({doc.source_file})
              </span>
            )}
          </a>
        )}

        {/* 로컬 PDF 파일명만 있고 URL이 없는 경우 (레거시 데이터) */}
        {!doc.source_url && doc.source_file && doc.source_type === 'pdf' && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-500">
            <span>📄</span>
            <span>PDF: {doc.source_file}</span>
            <span className="text-xs text-gray-400">(원본 파일 없음)</span>
          </div>
        )}

        {/* Section Progress */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
            <span>
              섹션 {currentSection + 1} / {totalSections}
            </span>
            <span>{Math.round(((currentSection + 1) / totalSections) * 100)}% 완료</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{
                width: `${((currentSection + 1) / totalSections) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Section Content */}
      {sections.length > 0 ? (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-800">
            {sections[currentSection]?.title || `섹션 ${currentSection + 1}`}
          </h2>

          <div
            className="prose prose-blue max-w-none"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(sections[currentSection]?.content || ''),
            }}
          />

          {/* Section Navigation */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <button
              onClick={handlePrevSection}
              disabled={currentSection === 0}
              className="px-4 py-2 text-gray-600 transition hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← 이전 섹션
            </button>

            {studyCompleted ? (
              hasQuiz ? (
                <button
                  onClick={handleStartQuiz}
                  className="rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition hover:bg-green-600"
                >
                  퀴즈 시작하기
                </button>
              ) : (
                <button
                  onClick={handleViewComplete}
                  disabled={isSaving}
                  className="rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
                >
                  {isSaving ? '저장 중...' : '✓ 학습 완료'}
                </button>
              )
            ) : (
              <button
                onClick={handleNextSection}
                className="rounded-lg bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600"
              >
                {currentSection < totalSections - 1 ? '다음 섹션 →' : '학습 완료'}
              </button>
            )}
          </div>
        </div>
      ) : doc.source_type === 'pdf' && doc.source_url ? (
        /* PDF 학습: 원본 PDF 직접 표시 (#211) */
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">📄 원본 PDF</h2>
            <a
              href={doc.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-200"
            >
              📄 새 창에서 열기
            </a>
          </div>

          {/* PDF embed 뷰어 */}
          <div className="overflow-hidden rounded-lg border bg-gray-50">
            <embed src={doc.source_url} type="application/pdf" className="h-[600px] w-full" />
          </div>

          {doc.source_file && (
            <p className="mt-2 text-center text-xs text-gray-400">파일: {doc.source_file}</p>
          )}

          <p className="mt-3 text-center text-sm text-gray-500">
            💡 위 PDF를 학습한 후 퀴즈를 풀어보세요
          </p>

          {/* PDF 학습 완료 버튼 */}
          <div className="mt-6 flex justify-center">
            {hasQuiz ? (
              <button
                onClick={handleStartQuiz}
                className="rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition hover:bg-green-600"
              >
                학습 완료 → 퀴즈 시작하기
              </button>
            ) : (
              <button
                onClick={handleViewComplete}
                disabled={isSaving}
                className="rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '✓ 학습 완료'}
              </button>
            )}
          </div>
        </div>
      ) : doc.source_type === 'url' && doc.source_url ? (
        /* URL 학습: 원본 URL 직접 표시 (#211, #232 iframe fallback) */
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">🔗 원본 웹페이지</h2>
            <a
              href={doc.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-200"
            >
              🔗 새 창에서 열기
            </a>
          </div>

          {/* iframe 차단 또는 로드 실패 시 폴백 UI (#232) */}
          {isBlocked || iframeError ? (
            <div className="rounded-lg border bg-gray-50 p-8 text-center">
              <div className="mb-4 text-6xl">🔒</div>
              <h3 className="mb-2 text-lg font-bold text-gray-800">
                이 페이지는 미리보기가 지원되지 않습니다
              </h3>
              <p className="mb-6 text-gray-600">
                {isBlocked
                  ? '보안 정책으로 인해 외부 사이트 콘텐츠를 여기에 표시할 수 없습니다.'
                  : '페이지 로드 중 오류가 발생했습니다.'}
              </p>
              <a
                href={doc.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition hover:bg-blue-600"
              >
                🔗 새 창에서 학습하기
              </a>
              <p className="mt-4 text-xs text-gray-400">{new URL(doc.source_url).hostname}</p>
            </div>
          ) : (
            /* URL iframe 뷰어 - Google Docs/Drive는 변환된 URL 사용 */
            <div className="overflow-hidden rounded-lg border bg-gray-50">
              <iframe
                src={embedUrl}
                title={doc.title}
                className="h-[600px] w-full border-0"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                onError={handleIframeError}
              />
            </div>
          )}

          <p className="mt-3 text-center text-sm text-gray-500">
            💡 {isBlocked || iframeError ? '새 창에서 학습 후' : '위 콘텐츠를 학습한 후'} 퀴즈를
            풀어보세요
          </p>

          {/* URL 학습 완료 버튼 */}
          <div className="mt-6 flex justify-center">
            {hasQuiz ? (
              <button
                onClick={handleStartQuiz}
                className="rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition hover:bg-green-600"
              >
                학습 완료 → 퀴즈 시작하기
              </button>
            ) : (
              <button
                onClick={handleViewComplete}
                disabled={isSaving}
                className="rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '✓ 학습 완료'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm">
          이 문서에는 학습 섹션이 없습니다.
        </div>
      )}

      {/* AI 미처리 문서 알림 */}
      {!isAIProcessed && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl text-amber-500">⚠️</span>
            <div>
              <h4 className="font-medium text-amber-800">AI 미처리 문서</h4>
              <p className="mt-1 text-sm text-amber-700">
                이 문서는 AI 분석 없이 원문 그대로 등록되었습니다. 퀴즈가 제공되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Quiz Button */}
      {studyCompleted && hasQuiz && (
        <div className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-center text-white">
          <h3 className="mb-2 text-lg font-bold">학습 완료!</h3>
          <p className="mb-4 opacity-90">이제 퀴즈를 풀어 학습 내용을 확인해보세요.</p>
          <button
            onClick={handleStartQuiz}
            className="rounded-lg bg-white px-6 py-3 font-medium text-blue-600 transition hover:bg-gray-100"
          >
            퀴즈 시작하기
          </button>
        </div>
      )}

      {/* Study Complete without Quiz */}
      {studyCompleted && !hasQuiz && (
        <div className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center text-white">
          <h3 className="mb-2 text-lg font-bold">학습 완료!</h3>
          <p className="mb-4 opacity-90">아래 버튼을 눌러 학습을 완료하세요.</p>
          <button
            onClick={handleViewComplete}
            disabled={isSaving}
            className="rounded-lg bg-white px-6 py-3 font-medium text-green-600 transition hover:bg-gray-100 disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '✓ 학습 완료 저장'}
          </button>
        </div>
      )}
    </div>
  );
}
