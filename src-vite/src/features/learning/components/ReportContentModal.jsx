// OJT Master v2.10.0 - Report Content Modal Component

import { useState } from 'react';
import { supabase } from '@utils/api';
import { Toast } from '@contexts/ToastContext';

const REPORT_REASONS = {
  inappropriate: '부적절한 내용',
  outdated: '오래된 정보',
  duplicate: '중복 콘텐츠',
  spam: '스팸/광고',
  other: '기타',
};

export default function ReportContentModal({ isOpen, onClose, docId, docTitle, userId }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason) {
      Toast.warning('신고 사유를 선택해주세요.');
      return;
    }

    if (!description.trim()) {
      Toast.warning('상세 설명을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('content_reports').insert({
        doc_id: docId,
        reporter_id: userId,
        reason,
        description: description.trim(),
      });

      if (error) {
        throw error;
      }

      Toast.success('신고가 접수되었습니다. 관리자가 검토할 예정입니다.');
      handleClose();
    } catch (error) {
      console.error('Failed to submit report:', error);
      Toast.error('신고 접수에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <h2 id="report-modal-title" className="text-xl font-bold text-gray-800">
              콘텐츠 신고
            </h2>
            <p className="text-sm text-gray-500 mt-1">{docTitle}</p>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                신고 사유 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {Object.entries(REPORT_REASONS).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition hover:bg-gray-50"
                    style={{
                      borderColor: reason === value ? '#3b82f6' : '#e5e7eb',
                      backgroundColor: reason === value ? '#eff6ff' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={value}
                      checked={reason === value}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-4 h-4 text-blue-500 focus:ring-2 focus:ring-blue-500"
                      aria-label={label}
                    />
                    <span className="ml-3 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="report-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                상세 설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="신고 사유에 대해 구체적으로 설명해주세요. (최대 500자)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                aria-required="true"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">{description.length} / 500자</p>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <p className="text-xs text-amber-700">
                  허위 신고는 서비스 이용에 제한이 있을 수 있습니다. 신중하게 신고해주세요.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '제출 중...' : '신고하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
