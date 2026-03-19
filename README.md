# Physics AI Tutor

> An AI-powered teaching assistant built exclusively for high school physics teachers — generate questions, auto-grade, and analyze student performance in one place.

**[中文文档](./README.zh.md)**

---

## Overview

Physics AI Tutor eliminates the repetitive burden of creating quizzes and grading papers. A teacher selects a knowledge point, clicks **Generate**, and receives a ready-to-review set of physics questions in under 30 seconds. Students answer online; objective questions are scored instantly; subjective questions go to a streamlined grading center. After publishing, both teachers and students see rich feedback tied to specific knowledge points.

### Key features

| Feature | Detail |
|---------|--------|
| **AI Question Generation** | Specify chapter, question type, and difficulty → GLM-4-Flash generates questions in structured JSON with LaTeX formulas |
| **Teacher Review Workflow** | AI output stays in `draft` state; teachers preview, edit, regenerate individual questions, and publish |
| **Auto Grading** | Objective questions (multiple-choice & fill-in-the-blank) are scored immediately on submission with unit-alias normalization |
| **Grading Center** | Two views — by-question or by-student — with keyboard-friendly scoring and one-click common comments |
| **Grade Publishing** | Grades publish only when the teacher confirms; a 24-hour revision window with full audit log |
| **Class Management** | Teachers create classes and share invite codes; students join with the code |
| **File Upload** | Lesson plans and question bank files (PDF / DOCX / PPTX) upload to Cloudflare R2 and are parsed into text |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) · Tailwind CSS · shadcn/ui · KaTeX |
| Backend | Hono · Drizzle ORM |
| AI Agent | Mastra · Zhipu GLM-4-Flash |
| Embedding *(P1)* | Alibaba DashScope text-embedding-v3 |
| Database | Supabase (PostgreSQL + Auth + pgvector) |
| File Storage | Cloudflare R2 |
| Deployment | Cloudflare Workers (frontend + backend) |
| Monorepo | pnpm workspace |

---

## Project Structure

```
physics-ai-tutor/
├── apps/
│   ├── web/                  # Next.js 15 frontend
│   └── server/               # Hono + Mastra backend
├── packages/
│   └── shared/               # Shared types, validators, knowledge-point constants
├── docs/
│   ├── PRD.md                # Product requirements
│   ├── technical-plan.md     # Architecture & schema
│   ├── UI-SPEC.md            # Design tokens & component rules
│   └── dev-plan.md           # Sprint-by-sprint development plan
├── ai/
│   ├── tasks.json            # Setup tasks (S-01, S-02)
│   ├── tasks/
│   │   ├── backend.json      # Backend tasks (B-01 ~ B-05)
│   │   ├── frontend.json     # Frontend tasks (F-01 ~ F-05)
│   │   ├── ai-agents.json    # AI agent tasks (A-01 ~ A-04)
│   │   └── p1.json           # Post-launch P1 tasks
│   ├── setup-guide.md        # Codex + Claude Code orchestration guide
│   └── codex-claude-orchestrator.sh
├── scripts/
│   └── deploy.sh             # One-click Cloudflare deploy
└── .env.example
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- A [Supabase](https://supabase.com) project (PostgreSQL + Auth)
- A [Cloudflare](https://cloudflare.com) account (Workers + R2)
- [Zhipu AI](https://open.bigmodel.cn) API key (GLM-4-Flash, free tier)

### 1. Clone & install

```bash
git clone https://gitee.com/your-org/physics-ai-tutor.git
cd physics-ai-tutor
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
# AI
ZHIPU_API_KEY=your_zhipu_key          # GLM-4-Flash (free)
DASHSCOPE_API_KEY=your_dashscope_key  # Alibaba DashScope (P1, optional for now)

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_DATABASE_URL=postgresql://...

# Cloudflare R2
R2_ACCESS_KEY_ID=your_r2_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_ACCOUNT_ID=your_cf_account_id

# App
FRONTEND_URL=http://localhost:3000
```

For the backend (`apps/server`), create `.dev.vars` (Wrangler local secrets):

```env
ZHIPU_API_KEY=your_zhipu_key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_DATABASE_URL=postgresql://...
R2_ACCESS_KEY_ID=your_r2_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_ACCOUNT_ID=your_cf_account_id
FRONTEND_URL=http://localhost:3000
```

### 3. Set up the database

```bash
# Apply Drizzle migrations to your Supabase project
cd apps/server
pnpm drizzle-kit migrate
```

### 4. Create R2 buckets

```bash
wrangler r2 bucket create lesson-plans
wrangler r2 bucket create question-banks
wrangler r2 bucket create student-uploads
wrangler r2 bucket create exports
wrangler r2 bucket create avatars
```

### 5. Run locally

```bash
# Start both frontend and backend in parallel
pnpm dev

# Or individually:
pnpm --filter web dev       # http://localhost:3000
pnpm --filter server dev    # http://localhost:4000
```

### 6. Verify

- Open `http://localhost:3000` and register as a **teacher**
- Create a class → copy the invite code
- Open a private window, register as a **student**, enter the invite code
- Teacher: go to **AI Question Generation**, select a knowledge point, click **Generate**
- Student: open the published assignment and submit answers

---

## Deployment

### One-click deploy to Cloudflare

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This script:
1. Installs dependencies
2. Builds the shared package
3. Deploys the backend Worker (`apps/server`)
4. Deploys the frontend Worker (`apps/web` via `@opennextjs/cloudflare`)

### Set production secrets

```bash
cd apps/server
pnpm run deploy:secrets
# Prompts for: ZHIPU_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
#              R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID
```

### CI/CD (GitHub Actions)

Push to `main` → `.github/workflows/deploy.yml` auto-deploys backend then frontend.

Required GitHub repository secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## AI Agent Architecture

```
Teacher selects knowledge points
         │
         ▼
  generate-exam Workflow (Mastra)
    ├── Step 1: parse-requirements   Build prompt
    ├── Step 2: generate-questions   GLM-4-Flash → JSON questions
    ├── Step 3: quality-check        Quality checker agent flags issues
    └── Step 4: save-draft           Insert to DB (status = draft)
         │
         ▼
  Teacher reviews in the UI
  (edit / regenerate / delete per question)
         │
         ▼
  Publish → Students answer → Auto-grade → Teacher grades subjective → Publish grades
```

Agents:

| Agent | Role |
|-------|------|
| `question-generator` | Generates physics questions as structured JSON |
| `quality-checker` | Flags physical inaccuracies, ambiguous wording, etc. |
| `lesson-parser` *(P1)* | Extracts knowledge points from uploaded lesson plans |
| `analytics-agent` *(P1)* | Produces teaching suggestions from answer data |

---

## Roadmap

### MVP (current)

- [x] Class management with invite codes
- [x] AI question generation (choice / fill-in / calculation / short-answer)
- [x] Teacher review workflow (draft → publish)
- [x] Student online answering with file attachment support
- [x] Objective question auto-grading with unit-alias normalization
- [x] Subjective question grading center (by-question & by-student views)
- [x] Grade publishing with 24-hour revision window and audit log
- [x] File upload to Cloudflare R2 (lesson plans, question banks, student attachments)
- [x] One-click Cloudflare deployment + GitHub Actions CI/CD

### P1 (post-launch)

- [ ] RAG pipeline — lesson plan parsing with pgvector semantic retrieval
- [ ] Weak-point analysis — knowledge-point error-rate heatmap
- [ ] Personalised practice recommendations
- [ ] Exam PDF export & grade Excel export
- [ ] Question bank management (search, filter, reuse)

### P2 (future)

- [ ] AI-assisted subjective grading
- [ ] Parent portal
- [ ] Mobile app / H5
- [ ] Handwritten formula recognition (OCR → LaTeX)
- [ ] Multi-teacher collaboration

---

## Contributing

1. Fork the repo and create a feature branch
2. Run `pnpm typecheck` before opening a PR
3. Follow the color-token rules in `docs/UI-SPEC.md` — no raw hex values in components
4. Keep MVP and P1 features separated; do not activate P1 code paths in the MVP build

---

## License

MIT
