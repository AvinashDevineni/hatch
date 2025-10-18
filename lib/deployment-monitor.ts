import { VercelDeployment } from './vercel-deployment';
import { StartupMetadataManager } from './startup-metadata';
import path from 'path';
import fs from 'fs/promises';
import { config } from './config';

/**
 * Background service that monitors pending deployments
 * and completes them after user authorization
 */
export class DeploymentMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start monitoring for pending deployments
   */
  start() {
    if (this.isRunning) {
      console.log('[DeploymentMonitor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[DeploymentMonitor] Starting deployment monitor...');

    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkPendingDeployments().catch(error => {
        console.error('[DeploymentMonitor] Error checking pending deployments:', error);
      });
    }, 30000);

    // Do an initial check immediately
    this.checkPendingDeployments().catch(error => {
      console.error('[DeploymentMonitor] Error in initial check:', error);
    });
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('[DeploymentMonitor] Stopped');
  }

  /**
   * Check all startups for pending deployments
   */
  private async checkPendingDeployments() {
    try {
      const startupsDir = config.STARTUPS_DIR;

      // Get all startup directories
      const dirs = await fs.readdir(startupsDir);

      for (const dir of dirs) {
        const startupPath = path.join(startupsDir, dir);
        const stats = await fs.stat(startupPath);

        if (!stats.isDirectory()) {
          continue;
        }

        // Check if this startup has a pending deployment
        const metadataManager = new StartupMetadataManager(startupPath);
        const metadata = await metadataManager.read();

        if (metadata?.deploymentStatus === 'awaiting_authorization') {
          console.log(`[DeploymentMonitor] Found pending deployment for startup ${dir}`);
          await this.tryCompleteDeployment(dir, startupPath, metadataManager);
        }
      }
    } catch (error) {
      console.error('[DeploymentMonitor] Error checking pending deployments:', error);
    }
  }

  /**
   * Try to complete a pending deployment
   */
  private async tryCompleteDeployment(
    startupId: string,
    startupPath: string,
    metadataManager: StartupMetadataManager
  ) {
    try {
      const vercelDeployment = new VercelDeployment(startupPath);

      // Check if the startup is now linked (user has authorized)
      const isLinked = await vercelDeployment.isLinked();

      if (isLinked) {
        console.log(`[DeploymentMonitor] Startup ${startupId} is now linked! Completing deployment...`);

        // Update status
        await metadataManager.update({
          deploymentStatus: 'deploying'
        });

        // Complete the deployment
        const deployResult = await vercelDeployment.completeDeployment();

        if (deployResult.success && deployResult.deploymentUrl) {
          // Store deployment URL
          await metadataManager.storeDeploymentUrl(deployResult.deploymentUrl, true);
          await metadataManager.update({
            deploymentStatus: 'deployed'
          });

          console.log(`[DeploymentMonitor] ✅ Deployment completed for ${startupId}: ${deployResult.deploymentUrl}`);
        } else {
          // Store failure
          await metadataManager.storeDeploymentUrl('', false, deployResult.error);
          await metadataManager.update({
            deploymentStatus: 'failed'
          });

          console.log(`[DeploymentMonitor] ❌ Deployment failed for ${startupId}: ${deployResult.error}`);
        }
      } else {
        // Check if it's been too long (more than 1 hour)
        const metadata = await metadataManager.read();
        if (metadata?.authorizationLinkSent) {
          const sentTime = new Date(metadata.authorizationLinkSent).getTime();
          const now = Date.now();
          const hourInMs = 60 * 60 * 1000;

          if (now - sentTime > hourInMs) {
            console.log(`[DeploymentMonitor] Authorization timeout for ${startupId} (>1 hour)`);
            await metadataManager.update({
              deploymentStatus: 'authorization_timeout'
            });
          }
        }
      }
    } catch (error) {
      console.error(`[DeploymentMonitor] Error completing deployment for ${startupId}:`, error);
    }
  }
}

// Create singleton instance
export const deploymentMonitor = new DeploymentMonitor();
