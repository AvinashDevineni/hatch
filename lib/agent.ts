/**
 * Claude Agent integration for code generation
 */
import { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import { CodeGeneratorTools } from './agent-tools';
import { config } from './config';
import { VercelDeployment } from './vercel-deployment';

export interface StreamMessage {
  type: 'text' | 'tool_use' | 'result' | 'error' | 'thinking';
  content?: string;
  tool?: string;
  input?: ToolInvocation;
  result?: unknown;
}

export type ToolInvocation = Record<string, unknown>;

type ToolUseBlock = {
  type: 'tool_use';
  name: string;
  input?: ToolInvocation;
};

type TextBlock = {
  type: 'text';
  text: string;
};

type AssistantStreamMessage = {
  type: 'assistant';
  message?: {
    content?: Array<ToolUseBlock | TextBlock>;
  };
};

type ToolResultStreamMessage = {
  type: 'result';
  result?: unknown;
};

function isAssistantStreamMessage(value: unknown): value is AssistantStreamMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.type !== 'assistant') {
    return false;
  }
  const message = record.message;
  if (message !== undefined) {
    if (typeof message !== 'object' || message === null) {
      return false;
    }
    const content = (message as Record<string, unknown>).content;
    if (content !== undefined && !Array.isArray(content)) {
      return false;
    }
  }
  return true;
}

function isToolResultStreamMessage(value: unknown): value is ToolResultStreamMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (value as { type?: unknown }).type === 'result';
}

/**
 * AI Agent for generating code using Claude Agent SDK
 */
export class CodeGeneratorAgent {
  private startupId: string;
  private startupPath: string;
  private tools: CodeGeneratorTools;
  private vercelDeployment: VercelDeployment;

  constructor(startupId: string) {
    this.startupId = startupId;
    this.startupPath = path.join(config.STARTUPS_DIR, startupId);
    this.tools = new CodeGeneratorTools(this.startupPath);
    this.vercelDeployment = new VercelDeployment(this.startupPath);
  }

  /**
   * Create custom MCP tools for file operations
   */
  private createCustomTools() {
    const tools_instance = this.tools;

    return [
      tool(
        'create_file',
        'Create a new file with the given content',
        {
          file_path: {
            type: 'string',
            description: 'Relative path to the file'
          },
          content: {
            type: 'string',
            description: 'Content of the file'
          }
        },
        async (args: ToolInvocation) => {
          const filePath = typeof args.file_path === 'string' ? args.file_path : '';
          const content = typeof args.content === 'string' ? args.content : '';

          if (!filePath) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: file_path' }, null, 2) }
              ]
            };
          }
          if (!content) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: content' }, null, 2) }
              ]
            };
          }
          const result = await tools_instance.createFile(filePath, content);
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      ),

      tool(
        'update_file',
        'Update an existing file or create it if it doesn\'t exist',
        {
          file_path: {
            type: 'string',
            description: 'Relative path to the file'
          },
          content: {
            type: 'string',
            description: 'New content of the file'
          }
        },
        async (args: ToolInvocation) => {
          const filePath = typeof args.file_path === 'string' ? args.file_path : '';
          const content = typeof args.content === 'string' ? args.content : '';

          if (!filePath) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: file_path' }, null, 2) }
              ]
            };
          }
          if (!content) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: content' }, null, 2) }
              ]
            };
          }
          const result = await tools_instance.updateFile(filePath, content);
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      ),

      tool(
        'read_file',
        'Read the contents of a file',
        {
          file_path: {
            type: 'string',
            description: 'Relative path to the file'
          }
        },
        async (args: ToolInvocation) => {
          const filePath = typeof args.file_path === 'string' ? args.file_path : '';

          if (!filePath) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: file_path' }, null, 2) }
              ]
            };
          }
          const result = await tools_instance.readFile(filePath);
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      ),

      tool(
        'list_files',
        'List all files in the startup or a specific directory',
        {
          directory: {
            type: 'string',
            description: 'Relative path to the directory (default: \'.\')'
          }
        },
        async (args: ToolInvocation) => {
          const directory = typeof args.directory === 'string' && args.directory.trim().length > 0 ? args.directory : '.';
          const result = await tools_instance.listFiles(directory);
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      ),

      tool(
        'create_directory',
        'Create a new directory',
        {
          dir_path: {
            type: 'string',
            description: 'Relative path to the directory'
          }
        },
        async (args: ToolInvocation) => {
          const dirPath = typeof args.dir_path === 'string' ? args.dir_path : '';

          if (!dirPath) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: dir_path' }, null, 2) }
              ]
            };
          }
          const result = await tools_instance.createDirectory(dirPath);
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      ),

      tool(
        'run_command',
        'Run a shell command in the startup directory',
        {
          command: {
            type: 'string',
            description: 'Command to run'
          },
          cwd: {
            type: 'string',
            description: 'Working directory (default: \'.\')'
          }
        },
        async (args: ToolInvocation) => {
          const command = typeof args.command === 'string' ? args.command : '';
          const cwd = typeof args.cwd === 'string' && args.cwd.trim().length > 0 ? args.cwd : '.';

          if (!command) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: command' }, null, 2) }
              ]
            };
          }
          const result = await tools_instance.runCommand(command, cwd);
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      ),

      tool(
        'get_startup_structure',
        'Get the complete startup file structure as a tree',
        {},
        async () => {
          const result = tools_instance.getStartupStructure();
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      ),

      tool(
        'deploy_to_vercel',
        'Deploy the startup to Vercel. This will automatically run "vercel link --yes" followed by "vercel --prod --yes". Assumes "vercel login" has been run beforehand. Call this as the final step after building the application.',
        {},
        async () => {
          console.log('[Agent] deploy_to_vercel tool called for startup:', this.startupId);
          const result = await this.vercelDeployment.deploy();
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      )
    ];
  }

  /**
   * Generate code based on a user prompt
   */
  async *generateCode(prompt: string): AsyncGenerator<StreamMessage> {
    const customTools = this.createCustomTools();

    // Create MCP server with our custom tools
    const mcpServer = createSdkMcpServer({
      name: 'code-generator',
      version: '1.0.0',
      tools: customTools
    });

    // Enhanced system prompt
    const enhancedPrompt = `You are an expert frontend developer specializing in creating beautiful, modern web applications using vanilla HTML, CSS, and JavaScript.

User Request: ${prompt}

IMPORTANT CONSTRAINTS:
- Build ONLY with vanilla HTML, CSS, and JavaScript (no frameworks, no build tools, no Node.js)
- Create web apps that run directly in the browser without any compilation or build process
- DO NOT use React, Vue, Angular, or any other frameworks
- DO NOT create package.json, node_modules, or npm-related files
- DO NOT use JSX, TypeScript compilation, or preprocessors that need build steps

MANDATORY ANALYTICS & FEEDBACK INTEGRATIONS (NO EXCEPTIONS):
- Immediately READ "./startup.json" to obtain the startup metadata. Use the values under analyticsConfig (startupId, visitEndpoint, feedbackEndpoint, dashboardUrl, configurable rating questions, latestDeploymentUrl) in your implementation.
- Ship an analytics dashboard screen for the deployment that highlights real-time traction, prominently displays the MOST RECENT deployment URL returned by \`vercel --prod --yes\`, and summarizes live metrics (including visits in the past 24 hours and historical activity). The dashboard must be generated automatically for every site.
- Implement a page-load tracker that increments every time the page loads. Fire a POST to analyticsConfig.visitEndpoint on each load (e.g. with fetch or navigator.sendBeacon) so visits are persisted and feed the dashboard metrics.
- Add a small floating feedback/clipboard icon widget on every page by default. When opened, ask the star-rating questions from analyticsConfig.questions (1–5 scale) and one free-text question. Make sure the questions remain easy to reconfigure via metadata.
- Submitting the feedback must immediately POST the payload (ratings + comment + deployment URL) to analyticsConfig.feedbackEndpoint so the AI receives it in real time and can respond just like in the dashboard chat.
- Ensure the tracker, dashboard, and feedback widget remain functional after every change you make. NEVER remove these integrations or make them optional.
- Surface clear confirmations in the UI when analytics events or feedback submissions complete, and gracefully handle network failures so the data is retried or the user is notified.

Your task is to create a modern, fluid, and animated web application:

1. **Structure**:
   - Always start with an index.html file
   - Organize CSS in css/ folder and JavaScript in js/ folder
   - Keep the code clean and well-organized

2. **Modern UI/UX**:
   - Use modern CSS (Grid, Flexbox, CSS Variables, animations, transitions)
   - Implement smooth animations and transitions for a polished feel
   - Create responsive designs that work on all screen sizes
   - Use contemporary design patterns (cards, glassmorphism, gradients, shadows)
   - Make it feel interactive and dynamic, NOT like a static site

3. **JavaScript**:
   - Use modern ES6+ JavaScript features
   - Implement proper DOM manipulation and event handling
   - Add interactivity, state management, and dynamic content
   - Use localStorage for data persistence when appropriate
   - Utilize modern APIs (Fetch, Intersection Observer, etc.)

4. **Best Practices**:
   - Semantic HTML5 elements
   - Mobile-first responsive design
   - Accessible markup (ARIA labels, semantic structure)
   - Clean, commented code
   - Proper separation of concerns (HTML/CSS/JS)

Available tools:
- create_file: Create new files (use RELATIVE paths like "index.html" or "css/style.css")
- update_file: Update existing files
- read_file: Read file contents
- list_files: List startup files
- create_directory: Create directories
- get_startup_structure: View startup structure
- deploy_to_vercel: Deploy the startup to Vercel production

IMPORTANT: When creating files, use ONLY relative paths from the startup root.
Examples:
  - "index.html" (for root file)
  - "css/style.css" (for file in subdirectory)
  - "js/app.js" (for file in subdirectory)

DO NOT use absolute paths or include the startup directory path in file names.

DEPLOYMENT WORKFLOW:
Once you have finished building the application and are satisfied with it, call the deploy_to_vercel tool.
This will automatically run "vercel link --yes" and "vercel --prod --yes" to deploy your app.
The deployment URL will be returned in the response.

Start by creating an index.html file, then add CSS for styling (with animations/transitions), and JavaScript for interactivity.
Make it beautiful, modern, and fully functional!
`;

    try {
      // Use query with MCP server
      const queryResult = query({
        prompt: enhancedPrompt,
        options: {
          model: config.CLAUDE_MODEL,
          mcpServers: { code_gen: mcpServer },
          allowedTools: [
            'mcp__code_gen__create_file',
            'mcp__code_gen__update_file',
            'mcp__code_gen__read_file',
            'mcp__code_gen__list_files',
            'mcp__code_gen__create_directory',
            'mcp__code_gen__run_command',
            'mcp__code_gen__get_startup_structure',
            'mcp__code_gen__deploy_to_vercel'
          ],
          cwd: this.startupPath,
          permissionMode: 'acceptEdits'
        }
      }) as AsyncIterable<unknown>;

      // Stream each message
      for await (const message of queryResult) {
        if (isAssistantStreamMessage(message)) {
          const blocks = message.message?.content ?? [];
          for (const block of blocks) {
            if (block.type === 'text') {
              yield {
                type: 'text',
                content: block.text
              };
            } else if (block.type === 'tool_use') {
              yield {
                type: 'tool_use',
                tool: block.name,
                input: block.input ?? {}
              };
            }
          }
        } else if (isToolResultStreamMessage(message)) {
          yield {
            type: 'result',
            result: message.result
          };
        }
      }
    } catch (error) {
      console.error('Code generation error:', error);
      yield {
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Continue a conversation with follow-up messages
   */
  async *chat(message: string): AsyncGenerator<StreamMessage> {
    const customTools = this.createCustomTools();

    const mcpServer = createSdkMcpServer({
      name: 'code-generator',
      version: '1.0.0',
      tools: customTools
    });

    // Add reminder about vanilla HTML/CSS/JS constraints
    const enhancedMessage = `${message}

REMINDER: This is a vanilla HTML/CSS/JavaScript web application. When making changes:
- Use ONLY vanilla JavaScript (no frameworks, no build tools)
- Ensure all code runs directly in the browser
- DO NOT add package.json, npm dependencies, or require build steps
- Keep using modern CSS animations, transitions, and effects
- Maintain the clean separation of HTML, CSS, and JavaScript files
- KEEP the analytics dashboard, page-load tracker, and feedback widget intact. Continue using analyticsConfig.visitEndpoint and analyticsConfig.feedbackEndpoint from "./startup.json" for tracking and real-time feedback delivery.
`;

    try {
      const queryResult = query({
        prompt: enhancedMessage,
        options: {
          model: config.CLAUDE_MODEL,
          mcpServers: { code_gen: mcpServer },
          allowedTools: [
            'mcp__code_gen__create_file',
            'mcp__code_gen__update_file',
            'mcp__code_gen__read_file',
            'mcp__code_gen__list_files',
            'mcp__code_gen__create_directory',
            'mcp__code_gen__run_command',
            'mcp__code_gen__get_startup_structure',
            'mcp__code_gen__deploy_to_vercel'
          ],
          cwd: this.startupPath,
          permissionMode: 'acceptEdits'
        }
      }) as AsyncIterable<unknown>;

      for await (const msg of queryResult) {
        if (isAssistantStreamMessage(msg)) {
          const blocks = msg.message?.content ?? [];
          for (const block of blocks) {
            if (block.type === 'text') {
              yield {
                type: 'text',
                content: block.text
              };
            } else if (block.type === 'tool_use') {
              yield {
                type: 'tool_use',
                tool: block.name,
                input: block.input ?? {}
              };
            }
          }
        } else if (isToolResultStreamMessage(msg)) {
          yield {
            type: 'result',
            result: msg.result
          };
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      yield {
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Initialize the agent (if needed for persistent sessions)
   */
  async initialize(): Promise<void> {
    // Ensure startup directory exists
    await this.tools.createDirectory('.');
  }

  /**
   * Clean up resources (if needed)
   */
  async cleanup(): Promise<void> {
    // Cleanup logic if needed
  }
}
