import React, { useEffect } from 'react';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

const MetaTags: React.FC<MetaTagsProps> = ({ 
  title = 'News Cartoon', 
  description = 'Generate editorial cartoons from news headlines using AI.', 
  image = 'https://newscartoon.lol/og-image.jpg', 
  url = window.location.href 
}) => {
  useEffect(() => {
    // Update title
    document.title = title;

    // Helper to update meta tags
    const updateMeta = (name: string, content: string, attribute = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Update meta tags
    updateMeta('description', description);
    
    // Open Graph
    updateMeta('og:title', title, 'property');
    updateMeta('og:description', description, 'property');
    updateMeta('og:image', image, 'property');
    updateMeta('og:url', url, 'property');
    
    // Twitter
    updateMeta('twitter:title', title, 'property');
    updateMeta('twitter:description', description, 'property');
    updateMeta('twitter:image', image, 'property');
    updateMeta('twitter:url', url, 'property');

  }, [title, description, image, url]);

  return null;
};

export default MetaTags;
