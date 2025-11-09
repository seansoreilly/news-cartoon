import { http, HttpResponse } from 'msw';

// Mock news articles
const mockArticles = {
  articles: [
    {
      title: 'Breaking News 1',
      description: 'This is a test article about current events',
      url: 'https://example.com/news/1',
      source: { name: 'Test News Source', url: 'https://example.com' },
      publishedAt: '2025-01-01T12:00:00Z',
      content: 'Full content of the test article goes here',
      image: 'https://example.com/image1.jpg',
    },
    {
      title: 'Breaking News 2',
      description: 'Another important test article',
      url: 'https://example.com/news/2',
      source: { name: 'Another News Source', url: 'https://example.com' },
      publishedAt: '2025-01-01T11:00:00Z',
      content: 'More content about the news',
      image: 'https://example.com/image2.jpg',
    },
    {
      title: 'Breaking News 3',
      description: 'Yet another test article',
      url: 'https://example.com/news/3',
      source: { name: 'Test News Source', url: 'https://example.com' },
      publishedAt: '2025-01-01T10:00:00Z',
      content: 'Additional news content',
    },
  ],
};

// Mock Gemini API responses
const mockGeminiConceptResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: '1. **Political Theater**: A satirical take on recent political developments\n2. **Economic Rollercoaster**: Editorial cartoon about market trends\n3. **Climate Crisis**: Editorial perspective on environmental issues\n4. **Tech Takeover**: Commentary on technology in society\n5. **Social Media Madness**: Critique of social media culture',
          },
        ],
      },
    },
  ],
};

const mockGeminiScriptResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: 'Panel 1: A politician on a tightrope, holding a briefcase\nPanel 2: The tightrope starts to wobble\nPanel 3: The politician juggles multiple objects labeled "promises"\nPanel 4: Everything falls down, showing chaos below',
          },
        ],
      },
    },
  ],
};

const mockGeminiImageResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            },
          },
        ],
      },
    },
  ],
};

export const handlers = [
  // News API endpoint
  http.get('http://localhost:3000/api/news/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query) {
      return HttpResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json(mockArticles);
  }),

  // Gemini concept generation
  http.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    () => {
      return HttpResponse.json(mockGeminiConceptResponse);
    }
  ),

  // Gemini script generation
  http.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    () => {
      return HttpResponse.json(mockGeminiScriptResponse);
    }
  ),

  // Gemini image generation (vision API)
  http.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    () => {
      return HttpResponse.json(mockGeminiImageResponse);
    }
  ),
];
