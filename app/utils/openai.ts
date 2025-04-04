import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type QueryType = 'GREETING' | 'RELEVANT' | 'IRRELEVANT';

export async function checkQueryType(query: string): Promise<QueryType> {
  console.log('🔍 Analyzing query type:', query);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a women's safety assistant. Classify the user query into exactly one of these categories:
        - GREETING: For greetings, introductions, or casual conversation starters
        - RELEVANT: For queries related to women's safety, security, harassment, support, or any safety concerns
        - IRRELEVANT: For queries unrelated to women's safety or inappropriate content
        Respond with only one word: GREETING, RELEVANT, or IRRELEVANT.`
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
        content: "You are a women's safety assistant. Rewrite the user's query to be more focused on women's safety aspects while maintaining the original intent. Make it clear and specific."
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

export async function generateFocusedResponse(query: string, content: string): Promise<string> {
  console.log('📝 Generating focused response');
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a women's safety assistant. Using the provided content, generate a concise and relevant response to the user's query.
        Rules:
        1. Only include information that directly answers the query
        2. Keep the response brief and focused
        3. Use bullet points for multiple steps or recommendations
        4. Include only the most relevant safety tips or advice
        5. Do not include any irrelevant information from the content
        6. Format the response in a clear, easy-to-read manner
        7. porper formatting of the response`
      },
      {
        role: "user",
        content: `Query: ${query}\nContent: ${content}`
      }
    ],
    temperature: 0.3,
    max_tokens: 500
  });

  const focusedResponse = response.choices[0].message.content || "I apologize, but I couldn't generate a specific response.";
  console.log('✅ Generated focused response');
  return focusedResponse;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  console.log('⚙️ Generating embedding for text');
  
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });

  console.log('✅ Embedding generated');
  return response.data[0].embedding;
} 