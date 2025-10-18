'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';

interface VisitEvent {
  id: string;
  timestamp: string;
  deploymentUrl: string;
}

interface FeedbackRating {
  questionId: string;
  question: string;
  value: number;
}

interface FeedbackEntry {
  id: string;
  timestamp: string;
  deploymentUrl: string;
  ratings: FeedbackRating[];
  comment?: string;
}

interface DashboardData {
  startupId: string;
  latestDeploymentUrl: string | null;
  visitsLast24Hours: number;
  totalVisits: number;
  visitLog: VisitEvent[];
  feedbackEntries: FeedbackEntry[];
  generatedAt: string;
  analyticsConfig?: {
    dashboardUrl: string;
    visitEndpoint: string;
    feedbackEndpoint: string;
    questions: Array<{
      id: string;
      prompt: string;
      scaleMin: number;
      scaleMax: number;
    }>;
  };
}

interface ApiResponse {
  success: boolean;
  data?: DashboardData;
  message?: string;
}

interface DashboardPageProps {
  params: { startupId: string };
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const { startupId } = params;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/startups/${startupId}/analytics`, {
        cache: 'no-store'
      });
      const json: ApiResponse = await response.json();

      if (!json.success || !json.data) {
        throw new Error(json.message || 'Failed to load analytics');
      }

      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [startupId]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const activityLog = useMemo(() => {
    if (!data) return [];

    const visits = data.visitLog.map((visit) => ({
      id: visit.id,
      timestamp: visit.timestamp,
      type: 'visit' as const,
      summary: `Visit recorded for ${visit.deploymentUrl}`
    }));

    const feedback = data.feedbackEntries.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      type: 'feedback' as const,
      summary: `Feedback received (${entry.ratings.map((r) => `${r.question}: ${r.value}`).join(', ') || 'no ratings'})`
    }));

    return [...visits, ...feedback].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [data]);

  return (
    <div className="min-h-screen bg-[#030915] text-[#e5ecff]">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-[#8ba4c7] hover:text-[#dbe9ff] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to startups
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Deployment Dashboard
              </h1>
              <p className="text-sm text-[#8ba4c7]">
                Startup ID: <span className="font-mono">{startupId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboard}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#142646] hover:bg-[#1f3557] text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {data?.latestDeploymentUrl && (
              <a
                href={data.latestDeploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#f2c94c] text-[#0b1a33] font-semibold hover:bg-[#ffd65c] rounded-lg text-sm"
              >
                Open latest deployment
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </header>

        {loading ? (
          <div className="bg-[#0b1a33] border border-[#1f3557] rounded-xl p-8 text-center">
            <p className="text-[#8ba4c7]">Loading analytics...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-8">
            <h2 className="text-red-300 font-semibold mb-2">Failed to load analytics</h2>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-8">
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0b1a33] border border-[#1f3557] rounded-xl p-6">
                <p className="text-sm text-[#8ba4c7]">Visits (24h)</p>
                <p className="text-3xl font-semibold mt-2 text-white">{data.visitsLast24Hours}</p>
              </div>
              <div className="bg-[#0b1a33] border border-[#1f3557] rounded-xl p-6">
                <p className="text-sm text-[#8ba4c7]">Total visits (latest deployment)</p>
                <p className="text-3xl font-semibold mt-2 text-white">{data.totalVisits}</p>
              </div>
              <div className="bg-[#0b1a33] border border-[#1f3557] rounded-xl p-6">
                <p className="text-sm text-[#8ba4c7]">Analytics base endpoint</p>
                <p className="text-xs text-[#dbe9ff] break-all mt-2">
                  {data.analyticsConfig?.visitEndpoint || 'Configured in startup metadata'}
                </p>
              </div>
            </section>

            <section className="bg-[#0b1a33] border border-[#1f3557] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Live Activity</h2>
                <span className="text-xs text-[#6f87ab]">
                  Last update: {data.generatedAt ? formatDate(data.generatedAt) : 'unknown'}
                </span>
              </div>

              {activityLog.length === 0 ? (
                <p className="text-sm text-[#8ba4c7]">No activity recorded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activityLog.slice(0, 25).map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-3 bg-[#030915]/40 border border-[#1f3557] rounded-lg p-4"
                    >
                      <span className={`px-2 py-1 text-xs rounded ${entry.type === 'visit' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'}`}>
                        {entry.type === 'visit' ? 'Visit' : 'Feedback'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-white">{entry.summary}</p>
                        <p className="text-xs text-[#6f87ab] mt-1">{formatDate(entry.timestamp)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-[#0b1a33] border border-[#1f3557] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Feedback Stream</h2>
                <span className="text-xs text-[#6f87ab]">
                  Questions can be configured from system defaults.
                </span>
              </div>

              {data.feedbackEntries.length === 0 ? (
                <p className="text-sm text-[#8ba4c7]">No feedback submitted yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.feedbackEntries.slice(0, 20).map((entry) => (
                    <div key={entry.id} className="bg-[#030915]/40 border border-[#1f3557] rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">
                          Deployment: <span className="font-mono text-[#dbe9ff]">{entry.deploymentUrl}</span>
                        </p>
                        <span className="text-xs text-[#6f87ab]">{formatDate(entry.timestamp)}</span>
                      </div>
                      <div className="mt-3 space-y-1">
                        {entry.ratings.map((rating) => (
                          <p key={rating.questionId} className="text-sm text-[#dbe9ff]">
                            <span className="text-[#8ba4c7]">{rating.question}:</span>{' '}
                            <span className="font-semibold text-white">{rating.value}</span>
                          </p>
                        ))}
                      </div>
                      {entry.comment && (
                        <p className="mt-3 text-sm text-[#dbe9ff] italic">
                          “{entry.comment}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
