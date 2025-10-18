import { spawn } from 'child_process';
import path from 'path';
import { StartupAnalyticsManager } from './analytics';
import { StartupMetadataManager } from './startup-metadata';
import { config } from './config';

export interface DeploymentResult {
  success: boolean;
  message: string;
  deploymentUrl?: string;
  error?: string;
}

/**
 * Simple Vercel deployment utility
 * Assumes 'vercel login' has been run beforehand
 */
export class VercelDeployment {
  private startupPath: string;

  constructor(startupPath: string) {
    this.startupPath = startupPath;
  }

  /**
   * Deploy to Vercel production
   * Runs: vercel link --yes && vercel --prod --yes
   */
  async deploy(): Promise<DeploymentResult> {
    try {
      console.log('[VercelDeployment] Starting deployment...');
      console.log('[VercelDeployment] Working directory:', this.startupPath);

      // Step 1: Link the startup
      console.log('[VercelDeployment] Running: vercel link --yes');
      const linkResult = await this.runCommand('vercel link --yes', { timeout: 120000 });

      if (!linkResult.success) {
        return {
          success: false,
          message: 'Failed to link startup to Vercel',
          error: linkResult.stderr || linkResult.stdout
        };
      }

      console.log('[VercelDeployment] Startup linked successfully');

      // Step 2: Deploy to production
      console.log('[VercelDeployment] Running: vercel --prod --yes');
      const deployResult = await this.runCommand('vercel --prod --yes', { timeout: 600000 });

      if (!deployResult.success) {
        return {
          success: false,
          message: 'Failed to deploy to Vercel production',
          error: deployResult.stderr || deployResult.stdout
        };
      }

      // Extract deployment URL from output
      const output = deployResult.stdout || '';
      const urlMatch = output.match(/https?:\/\/[^\s]+\.vercel\.app/g);
      const deploymentUrl = urlMatch ? urlMatch[urlMatch.length - 1] : undefined;

      console.log('[VercelDeployment] Deployment successful!');
      if (deploymentUrl) {
        console.log('[VercelDeployment] URL:', deploymentUrl);

        try {
          const startupId = path.basename(this.startupPath);
          const analyticsManager = new StartupAnalyticsManager(startupId);
          await analyticsManager.ensureDeploymentAnalytics(deploymentUrl);

          const metadataManager = new StartupMetadataManager(this.startupPath);
          const metadata = await metadataManager.read();

          const analyticsConfig = metadata?.analyticsConfig
            ? { ...metadata.analyticsConfig, latestDeploymentUrl: deploymentUrl }
            : undefined;

          await metadataManager.update({
            deploymentUrl,
            latestDashboardUrl: `${config.PUBLIC_BASE_URL}/dashboard/${startupId}`,
            ...(analyticsConfig ? { analyticsConfig } : {})
          });
        } catch (analyticsError) {
          console.error('[VercelDeployment] Failed to update analytics metadata:', analyticsError);
        }
      }

      return {
        success: true,
        message: 'Deployment successful',
        deploymentUrl
      };
    } catch (error) {
      console.error('[VercelDeployment] Error during deployment:', error);
      return {
        success: false,
        message: 'Error during deployment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run a command in the startup directory
   */
  private async runCommand(
    command: string,
    options: { timeout?: number } = {}
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const proc = spawn(command, {
        cwd: this.startupPath,
        shell: true
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeout = options.timeout || 60000;
      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);

        if (timedOut) {
          resolve({
            success: false,
            stdout,
            stderr: stderr + '\nCommand timed out'
          });
        } else {
          resolve({
            success: code === 0,
            stdout,
            stderr
          });
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          success: false,
          stdout,
          stderr: error.message
        });
      });
    });
  }
}
