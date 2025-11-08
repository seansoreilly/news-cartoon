export interface CartoonConcept {
  title: string;
  premise: string;
  why_funny: string;
}

export interface CartoonData {
  topic: string;
  location: string;
  ideas: CartoonConcept[];
  ranking: string[];
  winner: string;
  generatedAt: number;
}

export interface ComicPanel {
  panelNumber: number;
  description: string;
  characters?: string[];
  setting?: string;
}

export interface ComicScript {
  panels: ComicPanel[] | string[];
  description: string;
  generatedAt: number;
  newsContext?: string;
}

export interface CartoonGenerationRequest {
  topic: string;
  headlines: string[];
  location: string;
}

export interface CartoonGenerationResponse {
  cartoon: CartoonData;
  script: ComicScript;
}

export interface CartoonImage {
  base64Data: string;
  mimeType: string;
  generatedAt: number;
}

export interface ImageGenerationRequest {
  concept: CartoonConcept;
  style?: string;
  newsContext?: string;
}
