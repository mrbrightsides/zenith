
export enum StudioTab {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  LIVE = 'live',
  ORCHESTRATOR = 'orchestrator',
  ARCHITECTURE = 'architecture'
}

export interface GeneratedAsset {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  timestamp: number;
  prompt: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}
