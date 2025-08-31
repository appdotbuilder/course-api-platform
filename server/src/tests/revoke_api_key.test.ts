import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, apiKeysTable } from '../db/schema';
import { type RevokeApiKeyInput } from '../schema';
import { revokeApiKey } from '../handlers/revoke_api_key';
import { eq } from 'drizzle-orm';

describe('revokeApiKey', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testApiKeyId: number;

  beforeEach(async () => {
    // Create a test user first
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

    // Create a test API key
    const apiKeyResult = await db.insert(apiKeysTable)
      .values({
        key_name: 'Test API Key',
        key_hash: 'hashed_api_key_123',
        created_by: testUserId,
        status: 'active'
      })
      .returning()
      .execute();

    testApiKeyId = apiKeyResult[0].id;
  });

  it('should revoke an active API key', async () => {
    const input: RevokeApiKeyInput = {
      id: testApiKeyId
    };

    const result = await revokeApiKey(input);

    // Verify the result
    expect(result.id).toEqual(testApiKeyId);
    expect(result.key_name).toEqual('Test API Key');
    expect(result.key_hash).toEqual('hashed_api_key_123');
    expect(result.created_by).toEqual(testUserId);
    expect(result.status).toEqual('revoked');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.revoked_at).toBeInstanceOf(Date);
    expect(result.revoked_at).not.toBeNull();
  });

  it('should update API key in database', async () => {
    const input: RevokeApiKeyInput = {
      id: testApiKeyId
    };

    const beforeRevocation = new Date();
    await revokeApiKey(input);

    // Query the database to verify the update
    const updatedApiKey = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, testApiKeyId))
      .execute();

    expect(updatedApiKey).toHaveLength(1);
    expect(updatedApiKey[0].status).toEqual('revoked');
    expect(updatedApiKey[0].revoked_at).toBeInstanceOf(Date);
    expect(updatedApiKey[0].revoked_at!.getTime()).toBeGreaterThanOrEqual(beforeRevocation.getTime());
  });

  it('should throw error when API key does not exist', async () => {
    const input: RevokeApiKeyInput = {
      id: 99999 // Non-existent ID
    };

    await expect(revokeApiKey(input)).rejects.toThrow(/API key with id 99999 not found/i);
  });

  it('should throw error when API key is already revoked', async () => {
    // First revoke the API key
    const input: RevokeApiKeyInput = {
      id: testApiKeyId
    };

    await revokeApiKey(input);

    // Try to revoke it again
    await expect(revokeApiKey(input)).rejects.toThrow(/API key with id \d+ is already revoked/i);
  });

  it('should handle multiple API keys correctly', async () => {
    // Create another API key
    const secondApiKeyResult = await db.insert(apiKeysTable)
      .values({
        key_name: 'Second API Key',
        key_hash: 'hashed_api_key_456',
        created_by: testUserId,
        status: 'active'
      })
      .returning()
      .execute();

    const secondApiKeyId = secondApiKeyResult[0].id;

    // Revoke only the first API key
    const input: RevokeApiKeyInput = {
      id: testApiKeyId
    };

    await revokeApiKey(input);

    // Verify first API key is revoked
    const firstApiKey = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, testApiKeyId))
      .execute();

    expect(firstApiKey[0].status).toEqual('revoked');

    // Verify second API key is still active
    const secondApiKey = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, secondApiKeyId))
      .execute();

    expect(secondApiKey[0].status).toEqual('active');
    expect(secondApiKey[0].revoked_at).toBeNull();
  });

  it('should preserve all other API key fields when revoking', async () => {
    const input: RevokeApiKeyInput = {
      id: testApiKeyId
    };

    // Get the original API key data
    const originalApiKey = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, testApiKeyId))
      .execute();

    const original = originalApiKey[0];

    // Revoke the API key
    const result = await revokeApiKey(input);

    // Verify all fields except status and revoked_at remain unchanged
    expect(result.id).toEqual(original.id);
    expect(result.key_name).toEqual(original.key_name);
    expect(result.key_hash).toEqual(original.key_hash);
    expect(result.created_by).toEqual(original.created_by);
    expect(result.created_at.getTime()).toEqual(original.created_at.getTime());
    
    // Verify only status and revoked_at changed
    expect(result.status).toEqual('revoked');
    expect(result.status).not.toEqual(original.status);
    expect(result.revoked_at).not.toBeNull();
    expect(original.revoked_at).toBeNull();
  });
});