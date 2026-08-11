import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Code, Eye, RemoveFormatting } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder = 'Write article content...', className = '' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value);

  // Sync editor content with value prop initially and when switched from source mode
  useEffect(() => {
    if (editorRef.current && !isSourceMode) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isSourceMode]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setSourceValue(html);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (isSourceMode) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const handleInsertImage = () => {
    const url = prompt('Enter Image URL:');
    if (url) {
      executeCommand('insertImage', url);
    }
  };

  const toggleSourceMode = () => {
    if (isSourceMode) {
      // Switching back to rich text
      onChange(sourceValue);
      setIsSourceMode(false);
    } else {
      // Switching to HTML source code mode
      if (editorRef.current) {
        setSourceValue(editorRef.current.innerHTML);
      }
      setIsSourceMode(true);
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSourceValue(val);
    onChange(val);
  };

  return (
    <div className={`border border-[#ecece0] rounded-2xl overflow-hidden bg-white shadow-sm ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-[#fcfaf7] border-b border-[#ecece0] text-stone-700 select-none font-sans">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-2 hover:bg-stone-200/70 rounded-lg transition text-stone-700"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-2 hover:bg-stone-200/70 rounded-lg transition text-stone-700"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-stone-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h2>')}
          className="p-2 hover:bg-stone-200/70 rounded-lg transition text-stone-700"
          title="Heading 2"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h3>')}
          className="p-2 hover:bg-stone-200/70 rounded-lg transition text-stone-700"
          title="Heading 3"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<p>')}
          className="px-2 py-1 text-xs font-semibold hover:bg-stone-200/70 rounded-lg transition text-stone-700"
          title="Paragraph"
        >
          Paragraph
        </button>

        <div className="w-px h-5 bg-stone-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-2 hover:bg-stone-200/70 rounded-lg transition text-stone-700"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          className="p-2 hover:bg-stone-200/70 rounded-lg transition text-stone-700"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-stone-300 mx-1" />

        <button
          type="button"
          onClick={handleInsertLink}
          className="p-2 hover:bg-stone-200/70 rounded-lg transition text-stone-700"
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleInsertImage}
          className="p-2 hover:bg-stone-200/70 rounded-lg transition text-stone-700"
          title="Insert Image URL"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('removeFormat')}
          className="p-2 hover:bg-stone-200/70 rounded-lg transition text-stone-700"
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSourceMode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              isSourceMode ? 'bg-[#5A5A40] text-white' : 'hover:bg-stone-200/70 text-stone-600'
            }`}
            title="Toggle HTML Source"
          >
            {isSourceMode ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
            {isSourceMode ? 'Visual' : 'HTML'}
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      {isSourceMode ? (
        <textarea
          value={sourceValue}
          onChange={handleSourceChange}
          className="w-full h-64 p-4 font-mono text-xs bg-stone-900 text-stone-100 focus:outline-none resize-none"
          placeholder="<h1>HTML Content...</h1>"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          className="min-h-64 p-4 focus:outline-none prose prose-stone max-w-none text-sm text-[#2d2d2a] font-sans"
          data-placeholder={placeholder}
          style={{ minHeight: '16rem' }}
        />
      )}
    </div>
  );
}
