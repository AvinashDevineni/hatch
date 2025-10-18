import fs from 'fs/promises';
import path from 'path';

export interface StartupMetadata {
  startupId: string;
  messages?: unknown[];
  generationCompleted?: boolean;
  deploymentUrl?: string;
  latestDashboardUrl?: string;
  deploymentHistory?: DeploymentRecord[];
  databaseSetup?: boolean;
  createdAt?: string;
  updatedAt?: string;
  analyticsConfig?: AnalyticsConfig;
  startupName?: string;
  prompt?: string;
  template?: string;
  name?: string;
}

export interface DeploymentRecord {
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface FeedbackQuestion {
  id: string;
  prompt: string;
  scaleMin: number;
  scaleMax: number;
}

export interface AnalyticsConfig {
  startupId: string;
  baseUrl: string;
  visitEndpoint: string;
  feedbackEndpoint: string;
  dashboardUrl: string;
  questions: FeedbackQuestion[];
  latestDeploymentUrl?: string | null;
}

/**
 * Startup metadata manager
 * Handles reading and writing startup metadata including deployment info
 */
export class StartupMetadataManager {
  private startupPath: string;
  private metadataFile: string;

  constructor(startupPath: string) {
    this.startupPath = startupPath;
    this.metadataFile = path.join(startupPath, 'startup.json');
  }

  /**
   * Read startup metadata
   */
  async read(): Promise<StartupMetadata | null> {
    try {
      const content = await fs.readFile(this.metadataFile, 'utf-8');
      return JSON.parse(content) as StartupMetadata;
    } catch {
      // File doesn't exist or couldn't be read
      return null;
    }
  }

  /**
   * Write startup metadata
   */
  async write(metadata: StartupMetadata): Promise<void> {
    try {
      metadata.updatedAt = new Date().toISOString();
      await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
    } catch (error) {
      console.error('[StartupMetadata] Error writing metadata:', error);
      throw error;
    }
  }

  /**
   * Update specific fields in metadata
   */
  async update(updates: Partial<StartupMetadata>): Promise<void> {
    const existing = (await this.read()) ?? { startupId: path.basename(this.startupPath) };
    const updated: StartupMetadata = { ...existing, ...updates };
    await this.write(updated);
  }

  /**
   * Store deployment URL
   */
  async storeDeploymentUrl(url: string, success: boolean = true, error?: string): Promise<void> {
    const metadata = (await this.read()) ?? { startupId: path.basename(this.startupPath) };

    const deploymentRecord: DeploymentRecord = {
      url,
      timestamp: new Date().toISOString(),
      success,
      error
    };

    if (!metadata.deploymentHistory) {
      metadata.deploymentHistory = [];
    }

    metadata.deploymentHistory.push(deploymentRecord);

    if (success) {
      metadata.deploymentUrl = url;
      if (metadata.analyticsConfig) {
        metadata.analyticsConfig.latestDeploymentUrl = url;
      }
    }

    await this.write(metadata);
  }

  /**
   * Get latest deployment URL
   */
  async getDeploymentUrl(): Promise<string | null> {
    const metadata = await this.read();
    return metadata?.deploymentUrl ?? null;
  }

  /**
   * Mark database as setup
   */
  async markDatabaseSetup(): Promise<void> {
    await this.update({ databaseSetup: true });
  }

  /**
   * Check if database is setup
   */
  async isDatabaseSetup(): Promise<boolean> {
    const metadata = await this.read();
    return metadata?.databaseSetup ?? false;
  }
}
