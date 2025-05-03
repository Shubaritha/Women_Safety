import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type QueryType = 'GREETING' | 'RELEVANT' | 'IRRELEVANT' | 'INAPPROPRIATE';

const RELEVANCE_CHECK_INSTRUCTIONS = `You are a women's safety assistant. Given the user's message, determine if it is:

1. A greeting or casual message (like "hello", "thank you", "goodbye")
2. Related to women's safety topics:
   - Personal safety and security
   - Harassment prevention and response
   - Emergency situations and procedures
   - Self-defense techniques
   - Legal rights and support
   - Support services and resources
   - Ngo's (Non-Governmental Organizations) and their contact numbers
   - Safety while traveling
   - Workplace safety
   - Domestic violence
   - Cybersecurity and online safety
3. Inappropriate or harmful content
4. Unrelated to women's safety

Respond with only one word:
GREETING - for category 1
RELEVANT - for category 2
INAPPROPRIATE - for category 3
IRRELEVANT - for category 4`;

export async function checkQueryType(query: string): Promise<QueryType> {
  console.log('🔍 Analyzing query type:', query);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: RELEVANCE_CHECK_INSTRUCTIONS
      },
      {
        role: "user",
        content: query
      }
    ],
    temperature: 0,
    max_tokens: 10
  });

  const classification = response.choices[0].message.content?.trim().toUpperCase() as QueryType;
  console.log('✅ Query classified as:', classification);
  return classification;
}

export async function rewriteQuery(query: string): Promise<string> {
  console.log('🔄 Rewriting query for better context');
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a women's safety assistant. Rewrite the user's query to be more focused on women's safety aspects while maintaining the original intent. 
        Consider:
        - Personal safety concerns
        - Emergency situations
        - Legal rights and support
        - Safety resources and services
        - Prevention strategies
        Make it clear and specific for database search.`
      },
      {
        role: "user",
        content: query
      }
    ],
    temperature: 0.3,
    max_tokens: 100
  });

  const rewrittenQuery = response.choices[0].message.content || query;
  console.log('✅ Query rewritten as:', rewrittenQuery);
  return rewrittenQuery;
}

export async function extractRelevantPortion(query: string, content: string, stream = false): Promise<string | ReadableStream<Uint8Array>> {
  console.log('📝 Extracting relevant portion from database content');
  
  const systemPrompt = `Extract ONLY the specific portions from the provided database content that directly answer the user's safety-related query. 
  Rules:
  1. ONLY use text that exists in the provided content
  2. DO NOT generate new text or explanations
  3. DO NOT modify or rephrase the content
  4. If multiple relevant portions exist, separate them with newlines
  5. If no relevant portion exists, return "No specific information found in the database."
  6. DO NOT add any additional context or explanations
  7. NEVER cut off mid-sentence or paragraph - always include complete information
  8. Summarize and give the most relevant information
  9. Prioritize actionable safety information and emergency procedures
  10. Ensure all information is complete and not truncated`;

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt
    },
    {
      role: "user" as const,
      content: `Query: ${query}\nContent: ${content}`
    }
  ];
  
  if (stream) {
    console.log('🌊 Using streaming mode for response');
    const streamResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0,
      max_tokens: 1000,
      stream: true
    });
    
    console.log('✅ Stream initialized');
    // Convert OpenAI stream to a standard ReadableStream
    const textEncoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of streamResponse) {
          try {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(textEncoder.encode(content));
            }
          } catch (error) {
            console.error('Error processing stream chunk:', error);
            controller.error(error);
          }
        }
        controller.close();
      }
    });
    
    return readableStream;
  }
  
  // Non-streaming mode (original behavior)
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0,
    max_tokens: 1000
  });

  const extractedContent = response.choices[0].message.content || "No specific information found in the database.";
  
  // Check if content appears to be cut off mid-sentence
  if (extractedContent.length > 0 && 
      !extractedContent.endsWith('.') && 
      !extractedContent.endsWith('!') && 
      !extractedContent.endsWith('?') &&
      !extractedContent.endsWith('\n')) {
    console.log('⚠️ Content appears to be cut off, returning partial information note');
    return extractedContent + "... (Some information may be incomplete. Please ask for more specific details.)";
  }
  
  console.log('✅ Extracted relevant content from database');
  return extractedContent;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    console.log('🚀 Starting embedding generation for text:', text.substring(0, 50) + '...');
    console.log('📡 Calling OpenAI embeddings API...');
    
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    console.log('✅ Embedding generated successfully');
    console.log(`📊 Embedding dimensions: ${response.data[0].embedding.length}`);
    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw error;
  }
} 