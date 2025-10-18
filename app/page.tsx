'use client';

import { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Plus, Folder, Trash2 } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ChatPanel } from '@/components/ChatPanel';
import { Preview } from '@/components/Preview';
import { NewProjectModal } from '@/components/NewProjectModal';

interface Project {
  id: string;
  name: string;
  prompt: string;
  created_at: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const { isConnected, messages, isGenerating, generationCompleted, generate, chat } = useWebSocket(
    currentProject?.id || null
  );

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleCreateProject = async (projectData: any) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });

      const data = await response.json();

      if (data.success) {
        setCurrentProject({
          id: data.project_id,
          ...data.metadata
        });

        await loadProjects();

        setTimeout(() => {
          generate(projectData.prompt);
        }, 500);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        if (currentProject?.id === projectId) {
          setCurrentProject(null);
        }
        await loadProjects();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleSendMessage = (message: string) => {
    chat(message);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <h1 className="text-xl font-bold text-white">Code Generator</h1>
          </div>

          {currentProject && (
            <div className="flex items-center space-x-2 ml-8">
              <Folder className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">{currentProject.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNewProject(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Projects List */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">
              Projects
            </h2>

            {isLoadingProjects ? (
              <div className="text-center text-gray-500 text-sm py-8">
                Loading...
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <p>No projects yet</p>
                <p className="mt-2">Click "New Project" to start</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-3 rounded-lg cursor-pointer border ${
                      currentProject?.id === project.id
                        ? 'bg-gray-700 border-blue-500'
                        : 'bg-gray-900 border-gray-700 hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      setCurrentProject(project);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {project.prompt}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="ml-2 p-1 hover:bg-gray-600 rounded"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Workspace - Preview and Chat */}
        {currentProject ? (
          <div className="flex-1">
            <PanelGroup direction="vertical">
              {/* Preview */}
              <Panel defaultSize={60} minSize={30}>
                <Preview
                  projectId={currentProject.id}
                  isGenerating={isGenerating}
                  generationCompleted={generationCompleted}
                />
              </Panel>

              <PanelResizeHandle className="h-1 bg-gray-700 hover:bg-blue-500 transition-colors" />

              {/* Chat Panel */}
              <Panel defaultSize={40} minSize={20}>
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isGenerating={isGenerating}
                  isConnected={isConnected}
                />
              </Panel>
            </PanelGroup>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-4xl">AI</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-200 mb-2">
                Welcome to AI Code Generator
              </h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Build beautiful web applications using natural language.
                Powered by Claude AI.
              </p>
              <button
                onClick={() => setShowNewProject(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Create Your First Project</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
