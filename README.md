# LLM Whiteboard

A collaborative whiteboard web application with integrated LLM assistance, inspired by Figma and Miro. Create sticky notes, text boxes, shapes, and connect them with lines—all while leveraging AI to brainstorm and organize ideas.

![Demo](https://github.com/Kuroakira/llm_wb/blob/main/llm_wb_demo.gif)

## ✨ Features

### Core Functionality
- **Sticky Notes**: Create, edit, drag, resize, and color-code notes
- **Text Elements**: Add standalone text boxes with custom formatting
- **Shapes**: Draw rectangles with customizable fill and stroke
- **Connectors**: Link elements with auto-following lines that snap to edges
- **Selection**: Single-click or drag-lasso to select multiple elements
- **Undo/Redo**: 20-step history with Cmd/Ctrl+Z shortcuts

### AI Integration
- **LLM Chat Panel**: Built-in AI assistant (Claude by Anthropic)
- **Instant Sticky Notes**: AI responses automatically appear as sticky notes on the canvas
- **300-character Summaries**: Concise answers optimized for whiteboard brainstorming

### Productivity Features
- **Auto-save**: 1-second debounced localStorage persistence
- **Zoom & Pan**: Mouse wheel zoom, spacebar for pan mode
- **Export**: Save your work as JSON or PNG
- **Keyboard Shortcuts**: Delete, Undo/Redo, and tool switching

## 🎥 How to Use

### Basic Workflow

1. **Select a Tool**: Click on the toolbar buttons (Sticky, Text, Rectangle, Line)
2. **Create Elements**: Click on the canvas to place elements
3. **Edit Content**: Double-click sticky notes or text boxes to edit
4. **Move & Resize**: Drag elements or use resize handles
5. **Connect Ideas**: Use the Line tool to connect sticky notes
6. **Ask AI**: Type questions in the left panel—answers appear as sticky notes

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Delete selected | `Delete` |
| Undo | `Cmd/Ctrl + Z` |
| Redo | `Cmd/Ctrl + Shift + Z` |
| Pan mode | `Space` (hold) |
| Zoom | `Mouse Wheel` |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd llm_wb

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
```

### Development

```bash
# Start the development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Testing

```bash
# Run unit and component tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:cov

# Generate E2E test code
npm run e2e:codegen
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 14+ (App Router), React 18, TypeScript
- **Canvas**: Konva / react-konva for high-performance rendering
- **State Management**: Zustand with Immer for immutability
- **LLM**: LangChain (JS) + Anthropic Claude
- **Testing**: Vitest, Testing Library, Playwright, MSW
- **Validation**: Zod for API I/O contracts

### Project Structure

```
/
├── app/
│   ├── api/llm/route.ts        # LLM API endpoint
│   └── page.tsx                # Main application page
├── src/
│   ├── canvas/                 # Canvas components
│   │   ├── CanvasStage.tsx
│   │   ├── shapes/             # Shape components
│   │   ├── tools/              # Toolbar & UI
│   │   └── hooks/              # Canvas hooks
│   ├── store/
│   │   └── boardStore.ts       # Zustand state
│   ├── lib/
│   │   ├── geometry.ts         # Pure functions
│   │   ├── llm.ts              # API client
│   │   └── persistence.ts      # localStorage
│   └── types.ts                # TypeScript types
└── tests/
    ├── e2e/                    # Playwright E2E
    ├── component/              # React Testing Library
    └── unit/                   # Vitest unit tests
```

### Design Principles

- **Test-Driven Development**: Outside-in TDD with E2E → Component → Unit tests
- **Pure Functions**: Geometry and calculations are side-effect free
- **State Externalization**: All canvas operations go through Zustand store
- **I/O Isolation**: LLM calls, localStorage, and exports are isolated adapters

## 🧪 Testing Strategy

Following t-wada's TDD philosophy with a test pyramid:

- **E2E (Playwright)**: Critical user journeys (create, edit, connect, LLM, save/load)
- **Component (Testing Library)**: UI behavior and user interactions
- **Unit (Vitest)**: Pure functions, geometry, store logic

```bash
# Example: Run specific test suites
npx vitest geometry          # Geometry tests only
npx playwright test --headed # E2E with browser UI
```

## 🔒 Security

- **API Key Protection**: Anthropic API key stored server-side only
- **Input Validation**: Zod schemas validate all API requests
- **Prompt Constraints**: System message fixed to prevent injection
- **Rate Limiting**: (Planned) 1 req/sec per IP

## 📝 Environment Variables

Create `.env.local` from `.env.local.example`:

```bash
# LLM Configuration
ANTHROPIC_API_KEY=sk-ant-your-key-here
LLM_MODEL=claude-3-7-sonnet-20250219
MOCK_LLM=0  # Set to 1 for testing without API calls
```

## 🎯 Roadmap

### MVP (Current)
- ✅ Sticky notes, text, rectangles
- ✅ Connectors with auto-snap
- ✅ LLM chat integration
- ✅ Undo/Redo with 20-step history
- ✅ localStorage persistence
- ✅ JSON/PNG export

### Planned Features
- Image attachments
- Auto-routing for connectors
- Real-time collaboration (WebSocket)
- Cloud persistence
- More shape types
- Collaborative cursors

## 🐛 Known Issues

- IME editing overlay optimization (Konva + contentEditable alignment)
- Range selection lasso performance with many elements
- Undo/Redo compression for drag bursts
- PNG export resolution control

## 🤝 Contributing

This project follows TDD practices:

1. Write failing E2E test first
2. Add component tests for UI behavior
3. Implement with unit tests for logic
4. Keep tests green, refactor in small steps
5. Optional: Use TCR (Test-Commit-Revert) workflow

## 📄 License

MIT

## 🙏 Acknowledgments

- Built with [Konva](https://konvajs.org/) for canvas rendering
- Powered by [Anthropic Claude](https://www.anthropic.com/) for AI assistance
- Inspired by [Figma](https://www.figma.com/) and [Miro](https://miro.com/)

---

**Note**: This is an MVP. The AI assistant is designed for brainstorming and generates 300-character summaries to keep your whiteboard organized. For detailed conversations, use the full Claude interface.
