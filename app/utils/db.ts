import { sql } from '@vercel/postgres';
import { generateEmbedding } from './openai';

// Check for required environment variables
function checkDatabaseConfig() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set. Please check your .env.local file.');
  }
  console.log('✅ Database configuration found');
}

function arrayToVector(arr: number[]): string {
  return `[${arr.join(',')}]`;
}

// Verify database connection
async function verifyConnection() {
  try {
    // Check environment variables first
    checkDatabaseConfig();
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    if (!process.env.POSTGRES_URL) {
      console.error('💡 Hint: Make sure you have set the POSTGRES_URL in your .env.local file');
    }
    return false;
  }
}

export async function searchSimilarResponses(query: string, threshold = 0.8): Promise<{ title: string; contents: string } | null> {
  try {
    // Verify connection before proceeding
    const isConnected = await verifyConnection();
    if (!isConnected) {
      throw new Error('Database connection failed. Please check your database configuration.');
    }

    console.log('🔍 Starting similarity search for query:', query);
    console.log('⚡ Initiating embedding generation process...');
    
    let queryEmbedding;
    try {
      queryEmbedding = await generateEmbedding(query);
      console.log('💫 Query embedding generated successfully');
      console.log(`📏 Embedding length: ${queryEmbedding.length}`);
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw error;
    }

    console.log('🔄 Converting embedding to vector format...');
    const vectorStr = arrayToVector(queryEmbedding);
    console.log('✅ Vector conversion complete');
    
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
    throw error;
  }
}

// This function can be used to initialize or update the database if needed
export async function initializeDatabase() {
  try {
    // Check environment variables first
    checkDatabaseConfig();
    
    // Verify connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      throw new Error('Cannot initialize database: Connection failed');
    }

    console.log('🏗️ Initializing database...');
    
    // Create vector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    console.log('✅ Vector extension check complete');

    // Create data table
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
    return true;
  } catch (error) {
    console.error('🚨 Error initializing database:', error);
    throw error;
  }
}

// Optional: Function to add new documents to the database
export async function addDocument(chunkId: string, title: string, contents: string) {
  try {
    // Verify connection first
    const isConnected = await verifyConnection();
    if (!isConnected) {
      throw new Error('Cannot add document: Database connection failed');
    }

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