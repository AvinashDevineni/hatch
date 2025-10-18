# AI Code Generator - Next.js/TypeScript Edition

A full-stack web application generator powered by Claude AI, built with Next.js 15, TypeScript, and the Claude Agent SDK.

## 🎯 Features

- **Natural Language Code Generation**: Describe what you want to build in plain English
- **Real-time WebSocket Streaming**: See code being generated in real-time
- **Monaco Code Editor**: View generated code with syntax highlighting
- **Live Preview**: See your generated web application running instantly
- **Project Management**: Create, save, and manage multiple projects
- **Chat Interface**: Iteratively refine your generated code
- **TypeScript Throughout**: Fully typed for better developer experience

## 🏗️ Architecture

### Backend
- **Next.js 15 App Router**: Modern React framework with server components
- **Custom Node.js WebSocket Server**: Real-time bidirectional communication
- **Claude Agent SDK (TypeScript)**: AI-powered code generation with MCP tools
- **TypeScript**: Type-safe backend logic

### Frontend
- **React 19**: Latest React with concurrent features
- **Monaco Editor**: VS Code's editor component for code viewing
- **Tailwind CSS 4**: Utility-first CSS framework
- **Resizable Panels**: Customizable workspace layout
- **Lucide Icons**: Beautiful, consistent iconography

## 📦 Installation

1. **Navigate to the Next.js app:**
   \`\`\`bash
   cd nextjs-app
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables:**
   \`\`\`bash
   cp .env.example .env
   \`\`\`

   Edit \`.env\` and add your Anthropic API key:
   \`\`\`
   ANTHROPIC_API_KEY=your_api_key_here
   PORT=3000
   HOST=0.0.0.0
   \`\`\`

4. **Run the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Open your browser:**
   Navigate to \`http://localhost:3000\`

## 🚀 Usage

1. **Create a New Project**: Click "New Project" and describe what you want to build
2. **View Generated Code**: Browse files in the File Explorer
3. **See Live Preview**: Generated HTML appears in the Preview panel
4. **Refine with Chat**: Use the chat panel to request modifications

## 📁 Project Structure

\`\`\`
nextjs-app/
├── app/                        # Next.js app directory
│   ├── api/                   # API routes
│   └── page.tsx              # Main application page
├── components/                # React components
├── hooks/                     # Custom React hooks
├── lib/                       # Utility libraries
│   ├── agent.ts              # Claude Agent SDK integration
│   ├── agent-tools.ts        # File operation tools
│   └── config.ts             # Configuration
└── server.ts                  # Custom WebSocket server
\`\`\`

## 🔧 API Endpoints

### REST API
- \`GET /api/health\` - Health check
- \`GET /api/projects\` - List projects
- \`POST /api/projects\` - Create project
- \`DELETE /api/projects/[id]\` - Delete project

### WebSocket
- \`WS /ws/[projectId]\` - Real-time code generation

## 🛠️ Development

\`\`\`bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
\`\`\`

## 📝 License

This project is provided as-is for educational purposes.

---

**Built with ❤️ using Claude AI and Next.js**
