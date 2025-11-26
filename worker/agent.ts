import { Agent } from 'agents';
import type { Env } from './core-utils';
import type { ChatState, Message } from './types';
import { ChatHandler } from './chat';
import { API_RESPONSES } from './config';
import { createMessage, createStreamResponse, createEncoder } from './utils';
// Helper to generate a mock embedding vector
const generateMockEmbedding = async (text: string): Promise<number[]> => {
  const textEncoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', textEncoder.encode(text));
  const hashArray = Array.from(new Uint8Array(buffer));
  // Use first 16 bytes (128 bits) and normalize to create a 128-dim vector
  // In a real app, this should be 1536 or your model's dimension
  const vector = hashArray.slice(0, 16).map(v => v / 255.0);
  // Pad to 1536 for demo compatibility with some indexes
  while (vector.length < 1536) {
    vector.push(0);
  }
  return vector.slice(0, 1536);
};
export class ChatAgent extends Agent<Env, ChatState> {
  private chatHandler?: ChatHandler;
  initialState: ChatState = {
    messages: [],
    sessionId: crypto.randomUUID(),
    isProcessing: false,
    model: 'google-ai-studio/gemini-2.5-flash'
  };
  async onStart(): Promise<void> {
    this.chatHandler = new ChatHandler(
      this.env.CF_AI_BASE_URL,
      this.env.CF_AI_API_KEY,
      this.state.model
    );
    console.log(`ChatAgent ${this.name} initialized with session ${this.state.sessionId}`);
  }
  async onRequest(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const method = request.method;
      if (method === 'GET' && url.pathname === '/messages') return this.handleGetMessages();
      if (method === 'POST' && url.pathname === '/chat') return this.handleChatMessage(await request.json());
      if (method === 'DELETE' && url.pathname === '/clear') return this.handleClearMessages();
      if (method === 'POST' && url.pathname === '/model') return this.handleModelUpdate(await request.json());
      return Response.json({ success: false, error: API_RESPONSES.NOT_FOUND }, { status: 404 });
    } catch (error) {
      console.error('Request handling error:', error);
      return Response.json({ success: false, error: API_RESPONSES.INTERNAL_ERROR }, { status: 500 });
    }
  }
  private handleGetMessages(): Response {
    return Response.json({ success: true, data: this.state });
  }
  private async persistAndIndex(userMessage: Message, assistantMessage: Message) {
    const { R2_BUCKET, VECTORIZE_INDEX } = this.env;
    // Persist to R2
    if (R2_BUCKET) {
      try {
        const key = `messages/${this.state.sessionId}/${userMessage.id}.json`;
        await R2_BUCKET.put(key, JSON.stringify({ userMessage, assistantMessage }));
      } catch (e) {
        console.error(`Failed to persist message to R2 for session ${this.state.sessionId}:`, e);
      }
    }
    // Index in Vectorize
    if (VECTORIZE_INDEX) {
      try {
        const messagesToIndex = [userMessage, assistantMessage].filter(m => m.content);
        const vectors = await Promise.all(messagesToIndex.map(async (message) => {
          const embedding = await generateMockEmbedding(message.content);
          return {
            id: message.id,
            values: embedding,
            metadata: {
              sessionId: this.state.sessionId,
              role: message.role,
              content: message.content.substring(0, 500), // Truncate for metadata
              timestamp: message.timestamp,
            }
          };
        }));
        if (vectors.length > 0) {
          await VECTORIZE_INDEX.insert(vectors);
        }
      } catch (e) {
        console.error(`Failed to index message in Vectorize for session ${this.state.sessionId}:`, e);
      }
    }
  }
  private async handleChatMessage(body: { message: string; model?: string; stream?: boolean }): Promise<Response> {
    const { message, model, stream } = body;
    if (!message?.trim()) return Response.json({ success: false, error: API_RESPONSES.MISSING_MESSAGE }, { status: 400 });
    if (model && model !== this.state.model) {
      this.setState({ ...this.state, model });
      this.chatHandler?.updateModel(model);
    }
    const userMessage = createMessage('user', message.trim());
    this.setState({ ...this.state, messages: [...this.state.messages, userMessage], isProcessing: true });
    try {
      if (!this.chatHandler) throw new Error('Chat handler not initialized');
      if (stream) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = createEncoder();
        (async () => {
          try {
            this.setState({ ...this.state, streamingMessage: '' });
            const response = await this.chatHandler.processMessage(message, this.state.messages, (chunk: string) => {
              try {
                this.setState({ ...this.state, streamingMessage: (this.state.streamingMessage || '') + chunk });
                writer.write(encoder.encode(chunk));
              } catch (writeError) { console.error('Write error:', writeError); }
            });
            const assistantMessage = createMessage('assistant', response.content, response.toolCalls);
            this.setState({ ...this.state, messages: [...this.state.messages, assistantMessage], isProcessing: false, streamingMessage: '' });
            this.ctx?.waitUntil(this.persistAndIndex(userMessage, assistantMessage));
          } catch (error) {
            console.error('Streaming error:', error);
            const errorMessage = 'Sorry, I encountered an error.';
            writer.write(encoder.encode(errorMessage));
            const errorMsg = createMessage('assistant', errorMessage);
            this.setState({ ...this.state, messages: [...this.state.messages, errorMsg], isProcessing: false, streamingMessage: '' });
          } finally {
            writer.close();
          }
        })();
        return createStreamResponse(readable);
      }
      const response = await this.chatHandler.processMessage(message, this.state.messages);
      const assistantMessage = createMessage('assistant', response.content, response.toolCalls);
      this.setState({ ...this.state, messages: [...this.state.messages, assistantMessage], isProcessing: false });
      this.ctx?.waitUntil(this.persistAndIndex(userMessage, assistantMessage));
      return Response.json({ success: true, data: this.state });
    } catch (error) {
      console.error('Chat processing error:', error);
      this.setState({ ...this.state, isProcessing: false });
      return Response.json({ success: false, error: API_RESPONSES.PROCESSING_ERROR }, { status: 500 });
    }
  }
  private handleClearMessages(): Response {
    this.setState({ ...this.state, messages: [] });
    return Response.json({ success: true, data: this.state });
  }
  private handleModelUpdate(body: { model: string }): Response {
    const { model } = body;
    this.setState({ ...this.state, model });
    this.chatHandler?.updateModel(model);
    return Response.json({ success: true, data: this.state });
  }
}