import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  type: string;
  content: string;
  timestamp: Date;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  messages: Message[];
  isGenerating: boolean;
  generationCompleted: boolean;
  generate: (prompt: string) => void;
  chat: (message: string) => void;
}

type AgentUpdate =
  | {
      type: 'text' | 'error';
      content?: string;
    }
  | {
      type: 'tool_use';
      tool?: string;
      input?: Record<string, unknown>;
    }
  | {
      type: 'result';
      result?: unknown;
    }
  | {
      type: 'thinking';
      content?: string;
    };

interface StoredMessageWire {
  type: string;
  content: string;
  timestamp?: string | number | Date;
}

const summarizeToolUse = (tool?: string, input?: Record<string, unknown>): string | null => {
  if (!tool) return null;

  const safeInput = input ?? {};

  switch (tool) {
    case 'create_file': {
      const filePath = typeof safeInput.file_path === 'string' ? safeInput.file_path : null;
      return filePath ? `Creating ${filePath}` : 'Creating a file';
    }
    case 'update_file': {
      const filePath = typeof safeInput.file_path === 'string' ? safeInput.file_path : null;
      return filePath ? `Updating ${filePath}` : 'Updating a file';
    }
    case 'create_directory': {
      const dirPath = typeof safeInput.dir_path === 'string' ? safeInput.dir_path : null;
      return dirPath ? `Creating directory ${dirPath}` : 'Creating a directory';
    }
    case 'run_command': {
      const command = typeof safeInput.command === 'string' ? safeInput.command : null;
      return command ? `Running command \`${command}\`` : 'Running a command';
    }
    case 'list_files':
      return null;
    case 'read_file': {
      const filePath = typeof safeInput.file_path === 'string' ? safeInput.file_path : null;
      return filePath ? `Reviewing ${filePath}` : 'Reviewing a file';
    }
    case 'get_project_structure':
      return 'Inspecting project structure';
    default:
      return null;
  }
};

const summarizeAgentUpdate = (update: AgentUpdate | undefined): { content: string; type: 'assistant' | 'error' } | null => {
  if (!update) return null;

  switch (update.type) {
    case 'text': {
      const text = update.content?.trim();
      if (!text) return null;
      return { content: text, type: 'assistant' };
    }
    case 'error': {
      const text = update.content?.trim() || 'Agent encountered an error';
      return { content: text, type: 'error' };
    }
    case 'tool_use': {
      const summary = summarizeToolUse(update.tool, update.input);
      if (!summary) return null;
      return { content: summary, type: 'assistant' };
    }
    case 'result':
      return null;
    case 'thinking': {
      const text = update.content?.trim();
      if (!text) return null;
      return { content: text, type: 'assistant' };
    }
    default:
      return null;
  }
};

export function useWebSocket(projectId: string | null): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isGeneratingRef = useRef(false);

  // Save messages whenever they change (debounced)
  useEffect(() => {
    if (!projectId || messages.length === 0) return;

    const saveTimer = setTimeout(async () => {
      try {
        const messagesToSave = messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        }));

        await fetch(`/api/projects/${projectId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messagesToSave })
        });
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(saveTimer);
  }, [messages, projectId]);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    if (!projectId) return;

    let pingInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      // Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}/ws/${projectId}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts = 0;

        // Start ping interval to keep connection alive
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);

        switch (data.type) {
          case 'connected':
            // Load existing messages if any
            if (Array.isArray(data.messages) && data.messages.length > 0) {
              const loadedMessages = (data.messages as StoredMessageWire[])
                .filter((msg) => typeof msg?.content === 'string' && typeof msg?.type === 'string')
                .map((msg) => ({
                  type: msg.type,
                  content: msg.content,
                  timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
                }));
              setMessages(loadedMessages);
            } else {
              setMessages([{
                type: 'system',
                content: 'Connected to project',
                timestamp: new Date()
              }]);
            }

            // Set generation completed state
            if (data.generationCompleted !== undefined) {
              setGenerationCompleted(data.generationCompleted);
            }
            break;

          case 'generation_started':
            console.log(`[WebSocket] Generation started for project ${projectId}`);
            setIsGenerating(true);
            setMessages(prev => [...prev, {
              type: 'system',
              content: `Starting generation: ${data.prompt}`,
              timestamp: new Date()
            }]);
            break;

          case 'generation_update':
            console.log(`[WebSocket] Generation update:`, data.data);
            {
              const summary = summarizeAgentUpdate(data.data);
              if (summary) {
                setMessages(prev => [...prev, {
                  type: summary.type,
                  content: summary.content,
                  timestamp: new Date()
                }]);
              }
            }
            break;

          case 'generation_complete':
            console.log(`[WebSocket] ✅ Generation complete for project ${projectId}`);
            setIsGenerating(false);
            setGenerationCompleted(true);
            setMessages(prev => [...prev, {
              type: 'system',
              content: 'Generation complete',
              timestamp: new Date()
            }]);

            // Mark generation as complete in backend
            fetch(`/api/projects/${projectId}/complete`, {
              method: 'POST'
            }).catch(err => console.error('Error marking complete:', err));
            break;

          case 'chat_update':
            {
              const summary = summarizeAgentUpdate(data.data);
              if (summary) {
                setMessages(prev => [...prev, {
                  type: summary.type,
                  content: summary.content,
                  timestamp: new Date()
                }]);
              }
            }
            break;

          case 'chat_complete':
            setIsGenerating(false);
            break;

          case 'error':
            setIsGenerating(false);
            setMessages(prev => [...prev, {
              type: 'error',
              content: data.message,
              timestamp: new Date()
            }]);
            break;

          case 'pong':
            // Keep-alive response, no action needed
            console.log('Received pong');
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setMessages(prev => [...prev, {
          type: 'error',
          content: 'WebSocket connection error',
          timestamp: new Date()
        }]);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        clearInterval(pingInterval);

        // Attempt to reconnect if during active generation
        if (isGeneratingRef.current && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);

          setMessages(prev => [...prev, {
            type: 'system',
            content: `Connection lost. Reconnecting (attempt ${reconnectAttempts})...`,
            timestamp: new Date()
          }]);

          reconnectTimeout = setTimeout(() => {
            connect();
          }, 2000 * reconnectAttempts); // Exponential backoff
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setMessages(prev => [...prev, {
            type: 'error',
            content: 'Failed to reconnect. Please refresh the page.',
            timestamp: new Date()
          }]);
        }
      };
    };

    // Initial connection
    connect();

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [projectId]);

  const sendMessage = useCallback((type: string, data: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  const generate = useCallback((prompt: string) => {
    sendMessage('generate', { prompt });
  }, [sendMessage]);

  const chat = useCallback((message: string) => {
    sendMessage('chat', { message });
  }, [sendMessage]);

  return {
    isConnected,
    messages,
    isGenerating,
    generationCompleted,
    generate,
    chat
  };
}
