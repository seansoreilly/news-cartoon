/* eslint-disable react-refresh/only-export-components */
import type { ReactElement } from 'react';
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';

/**
 * Custom render function that includes providers
 */
const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };
