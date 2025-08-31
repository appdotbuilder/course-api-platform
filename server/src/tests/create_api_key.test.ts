import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { apiKeysTable, usersTable } from '../db/schema';
import { type CreateApiKeyInput } from '../schema';
import { createApiKey } from '../handlers/create_api_key';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('createApiKey', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user for API key creation
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  const testInput: CreateApiKeyInput = {
    key_name: 'Test API Key',
    created_by: 0 // Will be set to testUserId in tests
  };

  it('should create an API key successfully', async () => {
    const input = { ...testInput, created_by: testUserId };
    const result = await createApiKey(input);

    // Verify the returned API key structure
    expect(result.apiKey.key_name).toEqual('Test API Key');
    expect(result.apiKey.created_by).toEqual(testUserId);
    expect(result.apiKey.status).toEqual('active');
    expect(result.apiKey.id).toBeDefined();
    expect(result.apiKey.created_at).toBeInstanceOf(Date);
    expect(result.apiKey.revoked_at).toBeNull();

    // Verify the plain key is generated
    expect(result.plainKey).toBeDefined();
    expect(typeof result.plainKey).toBe('string');
    expect(result.plainKey.length).toBe(64); // 32 bytes hex = 64 characters

    // Verify the key hash is correctly generated
    const expectedHash = crypto.createHash('sha256').update(result.plainKey).digest('hex');
    expect(result.apiKey.key_hash).toEqual(expectedHash);
  });

  it('should save API key to database', async () => {
    const input = { ...testInput, created_by: testUserId };
    const result = await createApiKey(input);

    // Query the database to verify the API key was saved
    const apiKeys = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, result.apiKey.id))
      .execute();

    expect(apiKeys).toHaveLength(1);
    expect(apiKeys[0].key_name).toEqual('Test API Key');
    expect(apiKeys[0].created_by).toEqual(testUserId);
    expect(apiKeys[0].status).toEqual('active');
    expect(apiKeys[0].created_at).toBeInstanceOf(Date);
    expect(apiKeys[0].revoked_at).toBeNull();
  });

  it('should generate unique keys for multiple API keys', async () => {
    const input1 = { ...testInput, key_name: 'API Key 1', created_by: testUserId };
    const input2 = { ...testInput, key_name: 'API Key 2', created_by: testUserId };

    const result1 = await createApiKey(input1);
    const result2 = await createApiKey(input2);

    // Verify keys are different
    expect(result1.plainKey).not.toEqual(result2.plainKey);
    expect(result1.apiKey.key_hash).not.toEqual(result2.apiKey.key_hash);
    expect(result1.apiKey.id).not.toEqual(result2.apiKey.id);
  });

  it('should throw error when creator user does not exist', async () => {
    const input = { ...testInput, created_by: 99999 };

    await expect(createApiKey(input)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should create API key with different key names', async () => {
    const input = { ...testInput, key_name: 'Production API Key', created_by: testUserId };
    const result = await createApiKey(input);

    expect(result.apiKey.key_name).toEqual('Production API Key');
    expect(result.apiKey.created_by).toEqual(testUserId);
    expect(result.plainKey).toBeDefined();
  });

  it('should create API key with proper default status', async () => {
    const input = { ...testInput, created_by: testUserId };
    const result = await createApiKey(input);

    expect(result.apiKey.status).toEqual('active');
    expect(result.apiKey.revoked_at).toBeNull();
  });
});