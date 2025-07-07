import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const runtime = 'edge';

// GET - Get specific guideline
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const { data, error } = await supabase
      .from('guidelines')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching guideline:', error);
      return Response.json({ error: 'Guideline not found' }, { status: 404 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('Fatal error in GET guideline:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update guideline
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const { title, condition, action, priority, category } = body;

    // Validate required fields
    if (!title || !condition || !action) {
      return Response.json({ error: 'Title, condition, and action are required' }, { status: 400 });
    }

    // Generate embedding for the updated condition
    let embedding = null;
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: condition,
      });
      embedding = embeddingResponse.data[0].embedding;
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError);
      // Continue with update even if embedding generation fails
    }

    // Update in database with the new embedding
    const { data, error } = await supabase
      .from('guidelines')
      .update({
        title,
        condition,
        action,
        priority: parseInt(priority),
        category,
        embedding, // Include the new embedding
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating guideline:', error);
      return Response.json({ error: 'Failed to update guideline' }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('Fatal error in PUT guideline:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete guideline
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // First get the guideline to show info
    const { data: guideline } = await supabase
      .from('guidelines')
      .select('title')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('guidelines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting guideline:', error);
      return Response.json({ error: 'Failed to delete guideline' }, { status: 500 });
    }

    return Response.json({ message: 'Guideline deleted successfully' });
  } catch (error) {
    console.error('Fatal error in DELETE guideline:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
