import { NextResponse } from 'next/server';
import { checkQueryType, rewriteQuery, extractRelevantPortion } from '@/app/utils/openai';
import { searchSimilarResponses } from '@/app/utils/db';

const RESPONSES = {
  GREETING: [
    "Hello! I'm here to help you with women's safety related questions. How can I assist you today?",
    "Hi! I'm your women's safety assistant. What can I help you with?",
    "Welcome! I'm here to provide support and information about women's safety. What would you like to know?"
  ],
  IRRELEVANT: [
    "I apologize, but I'm specifically trained to help with women's safety related questions. Could you please ask something related to women's safety, personal security, or harassment prevention?",
    "I must decline to respond as this query is not related to women's safety. Please ask a question about safety, security, or support matters."
  ],
  INAPPROPRIATE: [
    "I apologize, but I cannot assist with harmful or inappropriate content. This service is dedicated to providing helpful safety information and support. Please ask an appropriate question about women's safety.",
    "I must decline to respond to inappropriate content. This is a safety-focused service. Please ask questions related to women's safety and support."
  ]
};

export async function POST(request: Request) {
  try {
    console.log('📩 Received chat request');
    const { message, stream = false } = await request.json();
    console.log('💭 Processing message:', message);
    console.log('🌊 Stream mode:', stream ? 'enabled' : 'disabled');

    // Check query type
    console.log('🔍 Checking query type...');
    const queryType = await checkQueryType(message);
    console.log('✅ Query classified as:', queryType);

    // Handle non-relevant queries
    if (queryType === 'GREETING') {
      console.log('👋 Responding with greeting');
      const randomGreeting = RESPONSES.GREETING[Math.floor(Math.random() * RESPONSES.GREETING.length)];
      return NextResponse.json({ response: randomGreeting });
    }

    if (queryType === 'IRRELEVANT' || queryType === 'INAPPROPRIATE') {
      console.log(`⚠️ Query marked as ${queryType.toLowerCase()}`);
      const responses = RESPONSES[queryType];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      return NextResponse.json({ response: randomResponse });
    }

    // Process relevant query
    try {
      console.log('✨ Processing relevant query');
      console.log('🔄 Starting query rewrite process...');
      const rewrittenQuery = await rewriteQuery(message);
      console.log('📝 Rewritten query:', rewrittenQuery);

      console.log('🔍 Searching for similar responses...');
      const result = await searchSimilarResponses(rewrittenQuery);

      if (result) {
        console.log('✅ Found matching response');
        console.log('📑 Extracting relevant content...');
        
        if (stream) {
          console.log('🌊 Using streaming mode for response');
          const streamResponse = await extractRelevantPortion(message, result.contents, true) as ReadableStream<Uint8Array>;
          
          return new Response(streamResponse, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }
        
        // Non-streaming mode
        const relevantContent = await extractRelevantPortion(message, result.contents) as string;
        
        if (relevantContent === "No specific information found in the database.") {
          console.log('⚠️ No specific information found');
          return NextResponse.json({ 
            response: "I apologize, but I don't have specific information about that in my database. Please try rephrasing your question or ask about a different safety concern."
          });
        }

        return NextResponse.json({ 
          response: relevantContent
        });
      }

      console.log('⚠️ No matching response found');
      return NextResponse.json({
        response: "I apologize, but I don't have any information about that in my database. Please try asking a different question about women's safety."
      });

    } catch (error: Error | unknown) {
      console.error('🚨 Error processing query:', error);
      
      // Type guard to ensure error is treated as an object with message property
      const errorWithMessage = error as { message?: string };
      
      if (errorWithMessage.message?.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          { 
            error: 'OpenAI API configuration error. Please check environment variables.',
            details: process.env.NODE_ENV === 'development' ? errorWithMessage.message : undefined
          },
          { status: 503 }
        );
      }
      
      if (errorWithMessage.message?.includes('POSTGRES_URL')) {
        return NextResponse.json(
          { 
            error: 'Database configuration error. Please check environment variables.',
            details: process.env.NODE_ENV === 'development' ? errorWithMessage.message : undefined
          },
          { status: 503 }
        );
      }
      
      throw error; // Re-throw for general error handling
    }

  } catch (error) {
    console.error('🚨 Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 