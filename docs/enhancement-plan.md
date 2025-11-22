# UI Simplification & Enhancement Implementation Plan

This document outlines the technical findings and actionable next steps for the 6 enhancements identified in `UI_SIMPLIFICATION_SUGGESTIONS.md`. The plan is based on the project's current React, TypeScript, and Zustand architecture.

## 1. Streamlined Wizard Interface

**Goal:** Replace the current vertical stack of components with a guided, step-by-step wizard experience.

**Current State:**
- `HomePage.tsx` renders a linear list of components (`LocationDetector`, `NewsDisplay`, etc.) based on the presence of data in the stores (`locationStore`, `newsStore`).
- Navigation is implicit; scrolling down reveals the next step.

**Actionable Steps:**
1.  **Create `Wizard` Component:**
    -   Create `src/components/layout/Wizard.tsx`.
    -   Implement internal state: `const [currentStep, setCurrentStep] = useState(0);`.
    -   Define steps: `['Location', 'News Selection', 'Cartoon Creation']`.
2.  **Refactor `HomePage.tsx`:**
    -   Replace the conditional rendering logic with the `<Wizard />` component.
3.  **Step Implementation:**
    -   **Step 0 (Location):** Render `LocationDetector`. Auto-advance when location is found.
    -   **Step 1 (News):** Render `NewsDisplay`. Add a "Next" button that enables only when `selectedArticles.length > 0`.
    -   **Step 2 (Creation):** Render a new wrapper component `CartoonCreationStep` (see Enhancement 4).
4.  **State Integration:**
    -   Ensure the "Back" button preserves state (already handled by Zustand, so re-mounting components is safe).

## 2. Smart Defaults & Auto-Actions

**Goal:** Reduce manual clicks by automating obvious next steps.

**Current State:**
- User must manually select articles.
- User must manually click "Generate Concepts" after selecting news.
- User must manually click "Generate Script" and "Generate Image".

**Actionable Steps:**
1.  **Auto-Select News:**
    -   Modify `src/hooks/useNews.ts`.
    -   In the `useEffect` handling fetch results, sort articles by `humorScore` (descending).
    -   Automatically dispatch `setSelectedArticles(top3)` to `newsStore` if no selection exists.
2.  **Auto-Generate Concepts:**
    -   Modify `src/components/cartoon/ConceptGenerator.tsx`.
    -   Add a `useEffect` that triggers `generateConcepts()` immediately when the component mounts, provided `newsStore.selectedArticles` is populated and concepts haven't been generated yet.
3.  **Default Settings:**
    -   In `cartoonStore.ts`, ensure default `panelCount` is set to 4.
    -   In `preferencesStore.ts` (if exists) or `ConceptGenerator`, default the style to the most popular option (e.g., "Satirical").

## 3. Simplified Visual Design

**Goal:** Reduce cognitive load by decluttering the UI.

**Current State:**
- News articles display metadata, dates, and full snippets, creating a dense list.

**Actionable Steps:**
1.  **Card Redesign:**
    -   Update `NewsDisplay.tsx` to use a cleaner Card component.
    -   Hide `publishedAt`, `source.id`, and raw URLs behind a "Details" tooltip or modal.
    -   Emphasize the "Humor Score" visual indicator.
2.  **Whitespace:**
    -   Increase gap settings in Tailwind classes (e.g., change `gap-4` to `gap-6` or `gap-8` in main layout containers).
    -   Add more padding to the main container in `App.tsx`.

## 4. Combined Actions Interface

**Goal:** Unify the fragmentation of the creation process (Concepts -> Script -> Image).

**Current State:**
- `ConceptGenerator`, `ConceptDisplay`, `ComicScriptDisplay`, and `ImageGenerator` are separate, loosely coupled components scattered in `HomePage.tsx`.

**Actionable Steps:**
1.  **Create `CartoonStudio` Component:**
    -   Create `src/components/cartoon/CartoonStudio.tsx`.
2.  **Unified Layout:**
    -   Use a 2-column layout (on Desktop):
        -   **Left Panel:** Configuration (Style selection, Concept modification).
        -   **Right Panel:** Preview (Script text, Generated Image).
3.  **State Coordination:**
    -   This component will act as the orchestrator for `cartoonStore`, triggering the chain of Concept -> Script -> Image generation sequentially or via a single "Make Cartoon" button.

## 5. Progressive Disclosure

**Goal:** Hide complex controls until the user needs them.

**Current State:**
- All controls (custom prompts, API overrides, detailed parameters) are often visible or mixed with primary actions.

**Actionable Steps:**
1.  **Advanced Settings Component:**
    -   Create a `<Collapsible />` or `<Accordion />` component.
    -   Move "Custom Prompt," "Temperature," and "Model Selection" inputs inside this collapsible section.
2.  **Primary Path:**
    -   Ensure the main UI only shows: "Select Style" and big "Generate" buttons.

## 6. Mobile-First Redesign

**Goal:** Ensure the app works seamlessly on mobile devices.

**Current State:**
- Layouts heavily rely on horizontal space (side-by-side panels).

**Actionable Steps:**
1.  **Responsive Flexbox:**
    -   Review `App.tsx` and `CartoonStudio.tsx`.
    -   Change flex containers to `flex-col md:flex-row`.
2.  **Touch Targets:**
    -   Ensure all buttons have `min-h-[44px]` and `min-w-[44px]`.
    -   Add `touch-action-manipulation` to prevent double-tap zoom issues on buttons.
3.  **Mobile Wizard:**
    -   For Enhancement 1 (Wizard), ensure the step indicator adapts to mobile (e.g., simplified dots or a text label "Step 1 of 3") instead of a full horizontal progress bar if space is tight.
