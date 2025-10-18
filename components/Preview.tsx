'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

interface PreviewProps {
  startupId: string;
  isGenerating: boolean;
  generationCompleted: boolean;
}

interface StartupFile {
  path: string;
  size?: number;
  modified?: number;
}

export function Preview({ startupId, isGenerating, generationCompleted }: PreviewProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasIndexFile, setHasIndexFile] = useState(false);
  const [key, setKey] = useState(0);
  const [hasCheckedAfterGeneration, setHasCheckedAfterGeneration] = useState(false);
  const previousGeneratingRef = useRef(isGenerating);

  const checkForIndexFile = useCallback(async () => {
    if (!startupId) return;

    try {
      console.log(`[Preview] Checking for index file in startup ${startupId}`);
      const response = await fetch(`/api/startups/${startupId}`);
      const data = await response.json();

      console.log(`[Preview] API response:`, data);

      if (data.success && data.files) {
        const files = data.files as StartupFile[];
        console.log(`[Preview] Found ${files.length} files:`, files.map((f: StartupFile) => f.path));

        const hasIndex = files.some((file: StartupFile) =>
          file.path === 'index.html' || file.path.endsWith('/index.html')
        );

        console.log(`[Preview] Has index.html:`, hasIndex);

        if (hasIndex) {
          setHasIndexFile(true);
          setKey(k => k + 1);
          console.log(`[Preview] ✅ Showing preview for ${startupId}`);
        } else {
          setHasIndexFile(false);
          console.log(`[Preview] ❌ No index.html found`);
        }
      }
    } catch (error) {
      console.error('Error checking for index file:', error);
      setHasIndexFile(false);
    }
  }, [startupId]);

  useEffect(() => {
    if (startupId) {
      const url = `/api/startups/${startupId}/preview/index.html`;
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
  }, [startupId]);

  useEffect(() => {
    if (generationCompleted && startupId && !hasCheckedAfterGeneration) {
      void checkForIndexFile();
      setHasCheckedAfterGeneration(true);
    }
  }, [generationCompleted, startupId, hasCheckedAfterGeneration, checkForIndexFile]);

  useEffect(() => {
    if (isGenerating) {
      setHasIndexFile(false);
      setHasCheckedAfterGeneration(false);
    }

    if (previousGeneratingRef.current === true && isGenerating === false && startupId) {
      void checkForIndexFile();
      setHasCheckedAfterGeneration(true);
    }
    previousGeneratingRef.current = isGenerating;
  }, [isGenerating, startupId, checkForIndexFile]);

  const handleRefresh = () => {
    if (isGenerating || !startupId) return;
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
    <div className="h-full flex flex-col bg-[#0b1a33]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#142646] border-b border-[#1f3557]">
        <div className="flex items-center space-x-2 text-[#dbe9ff]">
          <Globe className="w-4 h-4 text-[#f2c94c]" />
          <span className="text-sm font-medium">Live Preview</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-[#1f3557] rounded disabled:opacity-50 disabled:cursor-not-allowed text-[#dbe9ff]"
            title="Refresh"
            disabled={isGenerating || !hasIndexFile}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#f2c94c]' : 'text-[#8ba4c7]'}`}
            />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1 hover:bg-[#1f3557] rounded disabled:opacity-50 disabled:cursor-not-allowed text-[#dbe9ff]"
            title="Open in new tab"
            disabled={!hasIndexFile || isGenerating}
          >
            <ExternalLink className="w-4 h-4 text-[#8ba4c7]" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0f1d36] border-t border-[#0b1a33]">
        {startupId ? (
          isGenerating ? (
            <div className="h-full flex items-center justify-center bg-[#0f1d36] text-[#b8c7dd]">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#f2c94c] mb-4"></div>
                <p className="font-medium text-white">Generating your MVP...</p>
                <p className="text-sm mt-2 text-[#8ba4c7]">The preview will refresh automatically once it is ready.</p>
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
            <div className="h-full flex items-center justify-center bg-[#0f1d36] text-[#b8c7dd]">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-[#f2c94c]" />
                <p className="font-medium text-white">No preview available</p>
                <p className="text-sm mt-2 text-[#8ba4c7]">The generated MVP is missing an index.html file.</p>
                <p className="text-xs mt-1 text-[#6f87ab]">Ask the AI to add a landing page or main screen.</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-[#0f1d36] text-[#b8c7dd]">
              <div className="text-center">
                <Globe className="w-16 h-16 mx-auto mb-4 text-[#f2c94c]" />
                <p className="font-medium text-white">Ready for preview</p>
                <p className="text-sm mt-2 text-[#8ba4c7]">Collaborate with the AI to build your MVP.</p>
              </div>
            </div>
          )
        ) : (
          <div className="h-full flex items-center justify-center bg-[#0f1d36] text-[#8ba4c7]">
            <div className="text-center">
              <Globe className="w-16 h-16 mx-auto mb-4 text-[#f2c94c]" />
              <p className="font-medium text-white">No preview available</p>
              <p className="text-sm mt-2">Submit an idea above to generate your MVP preview.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
