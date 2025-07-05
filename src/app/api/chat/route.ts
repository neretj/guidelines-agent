import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Interfaces
interface Guideline {
  id: number;
  title: string;
  condition: string;
  action: string;
  priority: number;
  category: string;
  similarity: number;
}

interface ValidationResult {
  guidelineId: number;
  followed: boolean;
  reason: string;
}

// Clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const runtime = 'edge';

async function filterRelevantGuidelines(guidelines: Guideline[], userMessage: string): Promise<Guideline[]> {
  if (!guidelines || guidelines.length === 0) return [];

  const validationPrompt = `
    You are a rule-checker. For each guideline, determine if its "condition" is met by the "user message".
    Respond ONLY with a valid JSON array of objects, each with "id" and "is_met" (boolean).
    USER MESSAGE: "${userMessage}"
    GUIDELINES TO CHECK: ${JSON.stringify(guidelines.map(g => ({ id: g.id, condition: g.condition })))}
  `;

  try {
    const validationResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: validationPrompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(validationResponse.choices[0]?.message?.content || '[]');
    const checkedIds = (result.results || result)
        .filter((item: { id: number; is_met: boolean }) => item.is_met)
        .map((item: { id: number; is_met: boolean }) => item.id);
    
    return guidelines.filter(g => checkedIds.includes(g.id));
  } catch (error) {
    console.error('Error filtering relevant guidelines:', error);
    return [];
  }
}

async function validateResponse(response: string, triggeredGuidelines: Guideline[]): Promise<ValidationResult[]> {
  if (!triggeredGuidelines || triggeredGuidelines.length === 0) return [];

  const validationPrompt = `
    You are a QA analyst. Check if the assistant's response follows each action.
    ASSISTANT'S RESPONSE: "${response}"
    ACTIONS TO VALIDATE: ${JSON.stringify(triggeredGuidelines.map(g => ({ id: g.id, action: g.action })))}
    Your output MUST be a valid JSON array of objects with "guidelineId" (number), "followed" (boolean), and "reason" (string).
  `;

  try {
    const validationResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: validationPrompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(validationResponse.choices[0]?.message?.content || '[]');
    return result.validation_results || result;
  } catch (error) {
    console.error('Validation error:', error);
    return triggeredGuidelines.map(g => ({
      guidelineId: g.id,
      followed: false,
      reason: 'Could not validate due to a system error.',
    }));
  }
}

export async function POST(req: Request) {
  try {
    const { messages, sessionId: currentSessionId } = await req.json();
    const userMessage = messages[messages.length - 1].content;

    let sessionId = currentSessionId;
    let sessionState: { accomplished_guidelines?: number[] } = {};

    if (sessionId) {
      const { data } = await supabase.from('conversation_sessions').select('state').eq('id', sessionId).single();
      sessionState = data?.state || {};
    } else {
      const { data } = await supabase.from('conversation_sessions').insert({ state: {} }).select('id').single();
      if (!data) throw new Error('Could not create a new session.');
      sessionId = data.id;
    }

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: userMessage,
    });
    const userMessageEmbedding = embeddingResponse.data[0].embedding;

    const { data: candidateGuidelines } = await supabase.rpc('match_guidelines_stateful', {
      query_embedding: userMessageEmbedding,
      conversation_state: sessionState,
      match_threshold: 0.3,
      match_count: 5,
    });

    const relevantGuidelines = await filterRelevantGuidelines(candidateGuidelines || [], userMessage);

    const dynamicActions = relevantGuidelines.length > 0
      ? relevantGuidelines.map((g: Guideline) => `* ${g.action}`).join('\n')
      : 'No specific actions found, respond naturally.';
    
    const systemPrompt = `You are Alex, a friendly sales assistant.
      --- CURRENT TASK ---
      Based on the user's message, follow these instructions precisely:
      ${dynamicActions}
      --- END OF TASK ---
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId })}\n\n`));
          
          let fullResponse = '';
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }

          const validationResults = await validateResponse(fullResponse, relevantGuidelines);
          const successfullyFollowedIds = validationResults.filter(r => r.followed).map(r => r.guidelineId);
          const newAccomplishedGuidelineIds = [...new Set([...(sessionState.accomplished_guidelines || []),...successfullyFollowedIds])];
          
          await supabase
            .from('conversation_sessions')
            .update({ state: { accomplished_guidelines: newAccomplishedGuidelineIds } })
            .eq('id', sessionId);
          
          const finalData = {
            activeGuidelines: relevantGuidelines.map(g => ({...g, triggered_at: new Date().toLocaleTimeString()})),
            accomplishedGuidelines: newAccomplishedGuidelineIds,
            validationResults: validationResults,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`));

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return new Response('Error processing request', { status: 500 });
  }
}