import React, { useState, useRef, useEffect } from 'react';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

const Collapsible: React.FC<CollapsibleProps> = ({ title, children, isOpen: controlledIsOpen, onToggle }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof controlledIsOpen === 'boolean';
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const contentRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    if (isControlled && onToggle) {
      onToggle(!isOpen);
    } else {
      setInternalIsOpen(!isOpen);
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.maxHeight = isOpen ? `${contentRef.current.scrollHeight}px` : '0px';
    }
  }, [isOpen]);

  return (
    <div className="collapsible-container border rounded-lg overflow-hidden">
      <button
        className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={toggleOpen}
        aria-expanded={isOpen}
      >
        <span className="font-medium text-gray-800">{title}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transform transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      <div
        ref={contentRef}
        className="collapsible-content transition-max-height duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: isOpen ? contentRef.current?.scrollHeight || 'auto' : '0px' }}
      >
        <div className="p-4 border-t border-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Collapsible;