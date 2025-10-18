'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code } from 'lucide-react';

interface CodeEditorProps {
  projectId: string;
  selectedFile: string | null;
}

export function CodeEditor({ projectId, selectedFile }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectId || !selectedFile) {
      setContent('');
      return;
    }

    const loadFile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/files/${selectedFile}`);
        const data = await response.json();

        if (data.success) {
          setContent(data.content || '');
        }
      } catch (error) {
        console.error('Error loading file:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [projectId, selectedFile]);

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
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-200">
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
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  );
}
