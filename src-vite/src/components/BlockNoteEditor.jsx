// OJT Master v3.0 - BlockNote Editor Component
// Notion-style block editor with R2 image upload

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCallback, useEffect } from 'react';
import { uploadImageToR2 } from '../utils/api';
import { Toast } from '../contexts/ToastContext';

/**
 * BlockNote Editor Component
 * @param {Object} props
 * @param {string} props.initialContent - Initial content (markdown or HTML)
 * @param {Function} props.onChange - Callback when content changes (receives markdown)
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.readOnly - Read-only mode
 */
export default function BlockNoteEditor({
  initialContent = '',
  onChange,
  placeholder = '콘텐츠를 입력하세요...',
  readOnly = false,
}) {
  // Handle file upload to R2
  const handleUpload = useCallback(async (file) => {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        Toast.error('허용되지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 가능)');
        return null;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        Toast.error('파일 크기가 10MB를 초과합니다.');
        return null;
      }

      Toast.info('이미지 업로드 중...');
      const url = await uploadImageToR2(file);
      Toast.success('이미지가 업로드되었습니다.');
      return url;
    } catch (error) {
      console.error('Image upload failed:', error);
      Toast.error(`이미지 업로드 실패: ${error.message}`);
      return null;
    }
  }, []);

  // Create BlockNote editor instance
  const editor = useCreateBlockNote({
    uploadFile: handleUpload,
    domAttributes: {
      editor: {
        class: 'blocknote-editor',
      },
    },
  });

  // Initialize content when provided
  useEffect(() => {
    if (initialContent && editor) {
      // Parse markdown to blocks
      const parseContent = async () => {
        try {
          const blocks = await editor.tryParseMarkdownToBlocks(initialContent);
          editor.replaceBlocks(editor.document, blocks);
        } catch (error) {
          console.warn('Failed to parse initial content:', error);
        }
      };
      parseContent();
    }
  }, [initialContent, editor]);

  // Handle content change
  const handleChange = useCallback(async () => {
    if (onChange && editor) {
      try {
        const markdown = await editor.blocksToMarkdownLossy(editor.document);
        onChange(markdown);
      } catch (error) {
        console.error('Failed to convert to markdown:', error);
      }
    }
  }, [onChange, editor]);

  return (
    <div className="blocknote-wrapper border rounded-lg overflow-hidden bg-white">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
        editable={!readOnly}
        data-placeholder={placeholder}
      />
      <style>{`
        .blocknote-wrapper {
          min-height: 300px;
        }
        .blocknote-editor {
          padding: 16px;
        }
        .blocknote-editor [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        /* Image block styling */
        .blocknote-wrapper img {
          max-width: 100%;
          border-radius: 8px;
          margin: 8px 0;
        }
        /* Toolbar styling */
        .bn-toolbar {
          border-bottom: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  );
}

/**
 * Extract plain text from editor blocks (for AI processing)
 * @param {Object} editor - BlockNote editor instance
 * @returns {Promise<string>} - Plain text content
 */
export async function extractPlainText(editor) {
  if (!editor) return '';

  try {
    const blocks = editor.document;
    let text = '';

    for (const block of blocks) {
      if (block.type === 'paragraph' || block.type === 'heading') {
        const content = block.content?.map(c => c.text || '').join('') || '';
        text += content + '\n\n';
      } else if (block.type === 'bulletListItem' || block.type === 'numberedListItem') {
        const content = block.content?.map(c => c.text || '').join('') || '';
        text += '- ' + content + '\n';
      }
    }

    return text.trim();
  } catch (error) {
    console.error('Failed to extract plain text:', error);
    return '';
  }
}
