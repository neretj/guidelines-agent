// Main guideline structure
export interface Guideline {
  id: number;
  title: string;
  condition: string;
  action: string;
  priority: number;
  category: string;
  created_at: string;
  updated_at: string;
}

// Chat message structure
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Active guideline structure for triggered guidelines during conversation
export interface ActiveGuideline {
  id: number;
  title: string;
  condition: string;
  action: string;
  priority: number;
  category: string;
  similarity: number;
  triggered_at: string;
}