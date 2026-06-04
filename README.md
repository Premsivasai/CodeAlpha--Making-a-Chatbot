# AI Shopping Intelligence Platform (Goval)

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/AI_Powered-GPT--4o-purple?style=for-the-badge&logo=openai" alt="AI Powered" />
  <img src="https://img.shields.io/badge/RAG-Hybrid%20Search-red?style=for-the-badge&logo=qdrant" alt="RAG Pipeline" />
  <img src="https://img.shields.io/badge/Qdrant-Vector%20DB-orange?style=for-the-badge&logo=qdrant" alt="Qdrant" />
  <img src="https://img.shields.io/badge/Docker-Enabled-blue?style=for-the-badge&logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/Open_Source-MIT-brightgreen?style=for-the-badge" alt="Open Source" />
</p>

An AI-powered shopping comparison and buying assistant platform that helps users discover products, compare prices across multiple stores, analyze reviews, track price history, receive personalized recommendations, and make smarter purchasing decisions using Retrieval-Augmented Generation (RAG).

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Database Design](#-database-design)
- [AI & RAG Pipeline](#-ai--rag-pipeline)
- [Authentication Flow](#-authentication-flow)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Folder Structure](#-folder-structure)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Performance Optimizations](#-performance-optimizations)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)
- [Contact](#-contact)

---

## 🔍 Overview

The **AI Shopping Intelligence Platform (Goval)** is a production-ready, SaaS-grade application designed to revolutionize online shopping. By combining structured product queries, vector search, and web-synthesized AI models, the platform serves as an all-in-one assistant.

It unifies the distinct advantages of:
- **Google Shopping & Smartprix**: For exhaustive real-time price monitoring, multi-store listings, and comparison indexes.
- **Amazon Rufus**: For product-specific specifications, natural language analysis, and feature drilling.
- **Perplexity AI**: For cited, real-time web summaries on pros, cons, discussions, and YouTube reviews.

---

## 🚀 Key Features

| Feature | Description | Target / Platforms Supported |
| :--- | :--- | :--- |
| **Multi-Store Search** | Real-time structured query parser scouring top portals | Amazon, Flipkart, Reliance Digital, Croma, Vijay Sales, Tata Cliq, JioMart, Cashify |
| **AI Buying Assistant** | Conversational agent answering qualitative queries in real time | Multi-LLM hybrid pipelines |
| **AI Comparison** | Contextual side-by-side matrices outlining spec winners and value ratings | Direct matrix visualizations |
| **Review Intelligence** | Aggregated review sentiment analysis, extracting core Pros & Cons | Real-time web review scraping |
| **Community Insights** | Social sentiment parsing to detect genuine consumer feedback | Reddit, Tech Forums, YouTube Reviews |
| **Deal Analyzer** | Evaluates current listings against trust scores and historic pricing | Automatic Value Rating |
| **Price Tracking** | Visual price history chart detailing peak and lowest pricing over time | Highcharts / ChartJS integrations |
| **Price Alerts** | Push/Email alerts triggered automatically when a product falls below a threshold | Supabase Edge Workers / Cron |
| **Dashboard** | Scoped user workspaces saving conversations, watchlists, and preferences | 100% Multi-Tenant Data Isolation |

---

## 📐 Architecture

```mermaid
graph TD
    A[Frontend: Next.js Client] -->|HTTP / SSE| B[API Gateway: Express API Server]
    B -->|Intent Detection| C[AI Assistant Routing Engine]
    C -->|Query Synthesis| D[RAG Pipeline]
    D -->|Real-time Search API| E[Google Shopping & Web Search Engine]
    D -->|Vector Similarity| F[Qdrant Vector DB]
    D -->|Persistent Relational Queries| G[Supabase PostgreSQL]
    B -->|Session Token Validation| H[Supabase Auth]
    B -->|Query / Cache Storage| I[Redis Cache Layer]
```

---

## 💻 Technology Stack

### Frontend
* **Core**: Next.js 15 (App Router / Pages Router split), React, TypeScript
* **Styling & Components**: Tailwind CSS, ShadCN UI, Framer Motion (Dynamic Micro-Animations)
* **Routing & Client**: Wouter (Client-side lightweight routing), TanStack React Query (State Management)

### Backend
* **API Gateway**: Express API Server (NodeJS)
* **Vector Execution & Indexing**: Python FastAPI Services

### Datastore & Cache
* **Relational Database**: Supabase PostgreSQL
* **Vector Store**: Qdrant Vector Database
* **Caching & Queueing**: Redis Key-Value Store

### AI Model Integration
* **LLM Engine**: OpenAI (GPT-4o / GPT-4o-mini), Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro
* **Embedding Model**: BGE-M3 (for multilingual/dense retrieval)

### Deployment
* **Containerization**: Docker & Docker Compose
* **Orchestration**: Kubernetes Configuration Manifests

---

## 🗄️ Database Design

The application utilizes a PostgreSQL schema managed via Drizzle ORM to enforce strict relationships and data isolation.

### Core Tables

- `profiles`: Holds user profile data linked directly to Supabase Auth (`auth.users`).
- `user_preferences`: Stores user preferences (favorite brands, currency, budget parameters) mapped to a unique user UUID.
- `saved_products`: Tracks user's bookmarked or watchlisted items.
- `price_alerts`: Configures user-triggered price thresholds on saved items.
- `search_history`: User-scoped logs tracking recent keyword searches.
- `conversations`: Header records representing active user conversations.
- `messages`: Message logs inside conversations, supporting user, assistant, products, and websearch payloads.

### Schema Examples (Drizzle ORM)

```typescript
import { pgTable, serial, text, timestamp, uuid, jsonb, integer } from "drizzle-orm/pg-core";

// Conversations Header Table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Messages Detail Table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(), // 'user', 'assistant', 'products', 'websearch'
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

---

## 🧠 AI & RAG Pipeline

```
[User Query]
     │
     ▼
[Intent Detection] ──► (Shopping Search / General Inquiry / Comparison)
     │
     ▼
[Hybrid Search] ──► (Keywords via SerpAPI + Semantic Embeddings)
     │
     ▼
[Vector Retrieval] ──► (Fetch contextual specs & forums from Qdrant)
     │
     ▼
[Re-Ranking & Deduplication] ──► (Cross-encoder re-ranking)
     │
     ▼
[Context Assembly] ──► (Combine Price Trends + Specs + Sentiment)
     │
     ▼
[LLM Reasoning] ──► (Analyze value ratings, trust index, and comparisons)
     │
     ▼
[Response Generation] ──► (Streaming answer with citations & markdown cards)
```

---

## 🔐 Authentication Flow

1. **Signup / Login Initiated**: The user enters their email address.
2. **OTP Transmitted**: Supabase Auth generates a verification code and sends it via email.
3. **Verification**: The user enters the 6-digit OTP code in the input modal.
4. **Session Creation**: Supabase issues a standard JWT payload containing `sub` (user UUID) and expiration.
5. **Authorization Headers**: The frontend client registers the token getter and attaches `Authorization: Bearer <token>` to all subsequent request headers.
6. **Protected Routing**: NextJS Middleware / Express Middleware intercepts incoming tokens, decodes the payload, binds metadata to `req.user`, and isolates relational data scope.

---

## 🛠️ Installation

### Prerequisites
- Node.js (v18+)
- pnpm (v8+) or npm (v10+)
- PostgreSQL Database Instance (or Supabase URL)
- Docker Desktop (Optional, for containers)

### Git Clone & Dependency Setup
```bash
# Clone the repository
git clone https://github.com/your-username/ai-shopping-intelligence.git
cd ai-shopping-intelligence

# Install dependencies in monorepo
pnpm install
```

### Environment Variables
Copy `.env.example` in both server and agent root directories and populate the values:
```bash
cp .env.example .env
```

### Database Migration
Apply schema migrations to PostgreSQL:
```bash
pnpm --filter @workspace/db db:push
```

### Run Services Locally
```bash
# Run backend server and frontend client concurrently
pnpm run dev
```

---

## ⚙️ Environment Variables

```env
# Supabase Connectivity
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# AI API Configurations
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...

# Vector Search Connectivity
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-secret-key

# Caching Configuration
REDIS_URL=redis://default:password@localhost:6379
```

---

## 📂 Folder Structure

```
├── artifacts/
│   ├── api-server/         # Express NodeJS Backend REST API Gateway
│   ├── shopping-agent/     # Next.js Client Interface (Wouter + Shadcn)
│   └── mockup-sandbox/     # Testing sandboxes and rapid UI templates
├── lib/
│   ├── api-client-react/   # Generated React API fetching hooks
│   ├── api-zod/            # Shared schema structures and Zod validation contracts
│   └── db/                 # PostgreSQL connections, Drizzle migrations, schemas
├── package.json            # Monorepo build and development scripts
└── pnpm-workspace.yaml     # pnpm workspace configurations
```

---

## 📖 API Documentation

### Authentication APIs
* `POST /api/auth/otp` - Generate and send OTP token.
* `POST /api/auth/verify` - Confirm OTP token and issue JWT.

### Product APIs
* `GET /api/shopping/products/:id` - Fetch cached product spec sheets.
* `POST /api/shopping/saved` - Add a product to the user's wishlist.
* `DELETE /api/shopping/saved/:id` - Remove wishlist items.

### Search APIs
* `POST /api/shopping/search` - Scour and rank multi-store search queries.
* `POST /api/shopping/clarify` - Identify missing attributes and trigger dialog questions.

### AI Assistant APIs
* `GET /api/openai/conversations` - Retrieve conversational sessions.
* `POST /api/openai/conversations/:id/messages` - Send queries and receive streaming responses.
* `POST /api/openai/conversations/:id/messages/manual` - Log structural search payloads (products/websearch).

---

## 🔒 Security

- **Row-Level Security (RLS)**: Enforced across all tables in Supabase. Every select, update, and insert check enforces `auth.uid() = user_id`.
- **Data Isolation**: In NodeJS middleware, all queries filter elements strictly by matching `req.user.id` token payload.
- **Input Validation**: Strictly parses input parameters using Zod models before DB insertion or serialization, securing queries against injection.

---

## ⚡ Performance Optimizations

- **Vector Caching**: Embedding vectors and high-volume queries are cached in Redis to prevent repeating LLM operations.
- **Lazy Loading**: UI layouts leverage dynamic code splitting to lazily mount heavier elements like graph charts.
- **Streaming Responses**: AI buying dialog outputs use server-sent events (SSE) to stream assistant markdown responses chunk-by-chunk for high interactivity.

---

## 🗺️ Roadmap

- [x] **Phase 1: Core Search**: Real-time SerpAPI scaper and price index engine.
- [x] **Phase 2: AI Assistant**: Conversational persistence, scoping, and review analysis.
- [ ] **Phase 3: Community Intelligence**: Auto-scraping Reddit and forum threads to identify genuine pros/cons.
- [ ] **Phase 4: Visual Search**: Drag-and-drop image discovery (integrating Vision models).
- [ ] **Phase 5: Voice Commerce**: Native voice search using Whisper API.
- [ ] **Phase 6: Mobile App**: Releasing native iOS & Android wrapper packages.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the project.
2. Create a Feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](file:///c:/Users/prems/Downloads/Shopping-Agent-main%20%281%29/Shopping-Agent-main/LICENSE) for more details.

---

## 💖 Acknowledgements

* [Next.js](https://nextjs.org/)
* [Supabase](https://supabase.com/)
* [OpenAI](https://openai.com/)
* [Qdrant](https://qdrant.tech/)
* [Tailwind CSS](https://tailwindcss.com/)
* [Shadcn UI](https://ui.shadcn.com/)
* [Framer Motion](https://www.framer.com/motion/)

---

## ✉️ Contact

- **Goval Team** - premsivasai188@gmail.com
- **Project URL**: [https://github.com/Premsivasai/CodeAlpha--Making-a-Chatbot](https://github.com/Premsivasai/CodeAlpha--Making-a-Chatbot)
