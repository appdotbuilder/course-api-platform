import { db } from '../db';
import { apiKeysTable } from '../db/schema';
import { type RevokeApiKeyInput, type ApiKey } from '../schema';
import { eq } from 'drizzle-orm';

export const revokeApiKey = async (input: RevokeApiKeyInput): Promise<ApiKey> => {
  try {
    // First, check if the API key exists and is not already revoked
    const existingApiKey = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, input.id))
      .execute();

    if (existingApiKey.length === 0) {
      throw new Error(`API key with id ${input.id} not found`);
    }

    if (existingApiKey[0].status === 'revoked') {
      throw new Error(`API key with id ${input.id} is already revoked`);
    }

    // Update the API key to revoked status with current timestamp
    const result = await db.update(apiKeysTable)
      .set({
        status: 'revoked',
        revoked_at: new Date()
      })
      .where(eq(apiKeysTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('API key revocation failed:', error);
    throw error;
  }
};