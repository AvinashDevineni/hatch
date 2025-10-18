import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs/promises';
import path from 'path';
import { CodeGeneratorAgent } from './lib/agent';
import { config } from './lib/config';
import { feedbackEvents, LiveFeedbackEvent } from './lib/feedback-events';

const dev = process.env.NODE_ENV !== 'production';
const hostname = config.HOST;
const port = config.PORT;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

type StartupEventPayload = Record<string, unknown>;

interface StartupSession {
  agent: CodeGeneratorAgent;
  pendingUpdates: StartupEventPayload[];
  isGenerating: boolean;
  currentPrompt?: string;
  feedbackQueue: LiveFeedbackEvent[];
  processingFeedback: boolean;
}

// Active startups and WebSocket connections
const startupSessions = new Map<string, StartupSession>();
const activeConnections = new Map<string, WebSocket>();

async function ensureStartupSession(startupId: string): Promise<StartupSession> {
  let session = startupSessions.get(startupId);

  if (!session) {
    const agent = new CodeGeneratorAgent(startupId);
    await agent.initialize();

    session = {
      agent,
      pendingUpdates: [],
      isGenerating: false,
      feedbackQueue: [],
      processingFeedback: false
    };

    startupSessions.set(startupId, session);
  }

  return session;
}

function buildFeedbackPrompt(feedback: LiveFeedbackEvent): string {
  const ratingLines = feedback.ratings
    .map((rating) => `- ${rating.question}: ${rating.value}`)
    .join('\n');

  const feedbackSummary = ratingLines.length > 0
    ? ratingLines
    : '- No numeric ratings were provided.';

  const comment = feedback.comment?.trim() || 'No open feedback provided.';

  return `Live user feedback was just submitted through the deployed site's feedback widget.
Deployment URL: ${feedback.deploymentUrl}
Submitted at: ${feedback.timestamp}

Ratings:
${feedbackSummary}

Open feedback:
${comment}

Use this feedback to improve the startup immediately. Implement any reasonable fixes or enhancements, and make sure the analytics dashboard, page-load tracker, deployment URL display, and real-time feedback plumbing stay fully functional.`;
}

async function processFeedbackQueue(startupId: string, session: StartupSession): Promise<void> {
  if (session.processingFeedback || session.isGenerating) {
    return;
  }

  const nextFeedback = session.feedbackQueue.shift();

  if (!nextFeedback) {
    return;
  }

  session.processingFeedback = true;
  session.isGenerating = true;
  session.currentPrompt = 'Processing live user feedback';

  dispatchStartupEvent(startupId, {
    type: 'feedback_processing_started',
    feedback: nextFeedback
  });

  const prompt = buildFeedbackPrompt(nextFeedback);

  try {
    for await (const response of session.agent.chat(prompt)) {
      dispatchStartupEvent(startupId, {
        type: 'chat_update',
        data: response
      });
    }

    dispatchStartupEvent(startupId, {
      type: 'chat_complete'
    });
  } catch (error) {
    console.error(`[${startupId}] Error processing live feedback:`, error);

    dispatchStartupEvent(startupId, {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error while processing feedback'
    });
  } finally {
    session.processingFeedback = false;
    session.isGenerating = false;
    session.currentPrompt = undefined;

    setTimeout(() => {
      processFeedbackQueue(startupId, session).catch((err) => {
        console.error(`[${startupId}] Failed to process remaining feedback:`, err);
      });
    }, 0);
  }
}

function scheduleFeedbackProcessing(startupId: string, session: StartupSession) {
  setTimeout(() => {
    processFeedbackQueue(startupId, session).catch((error) => {
      console.error(`[${startupId}] Error scheduling feedback processing:`, error);
    });
  }, 0);
}

feedbackEvents.on('feedback', async (event: LiveFeedbackEvent) => {
  try {
    const session = await ensureStartupSession(event.startupId);
    session.feedbackQueue.push(event);

    dispatchStartupEvent(event.startupId, {
      type: 'live_feedback_received',
      feedback: event
    });

    scheduleFeedbackProcessing(event.startupId, session);
  } catch (error) {
    console.error(`[${event.startupId}] Failed to enqueue live feedback:`, error);
  }
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '');

    if (pathname?.startsWith('/ws/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Handle WebSocket connections
  wss.on('connection', async (ws: WebSocket, request) => {
    const { pathname } = parse(request.url || '');
    const startupId = pathname?.replace('/ws/', '');

    if (!startupId) {
      ws.close();
      return;
    }

    console.log(`WebSocket connected for startup ${startupId}`);
    activeConnections.set(startupId, ws);

    try {
      const session = await ensureStartupSession(startupId);

      // Load and send existing messages
      const startupPath = path.join(config.STARTUPS_DIR, startupId);
      const metadataFile = path.join(startupPath, 'startup.json');

      let existingMessages: unknown[] = [];
      let generationCompleted = false;

      try {
        const metadataContent = await fs.readFile(metadataFile, 'utf-8');
        const metadata = JSON.parse(metadataContent) as { messages?: unknown[]; generationCompleted?: boolean };
        existingMessages = metadata.messages ?? [];
        generationCompleted = metadata.generationCompleted ?? false;
      } catch {
        // No metadata file yet
      }

      // Send connection success with existing data
      safeSend(ws, {
        type: 'connected',
        startup_id: startupId,
        messages: existingMessages,
        generationCompleted,
        isGenerating: session.isGenerating,
        currentPrompt: session.currentPrompt ?? null
      });

      flushPendingUpdates(startupId, ws);

      // Listen for messages
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          const messageType = message.type;

          if (messageType === 'generate') {
            const prompt = message.prompt;

            const sessionForStartup = startupSessions.get(startupId);
            if (!sessionForStartup) {
              console.error(`No startup session found for ${startupId}`);
              return;
            }

            sessionForStartup.isGenerating = true;
            sessionForStartup.currentPrompt = prompt;
            sessionForStartup.pendingUpdates = [];

            dispatchStartupEvent(startupId, {
              type: 'generation_started',
              prompt
            });

            try {
              console.log(`[${startupId}] Starting code generation for prompt:`, prompt);
              let messageCount = 0;

              for await (const response of sessionForStartup.agent.generateCode(prompt)) {
                messageCount++;
                console.log(`[${startupId}] Agent message #${messageCount}:`, JSON.stringify(response, null, 2));

                dispatchStartupEvent(startupId, {
                  type: 'generation_update',
                  data: response
                });
              }

              console.log(`[${startupId}] Generation complete! Sent ${messageCount} messages`);
              sessionForStartup.isGenerating = false;
              sessionForStartup.currentPrompt = undefined;
              dispatchStartupEvent(startupId, {
                type: 'generation_complete'
              });
              scheduleFeedbackProcessing(startupId, sessionForStartup);
            } catch (error) {
              console.error('Error during code generation:', error);
              sessionForStartup.isGenerating = false;
              sessionForStartup.currentPrompt = undefined;
              dispatchStartupEvent(startupId, {
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
              });
              scheduleFeedbackProcessing(startupId, sessionForStartup);
            }
          } else if (messageType === 'chat') {
            const chatMessage = message.message;

            try {
              const sessionForStartup = startupSessions.get(startupId);
              if (!sessionForStartup) {
                console.error(`No startup session found for ${startupId}`);
                return;
              }

              sessionForStartup.isGenerating = true;

              for await (const response of sessionForStartup.agent.chat(chatMessage)) {
                dispatchStartupEvent(startupId, {
                  type: 'chat_update',
                  data: response
                });
              }

              sessionForStartup.isGenerating = false;

              dispatchStartupEvent(startupId, {
                type: 'chat_complete'
              });
              scheduleFeedbackProcessing(startupId, sessionForStartup);
            } catch (error) {
              console.error('Error during chat:', error);
              const sessionForStartup = startupSessions.get(startupId);
              if (sessionForStartup) {
                sessionForStartup.isGenerating = false;
              }

              dispatchStartupEvent(startupId, {
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
              });
              if (sessionForStartup) {
                scheduleFeedbackProcessing(startupId, sessionForStartup);
              }
            }          } else if (messageType === 'ping') {
            if (!safeSend(ws, { type: 'pong' })) {
              console.log('Failed to send pong, connection likely closed');
            }
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket disconnected for startup ${startupId}`);
        activeConnections.delete(startupId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close();
    }
  });

  server.listen(port, async () => {
    console.log(`✓ Server starting on http://${hostname}:${port}`);
    console.log(`✓ Startups directory: ${config.STARTUPS_DIR}`);

    // Start deployment monitor
    deploymentMonitor.start();
    console.log(`✓ Deployment monitor started`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    deploymentMonitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    deploymentMonitor.stop();
    process.exit(0);
  });
});

function dispatchStartupEvent(startupId: string, data: StartupEventPayload) {
  const ws = activeConnections.get(startupId);

  if (ws && ws.readyState === WebSocket.OPEN) {
    safeSend(ws, data);
    return;
  }

  const session = startupSessions.get(startupId);
  if (session) {
    session.pendingUpdates.push(data);
  }
}

function flushPendingUpdates(startupId: string, ws: WebSocket) {
  const session = startupSessions.get(startupId);

  if (!session || session.pendingUpdates.length === 0) {
    return;
  }

  const queue = [...session.pendingUpdates];
  session.pendingUpdates = [];

  for (let i = 0; i < queue.length; i++) {
    const update = queue[i];
    const success = safeSend(ws, update);

    if (!success) {
      session.pendingUpdates = queue.slice(i);
      break;
    }
  }
}

/**
 * Safely send data through WebSocket if connection is still open
 */
function safeSend(ws: WebSocket, data: StartupEventPayload): boolean {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    } else {
      console.log(`WebSocket not open (state: ${ws.readyState}), cannot send:`, data.type);
      return false;
    }
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
    return false;
  }
}
