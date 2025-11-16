# Project Overview

This is a web application that generates cartoons based on local news. It determines the user's location, fetches relevant news articles from a Google News RSS feed, and then uses AI to generate cartoon concepts, scripts, and images.

**Main Technologies:**

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS
*   **Backend:** Node.js, Express (for local development), Vercel Serverless Functions (for production)
*   **State Management:** Zustand
*   **Routing:** React Router
*   **Testing:** Vitest (unit/integration), Playwright (end-to-end)

**Architecture:**

The application is a single-page application (SPA) with a separate backend for fetching news. The frontend is built with React and Vite, and the backend is a simple Node.js server that can be run locally or as a Vercel serverless function.

The frontend code is organized into components, pages, services, and stores.
- `components` contains reusable UI elements.
- `pages` contains the main pages of the application.
- `services` contains logic for interacting with the backend and other external services.
- `store` contains the Zustand stores for managing application state.

The backend consists of a single API endpoint that fetches news from a Google News RSS feed.

# Building and Running

**Development:**

To run the application in development mode, you need to run both the frontend and backend servers.

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development servers:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server for the frontend and the Express server for the backend.

**Production Build:**

To build the application for production, run the following command:

```bash
npm run build
```

This will create a `dist` directory with the optimized production build.

**Testing:**

*   **Unit & Integration Tests:**
    ```bash
    npm test
    ```

*   **End-to-End Tests (Playwright):**
    ```bash
    npx playwright test
    ```

# Development Conventions

*   **Coding Style:** The project uses ESLint to enforce a consistent coding style. You can run the linter with `npm run lint`.
*   **State Management:** Application state is managed with Zustand. Stores are located in the `src/store` directory.
*   **Styling:** The project uses Tailwind CSS for styling.
*   **Commits:** The project uses `husky` and `lint-staged` to run ESLint on staged files before committing.
*   **API:** The backend API is defined in `dev-server.js` for local development and `api/news/search.js` for Vercel deployment. The API endpoint is `/api/news/search`.
