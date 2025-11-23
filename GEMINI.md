# Gemini Context: News Cartoon Generator

## Project Overview

**News Cartoon** is a React + TypeScript web application that fetches news based on location or keywords and generates editorial cartoon concepts, scripts, and images using the Google Gemini API.

### Core Technology Stack
-   **Frontend:** React, TypeScript, Vite
-   **Styling:** Tailwind CSS
-   **State Management:** Zustand
-   **Backend:** Express (Proxy server for Google News RSS)
-   **AI Integration:** Google Gemini API (Text & Image)
-   **Database/Auth:** Supabase (client configured, usage to be verified)
-   **Testing:** Vitest (Unit), Playwright (E2E), MSW (Mocking)

### Architecture Highlights
-   **Services (`src/services/`)**: Handle API integrations (News, Gemini, Location). Implement caching and retry logic.
-   **Stores (`src/store/`)**: Manage application state. Separated by domain (`newsStore`, `cartoonStore`, etc.).
-   **Components (`src/components/`)**: Feature-based organization.
-   **Proxy Server**: An Express server runs on port 3001 to proxy Google News RSS requests, avoiding CORS issues.

## Key Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts both the Vite dev server (port 5173) and the Express proxy (port 3001). |
| `npm run build` | Compiles TypeScript and bundles the application with Vite. |
| `npm test` | Runs unit tests using Vitest in watch mode. |
| `npm run test:ui` | Opens the Vitest UI dashboard. |
| `npm run test:coverage` | Generates a test coverage report. |
| `npm run lint` | Runs ESLint. |
| `npx playwright test` | Runs E2E tests (check `package.json` for specific scripts if added). |

## Development Conventions

-   **Three-Layer Architecture**: Keep strict separation between Components (UI), Stores (State), and Services (Logic/API).
-   **Error Handling**: Use the established `create[Type]Error` factories in `src/types/error.ts`.
-   **Styling**: Use Tailwind CSS utility classes.
-   **Testing**:
    -   Unit tests for logic/components using Vitest + Testing Library.
    -   E2E tests for critical user flows using Playwright.
    -   Mock external APIs using MSW.

## Task Management (Task Master)

This project uses **Task Master** for task tracking.

-   **Task Files**: Located in `.taskmaster/tasks/`.
-   **MCP Integration**: Use the available MCP tools to manage tasks.
    -   `get_tasks`: List tasks.
    -   `next_task`: Find the next task.
    -   `get_task`: Get details for a specific task.
    -   `set_task_status`: Update task status.
    -   `add_task` / `update_task`: Manage task definitions.
-   **Workflow**:
    1.  Check for pending tasks using `next_task` or `get_tasks`.
    2.  Read task details with `get_task`.
    3.  Implement changes.
    4.  Update status to `done` using `set_task_status`.

## Directory Structure

-   `src/`: Source code.
    -   `components/`: React components.
    -   `hooks/`: Custom React hooks.
    -   `pages/`: Route components.
    -   `services/`: Business logic and API services.
    -   `store/`: Zustand stores.
    -   `types/`: TypeScript type definitions.
    -   `utils/`: Helper functions.
-   `e2e/`: Playwright end-to-end tests.
-   `api/`: Backend logic (Express server files).
-   `.taskmaster/`: Project management data.
