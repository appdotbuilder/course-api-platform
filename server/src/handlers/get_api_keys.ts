import { db } from '../db';
import { apiKeysTable } from '../db/schema';
import { type ApiKey } from '../schema';
import { desc } from 'drizzle-orm';

export const getApiKeys = async (): Promise<ApiKey[]> => {
  try {
    // Fetch all API keys ordered by creation date (newest first)
    // Note: We return all fields including key_hash as per the ApiKey schema
    // In a real application, you'd want to exclude key_hash for security
    const results = await db.select()
      .from(apiKeysTable)
      .orderBy(desc(apiKeysTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    throw error;
  }
};