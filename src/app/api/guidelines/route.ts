import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const runtime = 'edge';

// GET - Get all guidelines
export async function GET() {
  try {
    const { data: guidelines, error } = await supabase
      .from('guidelines')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching guidelines:', error);
      return Response.json({ error: 'Failed to fetch guidelines' }, { status: 500 });
    }

    return Response.json(guidelines);
  } catch (error) {
    console.error('Fatal error in GET guidelines:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new guideline
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, condition, action, priority = 0, category } = body;

    // Validate required fields
    if (!title || !condition || !action) {
      return Response.json({ error: 'Title, condition, and action are required' }, { status: 400 });
    }

    // Generate embedding for the new condition
    let embedding = null;
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: condition,
      });
      embedding = embeddingResponse.data[0].embedding;
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError);
      // Continue with creation even if embedding generation fails
    }

    // Insert into database
    const { data, error } = await supabase
      .from('guidelines')
      .insert([{
        title,
        condition,
        action,
        priority: parseInt(priority),
        category,
        embedding // Include the generated embedding
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating guideline:', error);
      return Response.json({ error: 'Failed to create guideline' }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('Fatal error in POST guidelines:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
