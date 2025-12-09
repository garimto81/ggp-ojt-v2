/**
 * MentorDashboard - Refactored (컴포넌트 조합)
 * @agents content-create-agent, content-manage-agent
 *
 * 분리된 컴포넌트:
 * - ContentInputPanel: 콘텐츠 입력 및 AI 생성 (content-create-agent)
 * - GeneratedDocsPreview: 생성된 문서 미리보기 (content-create-agent)
 * - MyDocsList: 내 문서 목록 (content-manage-agent)
 * - QuizPreviewModal: 퀴즈 검증 모달 (content-manage-agent)
 */

import { useState } from 'react';
import { useDocs } from '@/contexts/DocsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Toast } from '@/contexts/ToastContext';

// Refactored components
import ContentInputPanel from './ContentInputPanel';
import GeneratedDocsPreview from './GeneratedDocsPreview';
import MyDocsList from '@features/content/manage/components/MyDocsList';
import QuizPreviewModal from '@features/content/manage/components/QuizPreviewModal';

export default function MentorDashboard({ aiStatus }) {
  const { saveDocument, loadMyDocs } = useDocs();
  const { user } = useAuth();

  // Generated content
  const [generatedDocs, setGeneratedDocs] = useState([]);

  // Raw input (shared for quiz regeneration)
  const [rawInput, setRawInput] = useState('');

  // Editing
  const [editingDoc, setEditingDoc] = useState(null);

  // Quiz preview
  const [previewingDoc, setPreviewingDoc] = useState(null);

  // Handle documents generated from ContentInputPanel
  const handleDocumentsGenerated = (docs) => {
    setGeneratedDocs(docs);
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
      await loadMyDocs();
    } catch (error) {
      Toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  // Open quiz preview for a generated document
  const handleQuizPreview = (doc, index) => {
    setPreviewingDoc({ ...doc, _index: index });
  };

  // Close quiz preview
  const handleCloseQuizPreview = () => {
    setPreviewingDoc(null);
  };

  // Handle quiz update from modal
  const handleQuizUpdated = (updatedQuiz, docIndex) => {
    setGeneratedDocs((prev) => {
      const updated = [...prev];
      updated[docIndex] = { ...updated[docIndex], quiz: updatedQuiz };
      return updated;
    });

    // Update preview doc
    setPreviewingDoc((prev) =>
      prev ? { ...prev, quiz: updatedQuiz } : null
    );
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Input Panel + Generated Preview */}
      <div className="col-span-2 space-y-4">
        <ContentInputPanel
          aiStatus={aiStatus}
          onDocumentsGenerated={handleDocumentsGenerated}
          rawInput={rawInput}
          setRawInput={setRawInput}
        />

        <GeneratedDocsPreview
          generatedDocs={generatedDocs}
          onSave={handleSave}
          onQuizPreview={handleQuizPreview}
        />
      </div>

      {/* Right: My Documents */}
      <MyDocsList onEdit={setEditingDoc} />

      {/* Quiz Preview Modal */}
      {previewingDoc && (
        <QuizPreviewModal
          previewingDoc={previewingDoc}
          onClose={handleCloseQuizPreview}
          onQuizUpdated={handleQuizUpdated}
          rawInput={rawInput}
        />
      )}
    </div>
  );
}
