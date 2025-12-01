// OJT Master v2.3.0 - Mentor Dashboard Component

import { useState } from 'react';
import { useDocs } from '../contexts/DocsContext';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../contexts/ToastContext';
import { generateOJTContent } from '../utils/api';
import {
  estimateReadingTime,
  calculateRequiredSteps,
  splitContentForSteps,
  confirmDeleteWithCSRF,
  formatDate,
} from '../utils/helpers';

export default function MentorDashboard({ aiStatus }) {
  const { myDocs, saveDocument, deleteDocument, loadMyDocs } = useDocs();
  const { user } = useAuth();

  // Input states
  const [inputType, setInputType] = useState('text');
  const [rawInput, setRawInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [autoSplit, setAutoSplit] = useState(true);

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Generated content
  const [generatedDocs, setGeneratedDocs] = useState([]);

  // Editing
  const [editingDoc, setEditingDoc] = useState(null);

  // Derived values
  const estimatedTime = rawInput ? estimateReadingTime(rawInput) : 0;
  const requiredSteps = rawInput ? calculateRequiredSteps(rawInput) : 1;

  // Handle content generation
  const handleGenerate = async () => {
    if (!rawInput.trim()) {
      Toast.warning('텍스트를 입력해주세요.');
      return;
    }

    if (!aiStatus.online) {
      Toast.error('Gemini AI 서비스에 연결할 수 없습니다.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('콘텐츠 분석 중...');

    try {
      const numSteps = autoSplit ? requiredSteps : 1;
      const segments = splitContentForSteps(rawInput, numSteps);
      const docs = [];

      // Generate content for each step (in parallel if multiple)
      if (numSteps > 1) {
        const promises = segments.map((segment, i) =>
          generateOJTContent(segment, inputTitle || '새 OJT 문서', i + 1, numSteps, (status) =>
            setProcessingStatus(`Step ${i + 1}: ${status}`)
          )
        );
        const results = await Promise.all(promises);
        docs.push(...results.map((r, i) => ({ ...r, step: i + 1 })));
      } else {
        const result = await generateOJTContent(
          rawInput,
          inputTitle || '새 OJT 문서',
          1,
          1,
          setProcessingStatus
        );
        docs.push({ ...result, step: 1 });
      }

      setGeneratedDocs(docs);
      Toast.success(`${docs.length}개 문서가 생성되었습니다.`);
    } catch (error) {
      Toast.error(`오류: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      for (const doc of generatedDocs) {
        await saveDocument({
          ...doc,
          author_id: user.id,
          author_name: user.name,
        });
      }

      Toast.success(`${generatedDocs.length}개 문서가 저장되었습니다.`);
      setGeneratedDocs([]);
      setRawInput('');
      setInputTitle('');
      await loadMyDocs();
    } catch (error) {
      Toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  // Handle delete
  const handleDelete = async (docId) => {
    const doc = myDocs.find((d) => d.id === docId);
    if (!doc) return;

    if (!confirmDeleteWithCSRF(doc.title)) {
      return;
    }

    try {
      await deleteDocument(docId);
      Toast.success('문서가 삭제되었습니다.');
    } catch (error) {
      Toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Input Panel */}
      <div className="col-span-2 space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">콘텐츠 입력</h2>

          {/* Input Type Selector */}
          <div className="flex gap-2 mb-4">
            {['text', 'url', 'pdf'].map((type) => (
              <button
                key={type}
                onClick={() => setInputType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  inputType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === 'text' && '텍스트'}
                {type === 'url' && 'URL'}
                {type === 'pdf' && 'PDF'}
              </button>
            ))}
          </div>

          {/* Title Input */}
          <input
            type="text"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            placeholder="문서 제목"
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />

          {/* Content Input */}
          {inputType === 'text' && (
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="교육 콘텐츠를 입력하세요..."
              className="w-full h-64 px-4 py-3 border rounded-lg resize-none"
            />
          )}

          {inputType === 'url' && (
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-4 py-2 border rounded-lg"
            />
          )}

          {inputType === 'pdf' && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-gray-500">
              PDF 업로드 (구현 예정)
            </div>
          )}

          {/* Stats */}
          {rawInput && (
            <div className="mt-4 flex gap-4 text-sm text-gray-500">
              <span>예상 학습 시간: {estimatedTime}분</span>
              <span>권장 스텝 수: {requiredSteps}</span>
            </div>
          )}

          {/* Auto Split Toggle */}
          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={autoSplit}
              onChange={(e) => setAutoSplit(e.target.checked)}
              disabled={editingDoc !== null}
            />
            <span className="text-sm text-gray-600">자동 스텝 분할 ({requiredSteps}개)</span>
          </label>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isProcessing || !aiStatus.online}
            className="w-full mt-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isProcessing ? processingStatus : 'AI로 교육 자료 생성'}
          </button>
        </div>

        {/* Generated Content Preview */}
        {generatedDocs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">생성된 문서 ({generatedDocs.length}개)</h3>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                저장
              </button>
            </div>
            <div className="space-y-4">
              {generatedDocs.map((doc, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <h4 className="font-medium">{doc.title}</h4>
                  <p className="text-sm text-gray-500">
                    {doc.sections?.length || 0}개 섹션, {doc.quiz?.length || 0}개 퀴즈
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: My Documents */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">내 문서</h2>
        <div className="space-y-3">
          {myDocs.length === 0 ? (
            <p className="text-gray-500 text-sm">아직 작성한 문서가 없습니다.</p>
          ) : (
            myDocs.map((doc) => (
              <div key={doc.id} className="p-3 border rounded-lg hover:bg-gray-50">
                <h4 className="font-medium text-sm">{doc.title}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {doc.team} · {formatDate(doc.created_at)}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setEditingDoc(doc)}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
