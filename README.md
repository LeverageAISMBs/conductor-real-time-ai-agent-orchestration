# Conductor — Real-time AI Agent Orchestration

[![Deploy to Cloudflare][cloudflarebutton]]

Conductor is a production-ready dashboard and toolkit for orchestrating, monitoring, and managing real-time multi-agent conversations on Cloudflare's edge infrastructure. Built on the Cloudflare Agents SDK, it leverages Durable Objects (CHAT_AGENT and APP_CONTROLLER), R2 for persistence, and Vectorize for semantic search to enable seamless agent collaboration. The intuitive UI provides session management, real-time streaming chats, integration hooks, and secure authentication examples (API Keys and JWT).

This project extends the vite-cfagents-runner template, delivering a polished frontend with shadcn/ui components and a robust backend for agent coordination. It's designed for rapid prototyping and production deployment of AI agent systems.

## Features

- **Agent Dashboard**: Hero overview with system health, active rooms, recent activity, and quick actions for creating/switching sessions.
- **Rooms Management**: Sidebar for listing, searching, creating, renaming, deleting, and clearing sessions via AppController endpoints.
- **Real-time Chat View**: Streaming message handling using `/api/chat/:sessionId/chat` with fallback polling, tool usage visualization, and model switching.
- **Integrations Page**: Configure Vectorize queries and R2 message browsing with proxy endpoints for semantic search and history retrieval.
- **Settings & Authentication**: Toggle API Key vs. JWT auth with examples and recommendations for server-to-server integration.
- **Logging & Limits**: Footer with AI quota notices and wrangler tail instructions; structured logging support.
- **Visual Excellence**: Responsive design with shadcn/ui, Tailwind v3, framer-motion animations, and micro-interactions for delightful UX.
- **Security & Scalability**: Reuses existing Durable Objects for persistence; supports R2/Vectorize without new bindings; auth proxies for external APIs.

## Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v3, shadcn/ui (Radix primitives), framer-motion, lucide-react icons, @tanstack/react-query, zustand, sonner toasts, recharts.
- **Backend**: Cloudflare Workers, Hono routing, Agents SDK (Durable Objects), OpenAI SDK, Model Context Protocol (MCP) for tools.
- **Storage & AI**: R2 for message persistence, Vectorize for embeddings/search, Cloudflare AI Gateway for LLM inference (Gemini models).
- **Dev Tools**: Bun (package manager/runtime), wrangler CLI, ESLint, Prettier.
- **Bindings**: CHAT_AGENT (chat persistence), APP_CONTROLLER (session management) – no additional bindings required.

## Quick Start

### Prerequisites

- Bun 1.0+ (install via [bun.sh](https://bun.sh))
- Cloudflare account with Workers enabled
- wrangler CLI: `bunx wrangler@latest`
- Set environment variables: `CF_AI_BASE_URL` (AI Gateway URL), `CF_AI_API_KEY` (API key)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd conductor
   ```

2. Install dependencies:
   ```
   bun install
   ```

3. Configure secrets (run these in project root):
   ```
   bunx wrangler secret put CF_AI_BASE_URL
   bunx wrangler secret put CF_AI_API_KEY
   # Optional: SerpAPI for web search tools
   bunx wrangler secret put SERPAPI_KEY
   ```

4. Start development server:
   ```
   bun dev
   ```
   The app runs at `http://localhost:3000`. The Worker is auto-proxied for API calls.

### Usage

- **Dashboard**: Land on `/` for overview. Create rooms via "New Room" button (POST `/api/sessions`).
- **Chat Sessions**: Switch rooms in sidebar. Send messages to stream responses from CHAT_AGENT (supports tools like weather, web search).
- **Streaming**: Messages use `stream=true` for real-time updates; fallback to polling via `/api/chat/:sessionId/messages`.
- **Integrations**: Navigate to Integrations page to test Vectorize queries (POST `/api/vectorize-query`) and R2 listings (GET `/api/r2-list`).
- **Auth Examples**: In Settings, toggle API Key/JWT for server-to-server calls. Use `Authorization: Bearer <token>` headers.
- **AI Limits Notice**: Visible in footer/header – AI requests are rate-limited across apps; monitor via wrangler tail.

Example API call (curl for new session):
```
curl -X POST https://your-worker-url.workers.dev/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"title": "Agent Collaboration", "firstMessage": "Start planning task"}'
```

Send message (with auth):
```
curl -X POST https://your-worker-url.workers.dev/api/chat/session-123/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"message": "Coordinate agents", "stream": true}'
```

## Development

- **Scripts**:
  - `bun dev`: Run dev server (frontend + Worker proxy).
  - `bun build`: Build for production.
  - `bun lint`: Run ESLint.
  - `bun cf-typegen`: Generate Worker types.
  - `bun wrangler dev`: Local Worker simulation (for backend testing).

- **Frontend Edits**: Modify `src/pages/HomePage.tsx` (rewrite for dashboard). Use `AppLayout` for sidebar/content structure. Import shadcn/ui from `@/components/ui/*`.
- **Backend Routes**: Extend `worker/userRoutes.ts` for custom endpoints (e.g., Vectorize/R2 proxies). Do not modify core files like `worker/index.ts`.
- **State Management**: Use `chatService` from `src/lib/chat.ts` for API interactions. Zustand for UI state; react-query for caching.
- **Tools & MCP**: Agents auto-discover MCP tools (add servers in `worker/mcp-client.ts`). Custom tools in `worker/tools.ts`.
- **Testing**: Preview with `bun preview`. Tail logs: `bunx wrangler tail`.
- **AI Note**: Include quota warning in UI (e.g., footer): "AI usage has cross-app rate limits; see docs or Settings."

## Deployment

Deploy to Cloudflare Workers for global edge execution:

1. Ensure `wrangler.toml` is configured (auto-generated from template).
2. Build assets:
   ```
   bun build
   ```
3. Deploy:
   ```
   bun wrangler deploy
   ```
   This deploys the Worker and static assets. Access at `https://your-project.workers.dev`.

For previews: Use Cloudflare Pages or Workers for Pages.

[cloudflarebutton]

### Environment Setup for Production

- Bind R2/Vectorize in dashboard if needed (via wrangler.toml: `[r2_buckets]`, `[vectorize]`).
- Secure secrets: Use `bunx wrangler secret put` for API keys.
- Custom Domain: `bunx wrangler deploy --name your-subdomain`.
- Logging: Enable Logpush in `wrangler.toml` for structured logs (e.g., to Datadog/S3).

## Contributing

1. Fork and clone the repo.
2. Install deps: `bun install`.
3. Create feature branch: `git checkout -b feature/new-endpoint`.
4. Commit changes: Follow conventional commits.
5. Push and open PR targeting `main`.

Report issues for bugs or feature requests. Focus on visual polish, error handling, and Cloudflare best practices.

## License

MIT License. See [LICENSE](LICENSE) for details (add if not present).