import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

interface Guideline {
  id: number;
  title: string;
  condition: string;
  action: string;
  priority: number;
  category: string;
  similarity: number;
}

interface GuidelineMatchResult {
  guideline_id: number;
  applies: boolean;
  score: number; // Relevance score 0-10
  reason: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export const runtime = "edge";

/**
 * Analyzes each candidate guideline to provide a detailed match result.
 * Returns a score, reasoning, and a boolean indicating if it applies.
 */
async function guidelineMatching(candidates: Guideline[], userMessage: string, conversationHistory: any[]): Promise<GuidelineMatchResult[]> {
  if (!candidates || candidates.length === 0) return [];

  const context = conversationHistory
    .slice(-2)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const matchingPrompt = `
    Analyze the provided conversation and determine if each of the following guidelines should be applied for the NEXT response.

    CONVERSATION CONTEXT:
    ${context}

    CURRENT USER MESSAGE: "${userMessage}"

    GUIDELINES TO EVALUATE:
    ${candidates.map((g) => `ID ${g.id}: IF "${g.condition}" THEN "${g.action}"`).join("\n")}

    For each guideline, provide a JSON object with your analysis. Your response must be a JSON array of these objects.
    Each object must have these keys:
    - "guideline_id": (number) The ID of the guideline.
    - "applies": (boolean) True if the guideline's condition is met and its action is relevant now.
    - "score": (number) A relevance score from 0 (not relevant) to 10 (perfectly relevant).
    - "reason": (string) A brief explanation for your score and decision.

    Example response for a single guideline:
    { "guideline_id": 1, "applies": true, "score": 9, "reason": "The user is explicitly asking for pricing, which matches the guideline's condition." }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: matchingPrompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const responseObject = JSON.parse(response.choices[0]?.message?.content || "[]");
    const resultsArray = Array.isArray(responseObject) ? responseObject : Object.values(responseObject)[0];

    if (!Array.isArray(resultsArray)) {
      console.error("Guideline matching did not return a valid array.", resultsArray);
      return [];
    }

    return resultsArray as GuidelineMatchResult[];
  } catch (error) {
    console.error("Error in guideline matching:", error);
    return []; 
  }
}

/**
 * Validates the initial response against guidelines and reformulates it if necessary.
 * Returns a streaming response from OpenAI.
 */
async function superviseAndCorrectResponseStream(
  initialResponse: string,
  activeGuidelines: Guideline[],
  userMessage: string,
  conversationHistory: any[]
): Promise<AsyncIterable<any>> {
  if (activeGuidelines.length === 0) {
    // If no guidelines, return the initial response as a single chunk
    return (async function* () {
      yield { choices: [{ delta: { content: initialResponse } }] };
    })();
  }

  const context = conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n");

  const correctionPrompt = `
    You are a quality assurance AI. Your task is to validate and, if necessary, reformulate an initial response to ensure it perfectly follows a set of instructions (guidelines).

    CONVERSATION HISTORY:
    ${context}
    user: ${userMessage}

    INSTRUCTIONS TO FOLLOW:
    ${activeGuidelines.map((g) => `- ${g.action}`).join("\n")}

    INITIAL RESPONSE DRAFT:
    "${initialResponse}"

    ANALYSIS AND ACTION:
    1.  Read the initial response draft.
    2.  Compare it against the instructions. Does it follow ALL of them correctly and completely?
    3.  If the draft is perfect, return it as is.
    4.  If the draft is missing something, is incorrect, or could be better, REWRITE it from scratch to be the perfect response that follows all instructions.

    Return only the final, corrected response text, without any extra explanations or preamble.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [{ role: "system", content: correctionPrompt }],
      temperature: 0.2, // low creativity for precise reformulation
      stream: true, // Enable streaming
    });

    return response;
  } catch (error) {
    console.error("Error in response correction:", error);
    // Return initial response as fallback
    return (async function* () {
      yield { choices: [{ delta: { content: initialResponse } }] };
    })();
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, sessionId: currentSessionId } = body;
    const userMessage = messages[messages.length - 1].content;

    // --- Session Management ---
    let sessionId = currentSessionId;
    if (!sessionId) {
      const { data } = await supabase.from("conversation_sessions").insert({ state: {} }).select("id").single();
      if (!data) throw new Error("Failed to create session.");
      sessionId = data.id;
    }

    // --- Guideline Retrieval (Vector Search) ---
    const contextualInput = messages
      .slice(-3)
      .map((m: any) => m.content)
      .join(" ");
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: contextualInput,
    });
    const { data: candidateGuidelines } = await supabase.rpc("match_guidelines", {
      query_embedding: embeddingResponse.data[0].embedding,
      match_threshold: 0.4,
      match_count: 10,
    });

    // --- Guideline Matching (LLM-based Analysis) ---
    const matchingResults = await guidelineMatching(candidateGuidelines || [], userMessage, messages);

    // Filter for guidelines that the LLM marked as applicable
    const activeGuidelines = (candidateGuidelines || []).filter((g: Guideline) => matchingResults.some((r) => r.guideline_id === g.id && r.applies === true));

    // --- Initial Response Generation ---
    const dynamicActions =
      activeGuidelines.length > 0
        ? "Follow these instructions precisely:\n" + activeGuidelines.map((g: { action: any; }) => `* ${g.action}`).join("\n")
        : "No specific instructions apply. Respond helpfully.";

    const systemPrompt = `You are Alex, a helpful assistant.
    ---
    CURRENT TASK:
    ${dynamicActions}
    ---`;

    const initialLlmResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    });
    const initialResponseText = initialLlmResponse.choices[0].message.content || "";

    // --- Response Validation and Correction with Streaming ---
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 1. Send session ID
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId })}\n\n`));

        // 2. Get and stream the final, corrected content from OpenAI
        const correctionStream = await superviseAndCorrectResponseStream(initialResponseText, activeGuidelines, userMessage, messages);
        
        for await (const chunk of correctionStream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }

        // 3. Send final metadata, including the detailed matching results
        const finalData = {
          guidelineMatchingResults: matchingResults,
          activeGuidelines: activeGuidelines,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`));

        // 4. Signal end of stream
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error: any) {
    console.error("Error in chat endpoint:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
