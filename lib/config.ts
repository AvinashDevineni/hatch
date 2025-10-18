import path from 'path';
import fs from 'fs';

/**
 * Application configuration
 */
class Config {
  // API Keys
  ANTHROPIC_API_KEY: string;

  // Server settings
  PORT: number;
  HOST: string;

  // Paths
  BASE_DIR: string;
  PROJECTS_DIR: string;
  TEMPLATES_DIR: string;

  // Node.js settings
  NODE_PATH: string;
  NPM_PATH: string;

  // Claude settings
  CLAUDE_MODEL: string;
  MAX_TOKENS: number;

  constructor() {
    this.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

    this.PORT = parseInt(process.env.PORT || '3000', 10);
    this.HOST = process.env.HOST || '0.0.0.0';

    this.BASE_DIR = process.cwd();
    this.PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(this.BASE_DIR, 'projects');
    this.TEMPLATES_DIR = path.join(this.BASE_DIR, 'templates');

    this.NODE_PATH = process.env.NODE_PATH || 'node';
    this.NPM_PATH = process.env.NPM_PATH || 'npm';

    this.CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';
    this.MAX_TOKENS = 8000;
  }

  /**
   * Validate required configuration
   */
  validate(): void {
    if (!this.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    // Create directories if they don't exist
    if (!fs.existsSync(this.PROJECTS_DIR)) {
      fs.mkdirSync(this.PROJECTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(this.TEMPLATES_DIR)) {
      fs.mkdirSync(this.TEMPLATES_DIR, { recursive: true });
    }
  }
}

export const config = new Config();
