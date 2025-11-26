# Conductor — Real-time AI Agent Orchestration
[![Deploy to Cloudflare][![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/LeverageAISMBs/conductor-real-time-ai-agent-orchestration)]
Conductor is a production-ready dashboard and toolkit for orchestrating, monitoring, and managing real-time multi-agent conversations on Cloudflare's edge infrastructure. Built on the Cloudflare Agents SDK, it leverages Durable Objects (CHAT_AGENT and APP_CONTROLLER), R2 for persistence, and Vectorize for semantic search to enable seamless agent collaboration. The intuitive UI provides session management, real-time streaming chats, integration hooks, and secure authentication examples (API Keys and JWT).
This project extends the vite-cfagents-runner template, delivering a polished frontend with shadcn/ui components and a robust backend for agent coordination. It's designed for rapid prototyping and production deployment of AI agent systems.
## Features
- **Agent Dashboard**: Hero overview with system health, active rooms, recent activity, and quick actions for creating/switching sessions.
- **Rooms Management**: Sidebar for listing, searching, creating, renaming, deleting, and clearing sessions via AppController endpoints.
- **Real-time Chat View**: Streaming message handling using `/api/chat/:sessionId/chat` with fallback polling, tool usage visualization, and model switching.
- **Integrations Page**: Configure Vectorize queries, R2 message browsing, and monitor live system metrics with proxy endpoints.
- **Settings & Authentication**: Toggle API Key vs. JWT auth with examples and recommendations for server-to-server integration.
- **Logging & Limits**: Structured logging with Pino, rate limiting middleware, and AI quota notices.
- **Visual Excellence**: Responsive design with shadcn/ui, Tailwind v3, framer-motion animations, and micro-interactions for delightful UX.
- **Security & Scalability**: Reuses existing Durable Objects for persistence; supports R2/Vectorize without new bindings; auth proxies for external APIs.
## Technology Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v3, shadcn/ui (Radix primitives), framer-motion, lucide-react icons, @tanstack/react-query, zustand, sonner toasts, recharts.
- **Backend**: Cloudflare Workers, Hono routing, Agents SDK (Durable Objects), OpenAI SDK, Pino for logging.
- **Storage & AI**: R2 for message persistence, Vectorize for embeddings/search, Cloudflare AI Gateway for LLM inference.
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
- **Chat Sessions**: Switch rooms in sidebar. Send messages to stream responses from CHAT_AGENT.
- **Integrations**: Navigate to Integrations page to test Vectorize queries, browse R2, and view live metrics from `/api/metrics`.
- **Auth Examples**: In Settings, toggle API Key/JWT for server-to-server calls. Use `Authorization: Bearer <token>` headers.
- **AI Limits Notice**: Visible in footer/header – AI requests are rate-limited across apps.
## Deployment & Production Hardening
Deploy to Cloudflare Workers for global edge execution.
1.  **Build Assets**:
    ```
    bun build
    ```
2.  **Deploy**:
    ```
    bun wrangler deploy
    ```
### Production Checklist
-   [x] **Set Secrets**: Ensure all API keys (`CF_AI_API_KEY`, `API_KEY`, `JWT_SECRET`) are set via `wrangler secret put`. Never commit them.
-   [x] **Enable Rate Limiting**: The worker includes in-memory rate limiting. For production, consider Cloudflare Rate Limiting rules for more robust protection.
-   [x] **Monitor Metrics**: The `/api/metrics` endpoint provides basic observability. Use the Integrations page dashboard to monitor live session counts.
-   [x] **Cross-Browser Testing**: Test on the latest versions of major browsers (e.g., Chrome 120+, Firefox 115+, Safari 17+).
-   [x] **Structured Logging & Observability**:
    -   **Live Logs**: View real-time logs from your deployed worker:
        ```sh
        bunx wrangler tail
        ```
    -   **Logpush**: For persistent, queryable logs, configure Logpush in `wrangler.toml` to send logs to a destination like S3, Datadog, or Splunk.
        ```toml
        # Example wrangler.toml for Logpush to an S3 bucket
        [[logpush]]
        name = "conductor-logs"
        destination = "s3://your-log-bucket-name?region=us-east-1"
        # Optional: filter logs by level or sample rate
        # filter = "{\"where\": {\"key\": \"level\", \"operator\": \"gte\", \"value\": 30}}" # info and above
        sampler_rate = 1.0 # Send all logs
        ```
### Troubleshooting
-   **401 Unauthorized**: Ensure your `Authorization: Bearer <token>` header is correctly formatted and the token matches the secret set in your worker.
-   **AI Quota Errors**: If you receive errors from the AI Gateway, you may have hit a rate limit. Check your Cloudflare dashboard for usage.
-   **UI Hook Errors**: An "Invalid hook call" error usually indicates a mismatch in React versions or a violation of the Rules of Hooks (e.g., calling a hook inside a condition). Ensure React imports are correct (`import React, { useState } from 'react'`).
## Contributing
1. Fork and clone the repo.
2. Install deps: `bun install`.
3. Create feature branch: `git checkout -b feature/new-endpoint`.
4. Commit changes: Follow conventional commits.
5. Push and open PR targeting `main`.
Report issues for bugs or feature requests. Focus on visual polish, error handling, and Cloudflare best practices.
## License
MIT License.