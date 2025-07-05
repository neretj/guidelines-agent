# AI Agent with Dynamic Guidelines

AI agent that **dynamically controls its behavior through guidelines** - inspired by [parlant.io's implementation](https://www.parlant.io/docs/concepts/customization/guidelines). The agent pulls behavioral instructions from a database and adapts its responses based on contextually relevant guidelines.

## What it does

This application creates a conversational AI assistant that:
- **Pulls behavioral guidelines** from a database using semantic search
- **Dynamically constructs system prompts** based on matching guidelines
- **Responds contextually** by applying relevant guidelines to each user interaction
- **Provides transparency** through a real-time sidebar showing which guidelines are active and why
- **Validates responses** to ensure guidelines are properly followed

## Key Technical Elements

### Architecture
- **Frontend**: Next.js 14 with React and TypeScript
- **Backend**: Next.js API routes with Edge Runtime
- **Database**: Supabase with PostgreSQL + pgvector extension
- **AI/ML**: OpenAI GPT-4o-mini for chat completion and text-embedding-3-small for embeddings
- **Vector Search**: Cosine similarity search with semantic matching

### Core Innovation: Guidelines Engine
The system implements a guidelines matching pipeline:

1. **Semantic Retrieval**: Embeds user queries and retrieves candidate guidelines using vector search
2. **LLM-based Analysis**: Uses GPT-4o-mini to analyze each guideline and determine:
   - Whether it applies to the current context
   - Relevance score (0-10)
   - Reasoning for the decision
3. **Dynamic Prompt Construction**: Builds system prompts using only applicable guidelines
4. **Response Validation**: Supervises and corrects responses to ensure guideline compliance
5. **Real-time Visualization**: Shows active guidelines, scores, and reasoning in a sidebar

### Database Schema
```sql
-- Behavioral guidelines with condition/action structure
CREATE TABLE guidelines (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  condition TEXT NOT NULL,      -- When to apply this guideline
  action TEXT NOT NULL,         -- What the AI should do
  priority INTEGER DEFAULT 0,   -- Priority for handling conflicts
  category VARCHAR(100),
  embedding vector(1536),       -- For semantic search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session state management
CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Complete Local Deployment Instructions

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Supabase account (free tier works)
- OpenAI API key

### Step 1: Clone and Install
```bash
git clone <repository-url>
cd uptail
npm install
```

### Step 2: Set up Supabase Database
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings > API** and copy:
   - Project URL
   - Anon public key
3. Go to **SQL Editor** and run the complete schema from `supabase-setup.sql`
4. Verify pgvector extension is enabled in **Extensions**

### Step 3: Configure Environment Variables
Create `.env.local` in the root directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 4: Seed the Database
Generate embeddings for initial behavioral guidelines:
```bash
npm run seed
```

### Step 5: Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Step 6: Test the Guidelines Engine
Try these sample queries to see different guidelines activate:
- "What's your return policy?" (activates policy-related guidelines)
- "How much does shipping cost?" (activates pricing/shipping guidelines)
- "I'm not sure about this purchase" (activates objection-handling guidelines)
- "Tell me about your company" (activates company information guidelines)

Watch the **right sidebar** to see which guidelines are evaluated, their relevance scores, and reasoning.

### Production Deployment (Optional)
For Vercel deployment:
```bash
vercel --prod
```
Add the same environment variables in Vercel dashboard.

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts           # Main guidelines engine and streaming
│   │   └── guidelines/route.ts     # CRUD operations for guidelines
│   ├── pages/
│   │   ├── Dashboard.tsx           # Main UI orchestrator
│   │   ├── ChatPanel.tsx          # Chat interface
│   │   ├── GuidelinePanel.tsx     # Guidelines management (left panel)
│   │   ├── GuidelinesSidebar.tsx  # Active guidelines visualization (right panel)
│   │   └── types.ts               # TypeScript interfaces
│   └── globals.css                # Styling
├── scripts/seed.ts                # Database seeding script
└── supabase-setup.sql            # Database schema
```

## Key Features

### 1. Guidelines Management
- Create, edit, and delete behavioral guidelines
- Categorize guidelines for better organization
- Set priority levels for conflict resolution

### 2. Intelligent Matching
- Semantic search finds relevant guidelines
- LLM analysis determines applicability with scoring
- Transparent reasoning for each decision

### 3. Real-time Visualization
- Right sidebar shows active guidelines
- Displays relevance scores and reasoning

### 4. Response Validation
- Dual-pass system: initial response + validation
- Ensures AI follows all applicable guidelines
- Automatic correction if guidelines aren't followed

