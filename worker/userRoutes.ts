import { Hono } from "hono";
import { getAgentByName } from 'agents';
import { ChatAgent } from './agent';
import { API_RESPONSES } from './config';
import { Env, getAppController, registerSession, unregisterSession, updateSessionActivity } from "./core-utils";
import { authMiddleware } from './auth';
const generateMockEmbedding = async (text: string): Promise<number[]> => {
    const textEncoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', textEncoder.encode(text));
    const hashArray = Array.from(new Uint8Array(buffer));
    const vector = hashArray.slice(0, 16).map(v => v / 255.0);
    while (vector.length < 1536) {
      vector.push(0);
    }
    return vector.slice(0, 1536);
};
export function coreRoutes(app: Hono<{ Bindings: Env }>) {
    // Apply auth middleware to the chat endpoint
    app.use('/api/chat/:sessionId/chat', authMiddleware);
    app.all('/api/chat/:sessionId/*', async (c) => {
        try {
        const sessionId = c.req.param('sessionId');
        const agent = await getAgentByName<Env, ChatAgent>(c.env.CHAT_AGENT, sessionId);
        const url = new URL(c.req.url);
        url.pathname = url.pathname.replace(`/api/chat/${sessionId}`, '');
        return agent.fetch(new Request(url.toString(), {
            method: c.req.method,
            headers: c.req.header(),
            body: c.req.method === 'GET' || c.req.method === 'DELETE' ? undefined : c.req.raw.body
        }));
        } catch (error) {
        console.error('Agent routing error:', error);
        return c.json({ success: false, error: API_RESPONSES.AGENT_ROUTING_FAILED }, { status: 500 });
        }
    });
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // Session management routes
    app.get('/api/sessions', async (c) => {
        try {
            const controller = getAppController(c.env);
            const sessions = await controller.listSessions();
            return c.json({ success: true, data: sessions });
        } catch (error) {
            console.error('Failed to list sessions:', error);
            return c.json({ success: false, error: 'Failed to retrieve sessions' }, { status: 500 });
        }
    });
    app.post('/api/sessions', authMiddleware, async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const { title, sessionId: providedSessionId, firstMessage } = body;
            const sessionId = providedSessionId || crypto.randomUUID();
            let sessionTitle = title;
            if (!sessionTitle) {
                const now = new Date();
                const dateTime = now.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                if (firstMessage && firstMessage.trim()) {
                    const cleanMessage = firstMessage.trim().replace(/\s+/g, ' ');
                    const truncated = cleanMessage.length > 40 ? cleanMessage.slice(0, 37) + '...' : cleanMessage;
                    sessionTitle = `${truncated} • ${dateTime}`;
                } else {
                    sessionTitle = `Chat ${dateTime}`;
                }
            }
            await registerSession(c.env, sessionId, sessionTitle);
            return c.json({ success: true, data: { sessionId, title: sessionTitle } });
        } catch (error) {
            console.error('Failed to create session:', error);
            return c.json({ success: false, error: 'Failed to create session' }, { status: 500 });
        }
    });
    app.delete('/api/sessions/:sessionId', authMiddleware, async (c) => {
        try {
            const sessionId = c.req.param('sessionId');
            const deleted = await unregisterSession(c.env, sessionId);
            if (!deleted) return c.json({ success: false, error: 'Session not found' }, { status: 404 });
            return c.json({ success: true, data: { deleted: true } });
        } catch (error) {
            console.error('Failed to delete session:', error);
            return c.json({ success: false, error: 'Failed to delete session' }, { status: 500 });
        }
    });
    app.put('/api/sessions/:sessionId/title', authMiddleware, async (c) => {
        try {
            const sessionId = c.req.param('sessionId');
            const { title } = await c.req.json();
            if (!title || typeof title !== 'string') return c.json({ success: false, error: 'Title is required' }, { status: 400 });
            const controller = getAppController(c.env);
            const updated = await controller.updateSessionTitle(sessionId, title);
            if (!updated) return c.json({ success: false, error: 'Session not found' }, { status: 404 });
            return c.json({ success: true, data: { title } });
        } catch (error) {
            console.error('Failed to update session title:', error);
            return c.json({ success: false, error: 'Failed to update session title' }, { status: 500 });
        }
    });
    app.get('/api/sessions/stats', async (c) => {
        try {
            const controller = getAppController(c.env);
            const count = await controller.getSessionCount();
            return c.json({ success: true, data: { totalSessions: count } });
        } catch (error) {
            console.error('Failed to get session stats:', error);
            return c.json({ success: false, error: 'Failed to retrieve session stats' }, { status: 500 });
        }
    });
    app.delete('/api/sessions', authMiddleware, async (c) => {
        try {
            const controller = getAppController(c.env);
            const deletedCount = await controller.clearAllSessions();
            return c.json({ success: true, data: { deletedCount } });
        } catch (error) {
            console.error('Failed to clear all sessions:', error);
            return c.json({ success: false, error: 'Failed to clear all sessions' }, { status: 500 });
        }
    });
    // --- Agent-to-Agent Communication ---
    app.post('/api/agent-message/:sessionId', authMiddleware, async (c) => {
        try {
            const sessionId = c.req.param('sessionId');
            const agent = await getAgentByName<Env, ChatAgent>(c.env.CHAT_AGENT, sessionId);
            // Update activity to show agent is "active"
            await updateSessionActivity(c.env, sessionId);
            // Proxy the request to the agent's chat handler
            const url = new URL(c.req.url);
            url.pathname = '/chat'; // Route to the agent's chat endpoint
            return agent.fetch(new Request(url.toString(), {
                method: 'POST',
                headers: c.req.header(),
                body: c.req.raw.body
            }));
        } catch (error) {
            console.error('Agent message proxy error:', error);
            return c.json({ success: false, error: 'Failed to proxy message to agent' }, { status: 500 });
        }
    });
    // --- Integration Proxies ---
    app.post('/api/vectorize-query', async (c) => {
        const { VECTORIZE_INDEX } = c.env as any;
        if (!VECTORIZE_INDEX) return c.json({ success: false, error: 'Vectorize index not configured.' }, { status: 501 });
        try {
            const { query, topK = 5 } = await c.req.json();
            if (!query || typeof query !== 'string') return c.json({ success: false, error: 'Query string is required.' }, { status: 400 });
            const embedding = await generateMockEmbedding(query);
            const results = await VECTORIZE_INDEX.query(embedding, { topK });
            return c.json({ success: true, data: results });
        } catch (error) {
            console.error('Vectorize query failed:', error);
            return c.json({ success: false, error: 'Failed to query Vectorize index.' }, { status: 500 });
        }
    });
    app.post('/api/vectorize-insert', async (c) => {
        const { VECTORIZE_INDEX } = c.env as any;
        if (!VECTORIZE_INDEX) return c.json({ success: false, error: 'Vectorize index not configured.' }, { status: 501 });
        try {
            const { content, metadata = {} } = await c.req.json();
            if (!content || typeof content !== 'string') return c.json({ success: false, error: 'Content string is required.' }, { status: 400 });
            const id = crypto.randomUUID();
            const embedding = await generateMockEmbedding(content);
            await VECTORIZE_INDEX.insert([{ id, values: embedding, metadata }]);
            return c.json({ success: true, data: { id } });
        } catch (error) {
            console.error('Vectorize insert failed:', error);
            return c.json({ success: false, error: 'Failed to insert into Vectorize index.' }, { status: 500 });
        }
    });
    app.get('/api/r2-list', async (c) => {
        const { R2_BUCKET } = c.env as any;
        if (!R2_BUCKET) return c.json({ success: false, error: 'R2 bucket not configured.' }, { status: 501 });
        try {
            const { sessionId } = c.req.query();
            const options = sessionId ? { prefix: `messages/${sessionId}/` } : {};
            const listed = await R2_BUCKET.list(options);
            const files = listed.objects.map((obj: any) => ({ key: obj.key, size: obj.size, uploaded: obj.uploaded.toISOString() }));
            return c.json({ success: true, data: { files, truncated: listed.truncated } });
        } catch (error) {
            console.error('R2 list failed:', error);
            return c.json({ success: false, error: 'Failed to list R2 objects.' }, { status: 500 });
        }
    });
    app.post('/api/r2-put', async (c) => {
        const { R2_BUCKET } = c.env as any;
        if (!R2_BUCKET) return c.json({ success: false, error: 'R2 bucket not configured.' }, { status: 501 });
        try {
            const { sessionId, message } = await c.req.json();
            if (!sessionId || !message) return c.json({ success: false, error: 'sessionId and message are required.' }, { status: 400 });
            const key = `messages/${sessionId}/${Date.now()}_manual.json`;
            await R2_BUCKET.put(key, JSON.stringify(message));
            return c.json({ success: true, data: { key } });
        } catch (error) {
            console.error('R2 put failed:', error);
            return c.json({ success: false, error: 'Failed to put object in R2.' }, { status: 500 });
        }
    });
    // --- Auth Test Route ---
    app.get('/api/echo', authMiddleware, async (c) => {
        return c.json({ success: true, message: 'Authenticated successfully!' });
    });
}