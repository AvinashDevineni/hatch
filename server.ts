import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs/promises';
import path from 'path';
import { CodeGeneratorAgent } from './lib/agent';
import { config } from './lib/config';

const dev = process.env.NODE_ENV !== 'production';
const hostname = config.HOST;
const port = config.PORT;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Active projects and WebSocket connections
const activeProjects = new Map<string, CodeGeneratorAgent>();
const activeConnections = new Map<string, WebSocket>();

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
    const projectId = pathname?.replace('/ws/', '');

    if (!projectId) {
      ws.close();
      return;
    }

    console.log(`WebSocket connected for project ${projectId}`);
    activeConnections.set(projectId, ws);

    try {
      // Create or get agent for this project
      let agent = activeProjects.get(projectId);

      if (!agent) {
        agent = new CodeGeneratorAgent(projectId);
        await agent.initialize();
        activeProjects.set(projectId, agent);
      }

      // Load and send existing messages
      const projectPath = path.join(config.PROJECTS_DIR, projectId);
      const metadataFile = path.join(projectPath, 'project.json');

      let existingMessages: any[] = [];
      let generationCompleted = false;

      try {
        const metadataContent = await fs.readFile(metadataFile, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        existingMessages = metadata.messages || [];
        generationCompleted = metadata.generationCompleted || false;
      } catch (error) {
        // No metadata file yet
      }

      // Send connection success with existing data
      safeSend(ws, {
        type: 'connected',
        project_id: projectId,
        messages: existingMessages,
        generationCompleted
      });

      // Listen for messages
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          const messageType = message.type;

          if (messageType === 'generate') {
            const prompt = message.prompt;

            safeSend(ws, {
              type: 'generation_started',
              prompt
            });

            try {
              console.log(`[${projectId}] Starting code generation for prompt:`, prompt);
              let messageCount = 0;

              for await (const response of agent!.generateCode(prompt)) {
                messageCount++;
                console.log(`[${projectId}] Agent message #${messageCount}:`, JSON.stringify(response, null, 2));

                if (!safeSend(ws, {
                  type: 'generation_update',
                  data: response
                })) {
                  console.log('Connection closed during generation, stopping');
                  break;
                }
              }

              console.log(`[${projectId}] Generation complete! Sent ${messageCount} messages`);
              safeSend(ws, {
                type: 'generation_complete'
              });
            } catch (error) {
              console.error('Error during code generation:', error);
              safeSend(ws, {
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          } else if (messageType === 'chat') {
            const chatMessage = message.message;

            try {
              for await (const response of agent!.chat(chatMessage)) {
                if (!safeSend(ws, {
                  type: 'chat_update',
                  data: response
                })) {
                  console.log('Connection closed during chat, stopping');
                  break;
                }
              }

              safeSend(ws, {
                type: 'chat_complete'
              });
            } catch (error) {
              console.error('Error during chat:', error);
              safeSend(ws, {
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          } else if (messageType === 'ping') {
            if (!safeSend(ws, { type: 'pong' })) {
              console.log('Failed to send pong, connection likely closed');
            }
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket disconnected for project ${projectId}`);
        activeConnections.delete(projectId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close();
    }
  });

  server.listen(port, () => {
    console.log(`✓ Server starting on http://${hostname}:${port}`);
    console.log(`✓ Projects directory: ${config.PROJECTS_DIR}`);
  });
});

/**
 * Safely send data through WebSocket if connection is still open
 */
function safeSend(ws: WebSocket, data: any): boolean {
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
