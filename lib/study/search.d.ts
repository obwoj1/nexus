export interface StudySourceMatch {
  id: string;
  title: string;
  sourceName: string;
  score: number;
  excerpt: string;
}
export function rankStudySources(query: string, sources: Array<{ id: string; title: string; source_name: string; content: string }>, limit?: number): StudySourceMatch[];
