import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const runtime = 'edge';

// POST - Regenerate embeddings for guidelines without embeddings
export async function POST() {
  try {
    // Get guidelines without embeddings
    const { data: guidelines, error } = await supabase
      .from('guidelines')
      .select('*')
      .is('embedding', null);

    if (error) {
      console.error('Error fetching guidelines:', error);
      return Response.json({ error: 'Failed to fetch guidelines' }, { status: 500 });
    }

    if (!guidelines || guidelines.length === 0) {
      return Response.json({ message: 'All guidelines already have embeddings', processed: 0 });
    }

    let processed = 0;
    let errors = 0;

    for (const guideline of guidelines) {
      try {
        // Generate embedding
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: guideline.condition,
        });

        const embedding = embeddingResponse.data[0].embedding;

        // Update in database
        const { error: updateError } = await supabase
          .from('guidelines')
          .update({ embedding })
          .eq('id', guideline.id);

        if (updateError) {
          console.error(`Error updating guideline ${guideline.id}:`, updateError);
          errors++;
        } else {
          processed++;
        }

        // Small pause to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing guideline ${guideline.id}:`, error);
        errors++;
      }
    }

    return Response.json({ 
      message: 'Embedding regeneration completed', 
      processed, 
      errors,
      total: guidelines.length 
    });
  } catch (error) {
    console.error('Fatal error in embedding regeneration:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
