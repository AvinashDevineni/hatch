'use client';

import { useState, useEffect } from 'react';
import { Folder, File, RefreshCw } from 'lucide-react';

interface FileExplorerProps {
  projectId: string;
  onFileSelect: (file: string | null) => void;
  selectedFile: string | null;
}

interface FileInfo {
  path: string;
  size: number;
  modified: number;
}

export function FileExplorer({ projectId, onFileSelect, selectedFile }: FileExplorerProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFiles = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (data.success) {
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    const interval = setInterval(loadFiles, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Folder className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-gray-200">Files</span>
        </div>
        <button
          onClick={loadFiles}
          className="p-1 hover:bg-gray-700 rounded"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {files.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            No files yet
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.path}
                className={`px-3 py-2 rounded cursor-pointer flex items-center space-x-2 ${
                  selectedFile === file.path
                    ? 'bg-gray-700'
                    : 'hover:bg-gray-800'
                }`}
                onClick={() => onFileSelect(file.path)}
              >
                <File className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300 truncate">{file.path}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
