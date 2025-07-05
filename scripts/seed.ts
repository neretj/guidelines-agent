import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function generateEmbeddings() {
  try {
    console.log('Starting embedding generation process...');
    
    const { data: guidelines, error } = await supabase
      .from('guidelines')
      .select('*')
      .is('embedding', null);

    if (error) {
      return;
    }

    if (!guidelines || guidelines.length === 0) {
      return;
    }

    for (const guideline of guidelines) {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: guideline.condition, // Use the condition for the embedding
      });

      const embedding = embeddingResponse.data[0].embedding;
      console.log(`Generated embedding (length: ${embedding.length})`);

      const { error: updateError } = await supabase
        .from('guidelines')
        .update({ embedding })
        .eq('id', guideline.id);

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Process completed successfully');
    
  } catch (error) {
    console.error('Error in embedding generation process:', error);
    process.exit(1);
  }
}

generateEmbeddings();
