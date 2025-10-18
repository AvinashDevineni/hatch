import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { config } from '@/lib/config';

// MIME types mapping
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * GET /api/projects/[id]/preview/[[...path]] - Serve files for preview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path?: string[] }> }
) {
  try {
    const { id: projectId, path: urlPath = [] } = await params;
    const projectPath = path.join(config.PROJECTS_DIR, projectId);

    const pathSegments = Array.isArray(urlPath) ? urlPath : [urlPath];

    // Default to index.html if path is empty or ends with /
    let filePathStr = pathSegments.join('/');
    if (!filePathStr || filePathStr.endsWith('/')) {
      filePathStr = (filePathStr || '') + 'index.html';
    }

    const fullPath = path.join(projectPath, filePathStr);

    // Security check: ensure file is within project directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedProjectPath = path.resolve(projectPath);

    if (!resolvedPath.startsWith(resolvedProjectPath)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if file exists
    try {
      const stats = await fs.stat(fullPath);

      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'Not a file' },
          { status: 400 }
        );
      }

      // Read file
      const content = await fs.readFile(fullPath);

      // Determine media type
      const mediaType = getMimeType(fullPath);

      // Return file with appropriate content type
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': mediaType,
          'Cache-Control': 'no-cache'
        }
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
