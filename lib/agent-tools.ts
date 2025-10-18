import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { config } from './config';

export interface OperationResult {
  success: boolean;
  message?: string;
  content?: string;
  path?: string;
  stdout?: string;
  stderr?: string;
  returncode?: number;
  files?: FileInfo[];
  structure?: string;
  root?: string;
}

export interface FileInfo {
  path: string;
  size: number;
  modified: number;
}

/**
 * Collection of tools for code generation and file management
 */
export class CodeGeneratorTools {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    // Ensure project directory exists
    fs.mkdir(this.projectPath, { recursive: true }).catch(() => {});
  }

  /**
   * Sanitize file path to ensure it's relative and doesn't contain the project path
   */
  private sanitizePath(filePath: string): string {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error(`Invalid file path: ${filePath}`);
    }
    let pathStr = filePath.trim();

    // Remove any reference to the project path
    if (pathStr.startsWith(this.projectPath)) {
      pathStr = pathStr.substring(this.projectPath.length).replace(/^\/+/, '');
    }

    // Remove "projects/" prefix if present (common AI mistake)
    if (pathStr.startsWith('projects/')) {
      pathStr = pathStr.substring(9);
    }

    // Remove leading slashes
    pathStr = pathStr.replace(/^\/+/, '');

    // Ensure it's a relative path
    if (path.isAbsolute(pathStr)) {
      pathStr = path.relative('/', pathStr);
    }

    return pathStr;
  }

  /**
   * Create a new file with the given content
   */
  async createFile(filePath: string, content: string): Promise<OperationResult> {
    try {
      if (!content || typeof content !== 'string') {
        return {
          success: false,
          message: `Invalid content provided for file: ${filePath}`
        };
      }
      const sanitizedPath = this.sanitizePath(filePath);
      const fullPath = path.join(this.projectPath, sanitizedPath);

      console.log(`[Tools] Creating file: ${sanitizedPath} (${content.length} bytes)`);

      // Create parent directories if needed
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      await fs.writeFile(fullPath, content, 'utf-8');

      console.log(`[Tools] ✅ Created file: ${sanitizedPath}`);

      return {
        success: true,
        message: `Created file: ${sanitizedPath}`,
        path: fullPath
      };
    } catch (error) {
      console.error(`[Tools] ❌ Error creating file ${filePath}:`, error);
      return {
        success: false,
        message: `Error creating file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Update an existing file or create it if it doesn't exist
   */
  async updateFile(filePath: string, content: string): Promise<OperationResult> {
    try {
      if (!content || typeof content !== 'string') {
        return {
          success: false,
          message: `Invalid content provided for file: ${filePath}`
        };
      }
      const sanitizedPath = this.sanitizePath(filePath);
      const fullPath = path.join(this.projectPath, sanitizedPath);

      console.log(`[Tools] Updating file: ${sanitizedPath} (${content.length} bytes)`);

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');

      console.log(`[Tools] ✅ Updated file: ${sanitizedPath}`);

      return {
        success: true,
        message: `Updated file: ${sanitizedPath}`,
        path: fullPath
      };
    } catch (error) {
      console.error(`[Tools] ❌ Error updating file ${filePath}:`, error);
      return {
        success: false,
        message: `Error updating file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Read the contents of a file
   */
  async readFile(filePath: string): Promise<OperationResult> {
    try {
      const fullPath = path.join(this.projectPath, filePath);

      try {
        await fs.access(fullPath);
      } catch {
        return {
          success: false,
          message: `File not found: ${filePath}`
        };
      }

      const content = await fs.readFile(fullPath, 'utf-8');

      return {
        success: true,
        content,
        path: fullPath
      };
    } catch (error) {
      return {
        success: false,
        message: `Error reading file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<OperationResult> {
    try {
      const fullPath = path.join(this.projectPath, filePath);

      try {
        await fs.access(fullPath);
        await fs.unlink(fullPath);
        return {
          success: true,
          message: `Deleted file: ${filePath}`
        };
      } catch {
        return {
          success: false,
          message: `File not found: ${filePath}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error deleting file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * List all files in a directory
   */
  async listFiles(directory: string = '.'): Promise<OperationResult> {
    try {
      const fullPath = path.join(this.projectPath, directory);

      try {
        await fs.access(fullPath);
      } catch {
        return {
          success: false,
          message: `Directory not found: ${directory}`
        };
      }

      const files: FileInfo[] = [];

      async function walkDir(dir: string, projectPath: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullEntryPath = path.join(dir, entry.name);

          if (entry.isFile()) {
            const stats = await fs.stat(fullEntryPath);
            const relativePath = path.relative(projectPath, fullEntryPath);
            files.push({
              path: relativePath,
              size: stats.size,
              modified: stats.mtimeMs
            });
          } else if (entry.isDirectory()) {
            await walkDir(fullEntryPath, projectPath);
          }
        }
      }

      await walkDir(fullPath, this.projectPath);

      return {
        success: true,
        files
      };
    } catch (error) {
      return {
        success: false,
        message: `Error listing files: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a directory
   */
  async createDirectory(dirPath: string): Promise<OperationResult> {
    try {
      const fullPath = path.join(this.projectPath, dirPath);
      await fs.mkdir(fullPath, { recursive: true });

      return {
        success: true,
        message: `Created directory: ${dirPath}`,
        path: fullPath
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating directory: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Run a shell command in the project directory
   */
  async runCommand(command: string, cwd: string = '.'): Promise<OperationResult> {
    return new Promise((resolve) => {
      const fullCwd = path.join(this.projectPath, cwd);

      const proc = spawn(command, {
        cwd: fullCwd,
        shell: true
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr,
          returncode: code || 0
        });
      });

      proc.on('error', (error) => {
        resolve({
          success: false,
          message: `Error running command: ${error.message}`
        });
      });
    });
  }

  /**
   * Get the complete project file structure
   */
  getProjectStructure(): OperationResult {
    try {
      function buildTree(dirPath: string, prefix: string = ''): string[] {
        const items: string[] = [];

        try {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true })
            .sort((a, b) => {
              if (a.isDirectory() && !b.isDirectory()) return -1;
              if (!a.isDirectory() && b.isDirectory()) return 1;
              return a.name.localeCompare(b.name);
            });

          entries.forEach((entry, index) => {
            const isLast = index === entries.length - 1;
            const currentPrefix = isLast ? '└── ' : '├── ';
            items.push(prefix + currentPrefix + entry.name);

            if (entry.isDirectory() && !entry.name.startsWith('.')) {
              const extension = isLast ? '    ' : '│   ';
              const subPath = path.join(dirPath, entry.name);
              items.push(...buildTree(subPath, prefix + extension));
            }
          });
        } catch (error) {
          // Permission error or other issue, skip this directory
        }

        return items;
      }

      const tree = [path.basename(this.projectPath), ...buildTree(this.projectPath)];

      return {
        success: true,
        structure: tree.join('\n'),
        root: this.projectPath
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting project structure: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
