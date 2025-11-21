# 🎨 News Cartoon

> Turn today's news into editorial cartoons with AI

News Cartoon is a React + TypeScript application that transforms local and trending news into witty editorial cartoons using Google's Gemini AI. Simply enter your location or a topic, and watch as current events become satirical multi-panel comic strips.

[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://newscartoon.lol/)

## ✨ Features

- **📍 Location-Based News**: Automatically fetch local news stories based on your location
- **🔍 Keyword Search**: Search for news on any topic or trending subject
- **🎭 AI-Powered Cartoons**: Generate editorial cartoons with Google Gemini 2.0 Flash
- **🖼️ Multi-Panel Comics**: Create professional comic strips with custom panel layouts
- **😄 Humor Enhancement**: Built-in humor scoring ensures genuinely funny results
- **⚡ Smart Caching**: Intelligent caching for both news and generated images
- **🎨 Modern UI**: Clean, responsive interface built with Tailwind CSS
- **♿ Accessible**: Full keyboard navigation and screen reader support
- **🧪 Well-Tested**: 195+ tests covering unit, integration, and E2E scenarios

## 🚀 Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **State Management**: Zustand with localStorage persistence
- **Styling**: Tailwind CSS v4 with PostCSS
- **AI Integration**: Google Gemini 2.0 Flash & Vision API 2.5
- **Backend**: Express.js proxy server for news fetching
- **Testing**: Vitest + React Testing Library + Playwright
- **Build Tools**: TypeScript, ESLint, Husky

## 📋 Prerequisites

- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## 🛠️ Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/seansoreilly/news-cartoon.git
cd news-cartoon

# Install dependencies
npm install
```

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Add your Google Gemini API key to `.env.local`:
```env
VITE_GOOGLE_API_KEY=your_google_api_key_here
VITE_ENV=development
```

### Development

Start both the Vite dev server and Express backend:

```bash
npm run dev
```

This runs:
- Vite dev server on `http://localhost:5173`
- Express backend on `http://localhost:3001`

Or run them separately:
```bash
npm run dev:vite    # Vite only
npm run dev:server  # Backend only
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development servers (Vite + Express) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on all files |
| `npm test` | Run unit tests in watch mode |
| `npm run test:ui` | Open Vitest UI dashboard |
| `npm run test:coverage` | Generate test coverage report |

## 🏗️ Project Structure

```
news-cartoon/
├── src/
│   ├── components/       # React components
│   │   ├── cartoon/      # Cartoon generation UI
│   │   ├── common/       # Reusable components
│   │   ├── layout/       # Layout components
│   │   ├── location/     # Location detection
│   │   └── news/         # News display
│   ├── services/         # API integration layer
│   │   ├── geminiService.ts   # Gemini AI integration
│   │   ├── newsService.ts     # News fetching
│   │   └── locationService.ts # Location detection
│   ├── store/            # Zustand state management
│   │   ├── cartoonStore.ts
│   │   ├── newsStore.ts
│   │   ├── locationStore.ts
│   │   └── preferencesStore.ts
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Helper functions
│   └── pages/            # Page components
├── dev-server.js         # Express backend proxy
├── e2e/                  # Playwright E2E tests
└── public/               # Static assets
```

## 🧪 Testing

The project has comprehensive test coverage across multiple layers:

- **Unit Tests**: 40+ tests for services, stores, and utilities
- **Component Tests**: 60+ tests for React components
- **Integration Tests**: 15+ tests for workflows
- **E2E Tests**: 80+ tests for user journeys, accessibility, and performance

```bash
# Run unit and component tests
npm test

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run E2E tests (requires build)
npm run build
npx playwright test
```

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## 🎯 How It Works

1. **News Fetching**: Express backend proxies Google News RSS feeds to avoid CORS issues
2. **Concept Generation**: Gemini AI analyzes news articles and generates 5 cartoon concepts
3. **User Selection**: User picks their favorite concept
4. **Script Creation**: AI generates detailed panel-by-panel scripts with dialogue
5. **Image Generation**: Gemini Vision API creates the final multi-panel cartoon
6. **Caching**: Both news (5-min TTL) and images (1-hour TTL) are cached

## 🔐 Security Features

- Environment variables for sensitive data
- Rate limiting on image generation (2 images/minute)
- Input validation and sanitization
- Error boundaries for graceful failure handling
- No secrets in client-side code

## 🚢 Deployment

The app is deployed on Netlify/Vercel with serverless functions:

```bash
# Build for production
npm run build

# Test production build locally
npm run preview
```

Configure serverless functions for the news proxy endpoint.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Run linter (`npm run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📝 Additional Documentation

- [CLAUDE.md](./CLAUDE.md) - Developer guide and architecture details
- [TESTING.md](./TESTING.md) - Comprehensive testing documentation
- [GEMINI.md](./GEMINI.md) - Gemini API integration guide

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Google Gemini AI](https://ai.google.dev/)
- News powered by Google News RSS
- Location services via OpenStreetMap and ipapi.co

---

**Made with ❤️ and lots of caffeine** ☕
