'use client';

import { useState, useEffect, useCallback } from 'react';
import { Folder, File, RefreshCw } from 'lucide-react';

interface FileExplorerProps {
  startupId: string;
  onFileSelect: (file: string | null) => void;
  selectedFile: string | null;
}

interface FileInfo {
  path: string;
  size: number;
  modified: number;
}

export function FileExplorer({ startupId, onFileSelect, selectedFile }: FileExplorerProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!startupId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/startups/${startupId}`);
      const data = await response.json();

      if (data.success) {
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startupId]);

  useEffect(() => {
    void loadFiles();
    const interval = setInterval(() => {
      void loadFiles();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadFiles]);

  return (
    <div className="h-full flex flex-col bg-[#0b1a33]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#142646] border-b border-[#1f3557]">
        <div className="flex items-center space-x-2">
          <Folder className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-[#dbe9ff]">Files</span>
        </div>
        <button
          onClick={loadFiles}
          className="p-1 hover:bg-[#1f3557] rounded"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-[#8ba4c7] ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {files.length === 0 ? (
          <div className="text-center text-[#6f87ab] text-sm py-8">
            No files yet
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.path}
                className={`px-3 py-2 rounded cursor-pointer flex items-center space-x-2 ${
                  selectedFile === file.path
                    ? 'bg-[#1a2f52]'
                    : 'hover:bg-[#142646]'
                }`}
                onClick={() => onFileSelect(file.path)}
              >
                <File className="w-4 h-4 text-[#8ba4c7]" />
                <span className="text-sm text-[#dbe9ff] truncate">{file.path}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
