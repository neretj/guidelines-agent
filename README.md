# RAG-Powered Sales Assistant

An intelligent sales assistant that uses Retrieval-Augmented Generation (RAG) to provide contextually relevant responses based on stored sales guidelines and best practices.

## What it does

This application creates a conversational AI assistant that:
- Responds to customer inquiries with relevant sales guidance
- Maintains conversation context using stateful session management
- Retrieves and applies appropriate sales guidelines dynamically
- Provides a streaming chat interface for real-time interactions

## Key Technical Elements

### Architecture
- **Frontend**: Next.js 14 with React and TypeScript
- **Backend**: Next.js API routes with Edge Runtime
- **Database**: Supabase with PostgreSQL + pgvector extension
- **AI/ML**: OpenAI GPT-4o-mini for chat completion and text-embedding-3-small for embeddings
- **Vector Search**: Cosine similarity search with IVFFlat indexing

### Core Components
- **RAG Pipeline**: Embeds user queries and retrieves relevant guidelines using semantic search
- **Stateful Sessions**: Tracks conversation state to avoid repeating accomplished guidelines
- **Response Validation**: Ensures AI responses follow retrieved guidelines
- **Streaming Interface**: Real-time chat with server-sent events

### Database Schema
```sql
-- Sales guidelines with condition/action structure
CREATE TABLE guidelines (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  condition TEXT NOT NULL,      -- When to apply
  action TEXT NOT NULL,         -- What to do
  priority INTEGER DEFAULT 0,   -- Priority for conflicts
  category VARCHAR(100),
  embedding vector(1536),       -- For similarity search
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
Generate embeddings for initial sales guidelines:
```bash
npm run seed
```

### Step 5: Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Step 6: Test the Implementation
Try these sample queries:
- "What's the return policy?"
- "How do I handle price objections?"
- "What shipping information should I provide?"

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
│   ├── api/chat/route.ts       # Main RAG logic and streaming
│   ├── page.tsx                # Chat interface
│   └── globals.css             # Styling
├── pages/                      # UI components
└── scripts/seed.ts             # Database seeding script
```
