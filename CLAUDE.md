# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Code Generator is a full-stack web application that uses Claude AI to generate vanilla HTML/CSS/JavaScript websites through a natural language interface. Users describe what they want to build, and Claude generates complete, modern web applications with real-time streaming updates.

**Tech Stack**: Next.js 15, React 19, TypeScript, Claude Agent SDK, WebSocket

## Development Commands

### Server Operations
```bash
npm run dev      # Start development server with hot reload (uses tsx watch)
npm run build    # Build Next.js for production
npm start        # Run production server
npm run lint     # Run ESLint
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
```

## Architecture

### WebSocket Server (`server.ts`)
The application runs a **custom Node.js HTTP server** that handles both Next.js requests and WebSocket connections. This is NOT a standard Next.js server.

- **HTTP Server**: Wraps Next.js app.getRequestHandler() to serve the web UI
- **WebSocket Server**: Handles upgrade requests on `/ws/{projectId}` paths
- **Connection Management**: Maintains active agents and WebSocket connections in Map structures
- **Message Types**: `generate` (initial code generation), `chat` (follow-up refinements), `ping/pong` (keep-alive)

**Important**: Changes to server.ts require restarting `npm run dev`. The tsx watch will auto-restart.

### Claude Agent Integration (`lib/agent.ts`)
Uses `@anthropic-ai/claude-agent-sdk` to create an AI agent with custom MCP tools:

- **CodeGeneratorAgent**: Main agent class that wraps Claude SDK
- **MCP Tools**: Custom tools for file operations (create_file, update_file, read_file, list_files, create_directory, run_command, get_project_structure)
- **Streaming**: Uses AsyncGenerator pattern to yield real-time updates during code generation
- **System Prompt**: Enforces vanilla HTML/CSS/JS (no frameworks, no build tools)

**Key Constraint**: The agent is specifically designed to generate vanilla web apps that run directly in browsers without compilation. Never suggest or allow framework-based solutions.

### File Operations (`lib/agent-tools.ts`)
The `CodeGeneratorTools` class handles all file system operations within generated projects:

- **Path Sanitization**: Automatically strips project paths, absolute paths, and "projects/" prefixes from AI-generated file paths
- **Project Isolation**: All operations are scoped to `projects/{projectId}/` directory
- **Recursive Operations**: Supports walking directory trees for listing files and generating project structure

**Common Issue**: If the AI tries to use absolute paths like `/Users/.../projects/...` or includes the project ID in paths, the sanitizePath() method will handle it automatically.

### Frontend Architecture

#### State Management
- **WebSocket Hook** (`hooks/useWebSocket.ts`): Central state management for real-time communication
  - Handles connection lifecycle with auto-reconnect (max 5 attempts with exponential backoff)
  - Manages message history and saves to backend via `/api/projects/{id}/messages`
  - Implements ping/pong keep-alive every 30 seconds
  - Tracks `isGenerating` and `generationCompleted` states

#### Component Structure
- **Page** (`app/page.tsx`): Main layout using react-resizable-panels
- **FileExplorer**: Tree view of generated files
- **CodeEditor**: Monaco editor for viewing generated code
- **Preview**: iframe preview of generated HTML
- **ChatPanel**: Chat interface for refinements
- **NewProjectModal**: Project creation dialog

### API Routes
All routes follow Next.js 15 App Router conventions (route.ts files):

- `GET/POST /api/projects` - List/create projects
- `DELETE /api/projects/[id]` - Delete project
- `POST /api/projects/[id]/complete` - Mark generation complete
- `POST /api/projects/[id]/messages` - Save chat messages
- `GET /api/projects/[id]/files/[...path]` - Read generated files
- `GET /api/projects/[id]/preview/[...path]` - Serve preview files (sets correct MIME types)

## Project Storage

Generated projects are stored in `projects/` directory (configurable via PROJECTS_DIR env var):
```
projects/
└── {project-id}/
    ├── project.json          # Metadata (name, description, messages, generationCompleted)
    ├── index.html            # Generated files
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

**Note**: The `projects/` directory is git-ignored. Each project has a unique UUID.

## Configuration (`lib/config.ts`)

Environment variables:
- `ANTHROPIC_API_KEY` - Required for Claude API access
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `PROJECTS_DIR` - Custom projects directory (default: ./projects)
- `NODE_PATH` / `NPM_PATH` - Node.js paths (for future extensibility)

**Model**: Uses `claude-sonnet-4-5-20250929` (configured in config.ts)

## Development Guidelines

### When Working with Agent Prompts
The system prompts in `lib/agent.ts` are critical for output quality:
- `generateCode()` prompt enforces vanilla HTML/CSS/JS constraints
- `chat()` prompt includes reminders about framework restrictions
- Both emphasize modern CSS (Grid, Flexbox, animations), ES6+ JavaScript, and responsive design

**If modifying prompts**: Test thoroughly to ensure the AI continues generating browser-ready code without build steps.

### WebSocket Message Flow
1. Client connects → Server sends `connected` with existing messages
2. Client sends `generate` → Server responds with `generation_started`, multiple `generation_update`, then `generation_complete`
3. Client sends `chat` → Server responds with multiple `chat_update`, then `chat_complete`
4. Errors trigger `error` type messages

### Common Debugging
- **WebSocket disconnects**: Check browser console for readyState, verify ping/pong messages
- **Files not appearing**: Check server logs for path sanitization messages (`[Tools] Creating file:`)
- **Agent errors**: Look for `[{projectId}] Agent message` logs in server console
- **Preview not loading**: Check `/api/projects/[id]/preview/[...path]` MIME type handling
- **"Cannot read properties of undefined (reading 'trim')"**: This error indicates the AI is calling file tools without required parameters. All tool handlers now validate arguments and return helpful error messages.

### TypeScript Paths
Uses `@/*` path alias mapping to project root (configured in tsconfig.json).

## Testing Workflow

To test end-to-end:
1. Start server: `npm run dev`
2. Open http://localhost:3000
3. Create new project with simple prompt (e.g., "create a todo list app")
4. Monitor server console for agent messages and file creation logs
5. Verify files appear in FileExplorer and preview renders correctly
6. Test chat refinements (e.g., "add a dark mode toggle")

## Important Constraints

- **No React/Vue/Angular**: Generated code must be vanilla web tech
- **No Build Tools**: No webpack, vite, npm dependencies in generated projects
- **Browser-Only**: Everything must run directly in browser via file:// or static server
- **File Paths**: Always use relative paths in generated code (css/style.css not /css/style.css)
