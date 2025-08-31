import { db } from '../db';
import { apiKeysTable, usersTable } from '../db/schema';
import { type CreateApiKeyInput, type ApiKey } from '../schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function createApiKey(input: CreateApiKeyInput): Promise<{ apiKey: ApiKey; plainKey: string }> {
  try {
    // Verify that the creator user exists
    const creator = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (creator.length === 0) {
      throw new Error(`User with id ${input.created_by} not found`);
    }

    // Generate a secure random API key
    const plainKey = crypto.randomBytes(32).toString('hex');
    
    // Hash the API key for storage
    const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

    // Insert the API key record
    const result = await db.insert(apiKeysTable)
      .values({
        key_name: input.key_name,
        key_hash: keyHash,
        created_by: input.created_by,
        status: 'active'
      })
      .returning()
      .execute();

    const apiKeyRecord = result[0];

    return {
      apiKey: apiKeyRecord,
      plainKey
    };
  } catch (error) {
    console.error('API key creation failed:', error);
    throw error;
  }
}