import { NextResponse } from 'next/server';
import { checkQueryType, rewriteQuery, generateFocusedResponse } from '@/app/utils/openai';
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
  ]
};

const EMERGENCY_CONTACTS = `Important Emergency Numbers:
• Police: 100
• Women's Helpline: 1091
• Domestic Abuse Helpline: 181
• Ambulance: 102

Save these numbers in your phone for quick access.`;

export async function POST(request: Request) {
  try {
    console.log('📩 Received chat request');
    const { message } = await request.json();
    console.log('💭 Processing message:', message);

    // Check query type
    console.log('🔍 Checking query type...');
    const queryType = await checkQueryType(message);
    console.log('✅ Query classified as:', queryType);

    // Handle greetings and irrelevant queries
    if (queryType === 'GREETING') {
      console.log('👋 Responding with greeting');
      const randomGreeting = RESPONSES.GREETING[Math.floor(Math.random() * RESPONSES.GREETING.length)];
      return NextResponse.json({ response: randomGreeting });
    }

    if (queryType === 'IRRELEVANT') {
      console.log('⚠️ Query marked as irrelevant');
      const randomResponse = RESPONSES.IRRELEVANT[Math.floor(Math.random() * RESPONSES.IRRELEVANT.length)];
      return NextResponse.json({ response: randomResponse });
    }

    // Process relevant query
    console.log('✨ Processing relevant query');
    const rewrittenQuery = await rewriteQuery(message);
    const result = await searchSimilarResponses(rewrittenQuery);

    if (result) {
      console.log('✅ Found matching response');
      const focusedResponse = await generateFocusedResponse(message, result.contents);
      return NextResponse.json({ 
        response: `${focusedResponse}\n\n${EMERGENCY_CONTACTS}` 
      });
    }

    // Fallback response
    console.log('⚠️ No matching response found, using fallback');
    return NextResponse.json({
      response: `I understand your concern about women's safety. While I don't have a specific answer for this query, here are some important contacts and recommendations:\n\n1. Contact women's helpline: 1091\n2. Police emergency: 100\n3. Domestic abuse helpline: 181\n\n${EMERGENCY_CONTACTS}`
    });

  } catch (error) {
    console.error('🚨 Error processing chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 