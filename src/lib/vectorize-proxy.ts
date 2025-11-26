export interface VectorizeQueryResult {
  matches: {
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
  }[];
}
export async function queryVectorize(
  query: string,
  topK: number = 5
): Promise<{ success: boolean; data?: VectorizeQueryResult; error?: string }> {
  try {
    // In a real app, you'd generate embeddings here or on the server
    // For this demo, we'll send the text query and let the server handle it
    const response = await fetch('/api/vectorize-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to query Vectorize index';
    console.error('Vectorize query failed:', message);
    return { success: false, error: message };
  }
}