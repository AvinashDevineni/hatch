'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code } from 'lucide-react';

interface CodeEditorProps {
  startupId: string;
  selectedFile: string | null;
}

export function CodeEditor({ startupId, selectedFile }: CodeEditorProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!startupId || !selectedFile) {
      setContent('');
      return;
    }

    const loadFile = async () => {
      try {
        const response = await fetch(`/api/startups/${startupId}/files/${selectedFile}`);
        const data = await response.json();

        if (data.success) {
          setContent(data.content || '');
        }
      } catch (error) {
        console.error('Error loading file:', error);
    };

    loadFile();
  }, [startupId, selectedFile]);

  const getLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      html: 'html',
      css: 'css',
      json: 'json',
      py: 'python',
      md: 'markdown'
    };
    return langMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="h-full flex flex-col bg-[#0b1a33]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#142646] border-b border-[#1f3557]">
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-[#dbe9ff]">
            {selectedFile || 'No file selected'}
          </span>
        </div>
      </div>

      <div className="flex-1">
        {selectedFile ? (
          <Editor
            height="100%"
            language={getLanguage(selectedFile)}
            value={content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-[#6f87ab]">
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  );
}
