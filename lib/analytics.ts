import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { AnalyticsConfig, FeedbackQuestion, StartupMetadataManager } from './startup-metadata';

const ANALYTICS_FILENAME = 'analytics.json';

export interface VisitEvent {
  id: string;
  timestamp: string;
  deploymentUrl: string;
}

export interface FeedbackRating {
  questionId: string;
  question: string;
  value: number;
}

export interface FeedbackEntry {
  id: string;
  timestamp: string;
  deploymentUrl: string;
  ratings: FeedbackRating[];
  comment?: string;
}

export interface DeploymentAnalytics {
  deploymentUrl: string;
  createdAt: string;
  visits: VisitEvent[];
  feedback: FeedbackEntry[];
}

export interface AnalyticsFileData {
  startupId: string;
  createdAt: string;
  updatedAt: string;
  latestDeploymentUrl?: string | null;
  deployments: DeploymentAnalytics[];
}

export interface DashboardData {
  startupId: string;
  latestDeploymentUrl: string | null;
  visitsLast24Hours: number;
  totalVisits: number;
  visitLog: VisitEvent[];
  feedbackEntries: FeedbackEntry[];
  deployments: DeploymentAnalytics[];
  generatedAt: string;
  analyticsConfig?: AnalyticsConfig;
}

export interface FeedbackPayload {
  ratings: Array<{ questionId: string; value: number }>;
  comment?: string;
}

export class StartupAnalyticsManager {
  private startupId: string;
  private startupPath: string;
  private analyticsFile: string;

  constructor(startupId: string) {
    this.startupId = startupId;
    this.startupPath = path.join(config.STARTUPS_DIR, startupId);
    this.analyticsFile = path.join(this.startupPath, ANALYTICS_FILENAME);
  }

  private async ensureStartupDirectory() {
    await fs.mkdir(this.startupPath, { recursive: true });
  }

  private async readFile(): Promise<AnalyticsFileData> {
    await this.ensureStartupDirectory();

    try {
      const contents = await fs.readFile(this.analyticsFile, 'utf-8');
      return JSON.parse(contents) as AnalyticsFileData;
    } catch {
      const now = new Date().toISOString();
      const empty: AnalyticsFileData = {
        startupId: this.startupId,
        createdAt: now,
        updatedAt: now,
        latestDeploymentUrl: null,
        deployments: []
      };
      await this.writeFile(empty);
      return empty;
    }
  }

  private async writeFile(data: AnalyticsFileData): Promise<void> {
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(this.analyticsFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  private ensureDeploymentEntry(data: AnalyticsFileData, deploymentUrl: string): DeploymentAnalytics {
    let deployment = data.deployments.find((d) => d.deploymentUrl === deploymentUrl);

    if (!deployment) {
      deployment = {
        deploymentUrl,
        createdAt: new Date().toISOString(),
        visits: [],
        feedback: []
      };
      data.deployments.push(deployment);
    }

    data.latestDeploymentUrl = deploymentUrl;

    return deployment;
  }

  async ensureDeploymentAnalytics(deploymentUrl: string): Promise<void> {
    const data = await this.readFile();
    this.ensureDeploymentEntry(data, deploymentUrl);
    await this.writeFile(data);
  }

  async recordVisit(deploymentUrl: string, timestamp: Date = new Date()): Promise<VisitEvent> {
    const data = await this.readFile();
    const deployment = this.ensureDeploymentEntry(data, deploymentUrl);

    const event: VisitEvent = {
      id: uuidv4(),
      timestamp: timestamp.toISOString(),
      deploymentUrl
    };

    deployment.visits.push(event);
    await this.writeFile(data);
    return event;
  }

  async recordFeedback(
    deploymentUrl: string,
    ratings: FeedbackRating[],
    comment?: string
  ): Promise<FeedbackEntry> {
    const data = await this.readFile();
    const deployment = this.ensureDeploymentEntry(data, deploymentUrl);

    const entry: FeedbackEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      deploymentUrl,
      ratings,
      comment
    };

    deployment.feedback.push(entry);
    await this.writeFile(data);
    return entry;
  }

  async getDashboardData(): Promise<DashboardData> {
    const data = await this.readFile();
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;

    const latestDeploymentUrl = data.latestDeploymentUrl ?? null;
    const latestDeployment = latestDeploymentUrl
      ? data.deployments.find(d => d.deploymentUrl === latestDeploymentUrl)
      : undefined;

    const visits = latestDeployment?.visits ?? [];
    const totalVisits = visits.length;
    const visitsLast24Hours = visits.filter(visit => {
      const ts = new Date(visit.timestamp).getTime();
      return !Number.isNaN(ts) && ts >= cutoff;
    }).length;

    const visitLog = [...data.deployments.flatMap(d => d.visits)].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const feedbackEntries = [...data.deployments.flatMap(d => d.feedback)].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const metadataManager = new StartupMetadataManager(this.startupPath);
    const metadata = await metadataManager.read();

    return {
      startupId: this.startupId,
      latestDeploymentUrl,
      visitsLast24Hours,
      totalVisits,
      visitLog,
      feedbackEntries,
      deployments: data.deployments,
      generatedAt: new Date().toISOString(),
      analyticsConfig: metadata?.analyticsConfig
    };
  }

  async getQuestions(): Promise<FeedbackQuestion[]> {
    const metadataManager = new StartupMetadataManager(this.startupPath);
    const metadata = await metadataManager.read();
    return metadata?.analyticsConfig?.questions ?? [];
  }
}
