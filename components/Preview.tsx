'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

interface PreviewProps {
  projectId: string;
  isGenerating: boolean;
  generationCompleted: boolean;
}

interface ProjectFile {
  path: string;
  size?: number;
  modified?: number;
}

export function Preview({ projectId, isGenerating, generationCompleted }: PreviewProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasIndexFile, setHasIndexFile] = useState(false);
  const [key, setKey] = useState(0);
  const [hasCheckedAfterGeneration, setHasCheckedAfterGeneration] = useState(false);
  const previousGeneratingRef = useRef(isGenerating);

  const checkForIndexFile = useCallback(async () => {
    if (!projectId) return;

    try {
      console.log(`[Preview] Checking for index file in project ${projectId}`);
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      console.log(`[Preview] API response:`, data);

      if (data.success && data.files) {
        const files = data.files as ProjectFile[];
        console.log(`[Preview] Found ${files.length} files:`, files.map((f: ProjectFile) => f.path));

        const hasIndex = files.some((file: ProjectFile) =>
          file.path === 'index.html' || file.path.endsWith('/index.html')
        );

        console.log(`[Preview] Has index.html:`, hasIndex);

        if (hasIndex) {
          setHasIndexFile(true);
          setKey(k => k + 1);
          console.log(`[Preview] ✅ Showing preview for ${projectId}`);
        } else {
          setHasIndexFile(false);
          console.log(`[Preview] ❌ No index.html found`);
        }
      }
    } catch (error) {
      console.error('Error checking for index file:', error);
      setHasIndexFile(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      const url = `/api/projects/${projectId}/preview/index.html`;
      setPreviewUrl(url);
      setHasIndexFile(false);
      setHasCheckedAfterGeneration(false);
      setKey(0);
    } else {
      setPreviewUrl('');
      setHasIndexFile(false);
      setHasCheckedAfterGeneration(false);
      setKey(0);
    }
  }, [projectId]);

  useEffect(() => {
    if (generationCompleted && projectId && !hasCheckedAfterGeneration) {
      void checkForIndexFile();
      setHasCheckedAfterGeneration(true);
    }
  }, [generationCompleted, projectId, hasCheckedAfterGeneration, checkForIndexFile]);

  useEffect(() => {
    if (isGenerating) {
      setHasIndexFile(false);
      setHasCheckedAfterGeneration(false);
    }

    if (previousGeneratingRef.current === true && isGenerating === false && projectId) {
      void checkForIndexFile();
      setHasCheckedAfterGeneration(true);
    }
    previousGeneratingRef.current = isGenerating;
  }, [isGenerating, projectId, checkForIndexFile]);

  const handleRefresh = () => {
    if (isGenerating || !projectId) return;
    setIsLoading(true);
    checkForIndexFile()
      .finally(() => setTimeout(() => setIsLoading(false), 500));
  };

  const handleOpenExternal = () => {
    if (previewUrl && hasIndexFile && !isGenerating) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-gray-200">Preview</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh"
            disabled={isGenerating || !hasIndexFile}
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Open in new tab"
            disabled={!hasIndexFile || isGenerating}
          >
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white">
        {projectId ? (
          isGenerating ? (
            <div className="h-full flex items-center justify-center bg-gray-50 text-gray-600">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="font-medium">Generating your app...</p>
                <p className="text-sm mt-2">Preview will appear when ready</p>
              </div>
            </div>
          ) : hasIndexFile ? (
            <iframe
              key={key}
              id="preview-iframe"
              src={previewUrl ? `${previewUrl}?v=${key}` : ''}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : hasCheckedAfterGeneration ? (
            <div className="h-full flex items-center justify-center bg-gray-50 text-gray-600">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No preview available</p>
                <p className="text-sm mt-2">No index.html was generated</p>
                <p className="text-xs mt-1 text-gray-500">Try asking the AI to create a web page</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 text-gray-600">
              <div className="text-center">
                <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Ready for preview</p>
                <p className="text-sm mt-2">Start a conversation to generate your app</p>
              </div>
            </div>
          )
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
            <div className="text-center">
              <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No preview available</p>
              <p className="text-sm mt-2">Start a project to see the preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
