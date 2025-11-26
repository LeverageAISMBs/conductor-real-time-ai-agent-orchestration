import { Hono } from "hono";
import { getAgentByName } from 'agents';
import { ChatAgent } from './agent';
import { API_RESPONSES } from './config';
import { Env, getAppController, registerSession, unregisterSession, updateSessionActivity } from "./core-utils";
import { authMiddleware } from './auth';
import pino from 'pino';
import { createMiddleware } from 'hono/factory';
const logger = pino({ level: 'info' });
const ipRateLimit = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;
const rateLimitMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
    const now = Date.now();
    let record = ipRateLimit.get(ip);
    if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
        record = { count: 1, lastReset: now };
        ipRateLimit.set(ip, record);
    } else {
        record.count++;
    }
    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
        logger.warn({ ip, count: record.count }, 'Rate limit exceeded');
        return c.json({ success: false, error: 'Too many requests' }, 429);
    }
    await next();
});
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
    app.use('/api/chat/:sessionId/*', rateLimitMiddleware, authMiddleware);
    app.all('/api/chat/:sessionId/*', async (c) => {
        try {
            const sessionId = c.req.param('sessionId');
            const agent = await getAgentByName<Env, ChatAgent>(c.env.CHAT_AGENT, sessionId);
            const url = new URL(c.req.url);
            url.pathname = url.pathname.replace(`/api/chat/${sessionId}`, '');
            const response = await agent.fetch(new Request(url.toString(), {
                method: c.req.method,
                headers: c.req.header(),
                body: c.req.method === 'GET' || c.req.method === 'DELETE' ? undefined : c.req.raw.body
            }));
            logger.info({ path: c.req.path, method: c.req.method, status: response.status }, 'Agent request processed');
            return response;
        } catch (error) {
            logger.error({ err: error, path: c.req.path }, 'Agent routing error');
            return c.json({ success: false, error: API_RESPONSES.AGENT_ROUTING_FAILED }, { status: 500 });
        }
    });
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    app.use('/api/sessions/*', rateLimitMiddleware);
    app.get('/api/sessions', async (c) => {
        try {
            const controller = getAppController(c.env);
            const sessions = await controller.listSessions();
            logger.info('Listed sessions');
            return c.json({ success: true, data: sessions });
        } catch (error) {
            logger.error({ err: error }, 'Failed to list sessions');
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
            logger.info({ sessionId }, 'Created session');
            return c.json({ success: true, data: { sessionId, title: sessionTitle } });
        } catch (error) {
            logger.error({ err: error }, 'Failed to create session');
            return c.json({ success: false, error: 'Failed to create session' }, { status: 500 });
        }
    });
    app.delete('/api/sessions/:sessionId', authMiddleware, async (c) => {
        const sessionId = c.req.param('sessionId');
        try {
            const deleted = await unregisterSession(c.env, sessionId);
            if (!deleted) return c.json({ success: false, error: 'Session not found' }, { status: 404 });
            logger.info({ sessionId }, 'Deleted session');
            return c.json({ success: true, data: { deleted: true } });
        } catch (error) {
            logger.error({ err: error, sessionId: sessionId }, 'Failed to delete session');
            return c.json({ success: false, error: 'Failed to delete session' }, { status: 500 });
        }
    });
    app.put('/api/sessions/:sessionId/title', authMiddleware, async (c) => {
        const sessionId = c.req.param('sessionId');
        try {
            const { title } = await c.req.json();
            if (!title || typeof title !== 'string') return c.json({ success: false, error: 'Title is required' }, { status: 400 });
            const controller = getAppController(c.env);
            const updated = await controller.updateSessionTitle(sessionId, title);
            if (!updated) return c.json({ success: false, error: 'Session not found' }, { status: 404 });
            logger.info({ sessionId }, 'Updated session title');
            return c.json({ success: true, data: { title } });
        } catch (error) {
            logger.error({ err: error, sessionId: sessionId }, 'Failed to update session title');
            return c.json({ success: false, error: 'Failed to update session title' }, { status: 500 });
        }
    });
    app.get('/api/sessions/stats', async (c) => {
        try {
            const controller = getAppController(c.env);
            const count = await controller.getSessionCount();
            return c.json({ success: true, data: { totalSessions: count } });
        } catch (error) {
            logger.error({ err: error }, 'Failed to get session stats');
            return c.json({ success: false, error: 'Failed to retrieve session stats' }, { status: 500 });
        }
    });
    app.delete('/api/sessions', authMiddleware, async (c) => {
        try {
            const controller = getAppController(c.env);
            const deletedCount = await controller.clearAllSessions();
            logger.info({ deletedCount }, 'Cleared all sessions');
            return c.json({ success: true, data: { deletedCount } });
        } catch (error) {
            logger.error({ err: error }, 'Failed to clear all sessions');
            return c.json({ success: false, error: 'Failed to clear all sessions' }, { status: 500 });
        }
    });
    app.post('/api/agent-message/:sessionId', rateLimitMiddleware, authMiddleware, async (c) => {
        const sessionId = c.req.param('sessionId');
        try {
            const agent = await getAgentByName<Env, ChatAgent>(c.env.CHAT_AGENT, sessionId);
            await updateSessionActivity(c.env, sessionId);
            const url = new URL(c.req.url);
            url.pathname = '/chat';
            return agent.fetch(new Request(url.toString(), {
                method: 'POST',
                headers: c.req.header(),
                body: c.req.raw.body
            }));
        } catch (error) {
            logger.error({ err: error, sessionId: sessionId }, 'Agent message proxy error');
            return c.json({ success: false, error: 'Failed to proxy message to agent' }, { status: 500 });
        }
    });
    app.post('/api/vectorize-query', async (c) => {
        const { VECTORIZE_INDEX } = c.env;
        if (!VECTORIZE_INDEX) return c.json({ success: false, error: 'Vectorize index not configured.' }, { status: 501 });
        try {
            const { query, topK = 5 } = await c.req.json();
            if (!query || typeof query !== 'string') return c.json({ success: false, error: 'Query string is required.' }, { status: 400 });
            const embedding = await generateMockEmbedding(query);
            const results = await VECTORIZE_INDEX.query(embedding, { topK });
            return c.json({ success: true, data: results });
        } catch (error) {
            logger.error({ err: error }, 'Vectorize query failed');
            return c.json({ success: false, error: 'Failed to query Vectorize index.' }, { status: 500 });
        }
    });
    app.post('/api/vectorize-insert', async (c) => {
        const { VECTORIZE_INDEX } = c.env;
        if (!VECTORIZE_INDEX) return c.json({ success: false, error: 'Vectorize index not configured.' }, { status: 501 });
        try {
            const { content, metadata = {} } = await c.req.json();
            if (!content || typeof content !== 'string') return c.json({ success: false, error: 'Content string is required.' }, { status: 400 });
            const id = crypto.randomUUID();
            const embedding = await generateMockEmbedding(content);
            await VECTORIZE_INDEX.insert([{ id, values: embedding, metadata }]);
            return c.json({ success: true, data: { id } });
        } catch (error) {
            logger.error({ err: error }, 'Vectorize insert failed');
            return c.json({ success: false, error: 'Failed to insert into Vectorize index.' }, { status: 500 });
        }
    });
    app.get('/api/r2-list', async (c) => {
        const { R2_BUCKET } = c.env;
        if (!R2_BUCKET) return c.json({ success: false, error: 'R2 bucket not configured.' }, { status: 501 });
        try {
            const { sessionId } = c.req.query();
            const options = sessionId ? { prefix: `messages/${sessionId}/` } : {};
            const listed = await R2_BUCKET.list(options);
            const files = listed.objects.map((obj: any) => ({ key: obj.key, size: obj.size, uploaded: obj.uploaded.toISOString() }));
            return c.json({ success: true, data: { files, truncated: listed.truncated } });
        } catch (error) {
            logger.error({ err: error }, 'R2 list failed');
            return c.json({ success: false, error: 'Failed to list R2 objects.' }, { status: 500 });
        }
    });
    app.get('/api/metrics', async (c) => {
        try {
            const controller = getAppController(c.env);
            const count = await controller.getSessionCount();
            // In a real app, you'd collect more metrics (e.g., from a KV store or another DO)
            const requestCounts = Array.from(ipRateLimit.entries()).map(([ip, data]) => ({ ip, ...data }));
            return c.json({ success: true, data: { totalSessions: count, requestCounts, timestamp: Date.now() } });
        } catch (error) {
            logger.error({ err: error }, 'Failed to get metrics');
            return c.json({ success: false, error: 'Failed to retrieve metrics' }, { status: 500 });
        }
    });
    app.get('/api/echo', authMiddleware, async (c) => {
        return c.json({ success: true, message: 'Authenticated successfully!' });
    });
}