'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Folder, Trash2, ExternalLink } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ChatPanel } from '@/components/ChatPanel';
import { Preview } from '@/components/Preview';
import { Landing } from '@/components/hatch/Landing';
import { IdeaForm } from '@/components/hatch/IdeaForm';

interface Startup {
  id: string;
  startupId?: string;
  name: string;
  prompt: string;
  created_at: string;
  deploymentUrl?: string;
  latestDashboardUrl?: string;
  analyticsConfig?: {
    startupId: string;
    baseUrl: string;
    visitEndpoint: string;
    feedbackEndpoint: string;
    dashboardUrl: string;
    questions: Array<{
      id: string;
      prompt: string;
      scaleMin: number;
      scaleMax: number;
    }>;
  };
}

function generateStartupName(idea: string): string {
  const clean = idea.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return 'New Startup';
  }
  const words = clean.split(' ').slice(0, 4).join(' ');
  return words.length > 40 ? `${words.slice(0, 37)}...` : words;
}

export default function Home() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [currentStartup, setCurrentStartup] = useState<Startup | null>(null);
  const [isLoadingStartups, setIsLoadingStartups] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const ideaSectionRef = useRef<HTMLElement | null>(null);
  const builderRef = useRef<HTMLDivElement | null>(null);

  const { isConnected, messages, isGenerating, generationCompleted, generate, chat } = useWebSocket(
    currentStartup?.id || null
  );

  useEffect(() => {
    void loadStartups();
  }, []);

  const loadStartups = async () => {
    setIsLoadingStartups(true);
    try {
      const response = await fetch('/api/startups');
      const data = await response.json();

      if (data.success) {
        setStartups(data.startups);
      }
    } catch (error) {
      console.error('Error loading startups:', error);
    } finally {
      setIsLoadingStartups(false);
    }
  };

  const handleTryNow = () => {
    ideaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleIdeaSubmit = async (idea: string) => {
    setIsCreating(true);
    try {
      const name = generateStartupName(idea);
      const payload = {
        prompt: idea,
        name,
        template: 'blank'
      };

      const response = await fetch('/api/startups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create startup');
      }

      const createdStartup: Startup = {
        id: data.startup_id,
        ...data.metadata
      };

      setCurrentStartup(createdStartup);
      setStartups((prev) => {
        const next = [createdStartup, ...prev.filter((startup) => startup.id !== createdStartup.id)];
        return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });

      // Kick off MVP generation once the WebSocket has time to connect
      setTimeout(() => {
        generate(idea);
        builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    } catch (error) {
      console.error('Error creating startup:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteStartup = async (startupId: string) => {
    if (!confirm('Are you sure you want to delete this startup?')) {
      return;
    }

    try {
      const response = await fetch(`/api/startups/${startupId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setStartups((prev) => prev.filter((startup) => startup.id !== startupId));
        if (currentStartup?.id === startupId) {
          setCurrentStartup(null);
        }
      }
    } catch (error) {
      console.error('Error deleting startup:', error);
    }
  };

  const handleSendMessage = (message: string) => {
    chat(message);
  };

  const orderedStartups = useMemo(() => {
    return startups.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [startups]);

  return (
    <div className="min-h-screen w-full bg-[#0b1a33] text-white">
      <Landing onTryNow={handleTryNow} />

      <section ref={ideaSectionRef} className="px-6 pb-16">
        <IdeaForm onSubmitIdea={handleIdeaSubmit} isSubmitting={isCreating} />
      </section>

      <section id="builder" ref={builderRef} className="pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6">
          <aside className="bg-[#11203d] border border-[#1f3557] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1f3557]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#f2c94c]">Startups</h2>
              <p className="text-xs text-[#b8c7dd] mt-1">Ideas you&apos;ve generated MVPs for</p>
            </div>

            <div className="max-h-[480px] overflow-y-auto custom-scroll">
              {isLoadingStartups ? (
                <div className="px-5 py-6 text-sm text-[#b8c7dd]">Loading...</div>
              ) : orderedStartups.length === 0 ? (
                <div className="px-5 py-6 text-sm text-[#b8c7dd]">
                  <p>No startups yet</p>
                  <p className="mt-2 text-xs text-[#8ba4c7]">Describe an idea above to generate your first MVP.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#1f3557]">
                  {orderedStartups.map((startup) => {
                    const isActive = startup.id === currentStartup?.id;
                    return (
                      <li
                        key={startup.id}
                        className={`px-5 py-4 transition-colors ${
                          isActive ? 'bg-[#1a2f52]' : 'hover:bg-[#142646]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setCurrentStartup(startup)}
                          className="flex items-start gap-3 w-full text-left"
                        >
                          <span className="mt-0.5">
                            <Folder className={`w-4 h-4 ${isActive ? 'text-[#f2c94c]' : 'text-[#8ba4c7]'}`} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={`block text-sm font-medium ${isActive ? 'text-white' : 'text-[#dbe9ff]'}`}>
                              {startup.name}
                            </span>
                            <span className="block text-xs text-[#8ba4c7] mt-1 line-clamp-3">
                              {startup.prompt}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteStartup(startup.id);
                            }}
                            className="p-1 rounded-md text-[#8ba4c7] hover:text-[#ff8282] hover:bg-[#203458]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <div className="bg-[#11203d] border border-[#1f3557] rounded-2xl overflow-hidden flex flex-col">
            <header className="px-6 py-4 border-b border-[#1f3557] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-[#8ba4c7]">Active MVP</span>
                <span className="text-lg font-semibold text-white">
                  {currentStartup ? currentStartup.name : 'No startup selected'}
                </span>
              </div>

              {currentStartup?.latestDashboardUrl && (
                <a
                  href={currentStartup.latestDashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm bg-[#f2c94c] text-[#0b1a33] rounded-full px-4 py-2 font-semibold hover:shadow-lg hover:-translate-y-0.5 transition"
                >
                  <span>View Analytics Dashboard</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </header>

            <div className="flex-1 min-h-[520px] flex flex-col">
              {currentStartup ? (
                <PanelGroup direction="vertical" className="flex-1">
                  <Panel defaultSize={60} minSize={30} className="bg-[#0b1a33]">
                    <Preview
                      startupId={currentStartup.id}
                      isGenerating={isGenerating}
                      generationCompleted={generationCompleted}
                    />
                  </Panel>

                  <PanelResizeHandle className="h-1 bg-[#1f3557] hover:bg-[#f2c94c] transition-colors" />

                  <Panel defaultSize={40} minSize={20} className="bg-[#0b1a33]">
                    <ChatPanel
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      isGenerating={isGenerating}
                      isConnected={isConnected}
                    />
                  </Panel>
                </PanelGroup>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-10 py-16">
                  <h3 className="text-xl font-semibold text-white mb-3">No startup selected</h3>
                  <p className="text-sm text-[#8ba4c7] max-w-md">
                    Describe an idea above to generate an MVP. Your workspace will appear here with a live preview,
                    analytics tracking, and the AI collaboration chat.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
