/**
 * Claude Agent integration for code generation
 */
import { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import { CodeGeneratorTools } from './agent-tools';
import { config } from './config';

export interface StreamMessage {
  type: 'text' | 'tool_use' | 'result' | 'error' | 'thinking';
  content?: string;
  tool?: string;
  input?: any;
  result?: any;
}

/**
 * AI Agent for generating code using Claude Agent SDK
 */
export class CodeGeneratorAgent {
  private projectId: string;
  private projectPath: string;
  private tools: CodeGeneratorTools;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.projectPath = path.join(config.PROJECTS_DIR, projectId);
    this.tools = new CodeGeneratorTools(this.projectPath);
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
        async (args: any) => {
          if (!args?.file_path) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: file_path' }, null, 2) }
              ]
            };
          }
          if (!args?.content) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: content' }, null, 2) }
              ]
            };
          }
          const result = await tools_instance.createFile(args.file_path, args.content);
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
        async (args: any) => {
          if (!args?.file_path) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: file_path' }, null, 2) }
              ]
            };
          }
          if (!args?.content) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: content' }, null, 2) }
              ]
            };
          }
          const result = await tools_instance.updateFile(args.file_path, args.content);
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
        async (args: any) => {
          if (!args?.file_path) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: file_path' }, null, 2) }
              ]
            };
          }
          const result = await tools_instance.readFile(args.file_path);
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      ),

      tool(
        'list_files',
        'List all files in the project or a specific directory',
        {
          directory: {
            type: 'string',
            description: 'Relative path to the directory (default: \'.\')'
          }
        },
        async (args: any) => {
          const directory = args?.directory || '.';
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
        async (args: any) => {
          if (!args?.dir_path) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: dir_path' }, null, 2) }
              ]
            };
          }
          const result = await tools_instance.createDirectory(args.dir_path);
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      ),

      tool(
        'run_command',
        'Run a shell command in the project directory',
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
        async (args: any) => {
          if (!args?.command) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ success: false, message: 'Missing required parameter: command' }, null, 2) }
              ]
            };
          }
          const command = args.command;
          const cwd = args?.cwd || '.';
          const result = await tools_instance.runCommand(command, cwd);
          return {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
          };
        }
      ),

      tool(
        'get_project_structure',
        'Get the complete project file structure as a tree',
        {},
        async (args: any) => {
          const result = tools_instance.getProjectStructure();
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
- list_files: List project files
- create_directory: Create directories
- get_project_structure: View project structure

IMPORTANT: When creating files, use ONLY relative paths from the project root.
Examples:
  - "index.html" (for root file)
  - "css/style.css" (for file in subdirectory)
  - "js/app.js" (for file in subdirectory)

DO NOT use absolute paths or include the project directory path in file names.

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
            'mcp__code_gen__get_project_structure'
          ],
          cwd: this.projectPath,
          permissionMode: 'acceptEdits'
        }
      });

      // Stream each message
      for await (const message of queryResult) {
        if (message.type === 'assistant' && 'message' in message) {
          // SDKAssistantMessage
          const assistantMsg = message as any;
          if (assistantMsg.message?.content) {
            for (const block of assistantMsg.message.content) {
              if (block.type === 'text') {
                yield {
                  type: 'text',
                  content: block.text
                };
              } else if (block.type === 'tool_use') {
                yield {
                  type: 'tool_use',
                  tool: block.name,
                  input: block.input
                };
              }
            }
          }
        } else if (message.type === 'result' && 'result' in message) {
          // Tool result
          yield {
            type: 'result',
            result: (message as any).result
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
            'mcp__code_gen__get_project_structure'
          ],
          cwd: this.projectPath,
          permissionMode: 'acceptEdits'
        }
      });

      for await (const msg of queryResult) {
        if (msg.type === 'assistant' && 'message' in msg) {
          const assistantMsg = msg as any;
          if (assistantMsg.message?.content) {
            for (const block of assistantMsg.message.content) {
              if (block.type === 'text') {
                yield {
                  type: 'text',
                  content: block.text
                };
              } else if (block.type === 'tool_use') {
                yield {
                  type: 'tool_use',
                  tool: block.name,
                  input: block.input
                };
              }
            }
          }
        } else if (msg.type === 'result' && 'result' in msg) {
          yield {
            type: 'result',
            result: (msg as any).result
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
    // Ensure project directory exists
    await this.tools.createDirectory('.');
  }

  /**
   * Clean up resources (if needed)
   */
  async cleanup(): Promise<void> {
    // Cleanup logic if needed
  }
}
