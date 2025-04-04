import { sql } from '@vercel/postgres';
import { generateEmbedding } from './openai';

function arrayToVector(arr: number[]): string {
  return `[${arr.join(',')}]`;
}

export async function searchSimilarResponses(query: string, threshold = 0.8): Promise<{ title: string; contents: string } | null> {
  console.log('🔍 Starting similarity search for query:', query);
  console.log('⚙️ Generating embedding for query...');
  const queryEmbedding = await generateEmbedding(query);
  console.log('✅ Embedding generated, converting to vector format');
  const vectorStr = arrayToVector(queryEmbedding);
  
  try {
    console.log('📊 Executing vector similarity search...');
    const result = await sql`
      SELECT title, contents, 1 - (vector <=> ${vectorStr}::vector) as similarity
      FROM data
      WHERE 1 - (vector <=> ${vectorStr}::vector) > ${threshold}
      ORDER BY similarity DESC
      LIMIT 1;
    `;

    if (result.rows.length > 0) {
      console.log('✨ Found matching document with similarity:', result.rows[0].similarity);
      return {
        title: result.rows[0].title,
        contents: result.rows[0].contents
      };
    }
    console.log('❌ No matching documents found above threshold:', threshold);
    return null;
  } catch (error) {
    console.error('🚨 Error searching responses:', error);
    return null;
  }
}

// This function can be used to initialize or update the database if needed
export async function initializeDatabase() {
  try {
    console.log('🏗️ Initializing database...');
    await sql`
      CREATE EXTENSION IF NOT EXISTS vector;
    `;
    console.log('✅ Vector extension check complete');

    await sql`
      CREATE TABLE IF NOT EXISTS data (
        id SERIAL PRIMARY KEY,
        chunk_id TEXT NOT NULL,
        title TEXT NOT NULL,
        contents TEXT NOT NULL,
        vector vector(1536)
      );
    `;
    console.log('✅ Data table check complete');
  } catch (error) {
    console.error('🚨 Error initializing database:', error);
  }
}

// Optional: Function to add new documents to the database
export async function addDocument(chunkId: string, title: string, contents: string) {
  try {
    console.log('📝 Adding new document:', { chunkId, title });
    console.log('⚙️ Generating embedding for contents...');
    const embedding = await generateEmbedding(contents);
    const vectorStr = arrayToVector(embedding);
    console.log('✅ Embedding generated, inserting into database...');
    
    await sql`
      INSERT INTO data (chunk_id, title, contents, vector)
      VALUES (${chunkId}, ${title}, ${contents}, ${vectorStr}::vector);
    `;
    console.log('✅ Document successfully added to database');
    return true;
  } catch (error) {
    console.error('🚨 Error adding document:', error);
    return false;
  }
} 