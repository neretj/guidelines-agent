-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table to store guidelines with vector embeddings
CREATE TABLE IF NOT EXISTS guidelines (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  condition TEXT NOT NULL,
  action TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(100),
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guidelines_embedding_idx ON guidelines 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_guidelines_stateful (
  query_embedding vector(1536),
  conversation_state jsonb,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id int,
  title varchar,
  condition text,
  action text,
  priority int,
  category varchar,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  accomplished_guidelines int[];
BEGIN
  accomplished_guidelines := COALESCE(
    (SELECT ARRAY(SELECT jsonb_array_elements_text(conversation_state->'accomplished_guidelines')::int)),
    ARRAY[]::int[]
  );
  
  RETURN QUERY
  SELECT
    g.id,
    g.title,
    g.condition,
    g.action,
    g.priority,
    g.category,
    1 - (g.embedding <=> query_embedding) as similarity
  FROM guidelines g
  WHERE g.embedding IS NOT NULL
    AND 1 - (g.embedding <=> query_embedding) > match_threshold
    AND NOT (g.id = ANY(accomplished_guidelines)) 
  ORDER BY 
    g.priority DESC, 
    g.embedding <=> query_embedding  
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_guidelines (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id int,
  title varchar,
  condition text,
  action text,
  priority int,
  category varchar,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.title,
    g.condition,
    g.action,
    g.priority,
    g.category,
    1 - (g.embedding <=> query_embedding) as similarity
  FROM guidelines g
  WHERE g.embedding IS NOT NULL
    AND 1 - (g.embedding <=> query_embedding) > match_threshold
  ORDER BY 
    g.priority DESC, 
    g.embedding <=> query_embedding  
  LIMIT match_count;
END;
$$;

INSERT INTO guidelines (title, condition, action, category, priority) VALUES
('Initial Greeting', 'The user starts a new conversation or sends a greeting.', 'Greet the customer warmly, introduce yourself as a sales assistant, and ask how you can help them today.', 'communication', 0),
('Handling Price Objections', 'The customer expresses concern about the price of a product.', 'Acknowledge the concern, focus on the product''s value and benefits, and if possible, suggest alternatives or payment options.', 'sales', 10),
('Return Policy Inquiry', 'The customer asks about the return policy.', 'Clearly state the 30-day return policy and the requirement that items must be in their original, unused condition.', 'policies', 0),
('Shipping Information Inquiry', 'The customer asks about shipping costs, times, or options.', 'Inform the customer about the free shipping threshold ($50) and the standard 3-5 business day delivery window.', 'logistics', 0),
('Request for Recommendation', 'The customer asks for a product recommendation without specifying their needs.', 'Ask clarifying questions about their requirements, preferences, and use case to provide a tailored recommendation.', 'sales', 5),
('Complaint Handling', 'The customer expresses dissatisfaction or reports a problem with a product or service.', 'Listen actively, express sincere empathy, apologize for the inconvenience, and offer a concrete solution or next step to resolve the issue.', 'customer_service', 20)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state JSONB NOT NULL DEFAULT '{}'::jsonb, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON conversation_sessions
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
