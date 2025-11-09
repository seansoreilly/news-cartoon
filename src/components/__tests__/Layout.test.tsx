import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from '../layout/Layout';

describe('Layout', () => {
  describe('Structure and Content', () => {
    it('should render with gradient background', () => {
      const { container } = render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const backgroundDiv = container.querySelector('.bg-gradient-to-br');
      expect(backgroundDiv).toBeInTheDocument();
      expect(backgroundDiv).toHaveClass('from-purple-500', 'to-pink-500');
    });

    it('should render header with correct title and subtitle', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.getByText('Cartoon of the Day')).toBeInTheDocument();
      expect(
        screen.getByText('AI-powered political cartoons based on local news')
      ).toBeInTheDocument();
    });

    it('should render children inside white rounded card', () => {
      render(
        <Layout>
          <div data-testid="test-content">Test Content</div>
        </Layout>
      );

      const mainElement = screen.getByText('Test Content').closest('main');
      expect(mainElement).toHaveClass('bg-white', 'rounded-lg', 'shadow-2xl');
      expect(mainElement).toBeInTheDocument();
    });

    it('should render footer with current year', () => {
      const currentYear = new Date().getFullYear();
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const footerText = screen.getByText(
        new RegExp(`© ${currentYear} Cartoon of the Day`)
      );
      expect(footerText).toBeInTheDocument();
    });

    it('should render correct footer year dynamically', () => {
      const { rerender } = render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();

      rerender(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive padding to main content', () => {
      const { container } = render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('p-6', 'md:p-8');
    });

    it('should apply responsive padding to container', () => {
      const { container } = render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const layoutContainer = container.querySelector('.max-w-\\[900px\\]');
      expect(layoutContainer).toHaveClass('px-4', 'py-8');
    });

    it('should have max-width constraint', () => {
      const { container } = render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const layoutContainer = container.querySelector('.max-w-\\[900px\\]');
      expect(layoutContainer).toHaveClass('max-w-\\[900px\\]');
    });
  });

  describe('Styling and Typography', () => {
    it('should apply correct title styling', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const title = screen.getByText('Cartoon of the Day');
      expect(title).toHaveClass('text-4xl', 'font-bold', 'text-white');
    });

    it('should apply correct subtitle styling', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const subtitle = screen.getByText('AI-powered political cartoons based on local news');
      expect(subtitle.parentElement).toHaveClass(
        'text-white',
        'text-opacity-80',
        'mt-2'
      );
    });

    it('should apply correct footer styling', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const footer = screen.getByText(/© .* Cartoon of the Day/).closest('footer');
      expect(footer).toHaveClass('text-center', 'text-white', 'text-sm', 'opacity-80');
    });
  });

  describe('Child Content Rendering', () => {
    it('should render child components correctly', () => {
      render(
        <Layout>
          <button>Click me</button>
        </Layout>
      );

      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('should handle multiple children', () => {
      render(
        <Layout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </Layout>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('should preserve child component structure', () => {
      const { container: nestedContainer } = render(
        <Layout>
          <div className="test-class">
            <p>Nested content</p>
          </div>
        </Layout>
      );

      const nestedDiv = nestedContainer.querySelector('.test-class');
      expect(nestedDiv).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('Layout Hierarchy', () => {
    it('should maintain correct DOM hierarchy', () => {
      const { container } = render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const outerDiv = container.firstChild;
      expect(outerDiv).toHaveClass('bg-gradient-to-br');

      const containerDiv = outerDiv!.childNodes[0];
      expect((containerDiv as Element).classList.contains('container')).toBe(true);

      const children = (containerDiv as Element).childNodes;
      expect(children.length).toBeGreaterThanOrEqual(3); // header, main, footer
    });

    it('should place header before main content', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const header = container.querySelector('header');
      const main = container.querySelector('main');

      expect(header).toBeInTheDocument();
      expect(main).toBeInTheDocument();

      // header should come before main
      const headerIndex = Array.from(container.querySelectorAll('header, main')).indexOf(header!);
      const mainIndex = Array.from(container.querySelectorAll('header, main')).indexOf(main!);
      expect(headerIndex).toBeLessThan(mainIndex);
    });

    it('should place footer after main content', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const main = container.querySelector('main');
      const footer = container.querySelector('footer');

      expect(main).toBeInTheDocument();
      expect(footer).toBeInTheDocument();

      // main should come before footer
      const mainIndex = Array.from(container.querySelectorAll('main, footer')).indexOf(main!);
      const footerIndex = Array.from(container.querySelectorAll('main, footer')).indexOf(footer!);
      expect(mainIndex).toBeLessThan(footerIndex);
    });
  });

  describe('Accessibility', () => {
    it('should use semantic HTML elements', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
      expect(container.querySelector('footer')).toBeInTheDocument();
    });

    it('should have heading hierarchy', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Cartoon of the Day');
    });
  });
});
