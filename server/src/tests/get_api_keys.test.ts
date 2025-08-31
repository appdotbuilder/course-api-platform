import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, apiKeysTable } from '../db/schema';
import { getApiKeys } from '../handlers/get_api_keys';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('getApiKeys', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no API keys exist', async () => {
    const result = await getApiKeys();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all API keys', async () => {
    // Create prerequisite user directly in database
    const userResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    // Create test API keys directly in database
    await db.insert(apiKeysTable)
      .values([
        {
          key_name: 'Production API Key',
          key_hash: crypto.createHash('sha256').update('test-key-1').digest('hex'),
          created_by: userId,
          status: 'active'
        },
        {
          key_name: 'Development API Key',
          key_hash: crypto.createHash('sha256').update('test-key-2').digest('hex'),
          created_by: userId,
          status: 'active'
        }
      ])
      .execute();
    
    // Fetch all API keys
    const result = await getApiKeys();
    
    expect(result).toHaveLength(2);
    
    // Verify all required fields are present
    result.forEach(apiKey => {
      expect(apiKey.id).toBeDefined();
      expect(apiKey.key_name).toBeDefined();
      expect(apiKey.key_hash).toBeDefined();
      expect(apiKey.created_by).toBe(userId);
      expect(apiKey.status).toBe('active');
      expect(apiKey.created_at).toBeInstanceOf(Date);
      expect(apiKey.revoked_at).toBeNull();
    });
    
    // Verify specific API keys exist
    const keyNames = result.map(k => k.key_name);
    expect(keyNames).toContain('Production API Key');
    expect(keyNames).toContain('Development API Key');
  });

  it('should return API keys ordered by creation date (newest first)', async () => {
    // Create prerequisite user directly in database
    const userResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    // Create first API key
    const firstKey = await db.insert(apiKeysTable)
      .values({
        key_name: 'First API Key',
        key_hash: crypto.createHash('sha256').update('test-key-1').digest('hex'),
        created_by: userId,
        status: 'active'
      })
      .returning()
      .execute();
    
    // Wait a small amount to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Create second API key
    const secondKey = await db.insert(apiKeysTable)
      .values({
        key_name: 'Second API Key',
        key_hash: crypto.createHash('sha256').update('test-key-2').digest('hex'),
        created_by: userId,
        status: 'active'
      })
      .returning()
      .execute();
    
    // Fetch all API keys
    const result = await getApiKeys();
    
    expect(result).toHaveLength(2);
    
    // Verify ordering (newest first)
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[0].key_name).toBe('Second API Key'); // Created second, should be first
    expect(result[1].key_name).toBe('First API Key'); // Created first, should be second
  });

  it('should include both active and revoked API keys', async () => {
    // Create prerequisite user directly in database
    const userResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    // Create active API key
    await db.insert(apiKeysTable)
      .values({
        key_name: 'Active API Key',
        key_hash: crypto.createHash('sha256').update('test-key-1').digest('hex'),
        created_by: userId,
        status: 'active'
      })
      .execute();
    
    // Create revoked API key
    const revokedAt = new Date();
    await db.insert(apiKeysTable)
      .values({
        key_name: 'Revoked API Key',
        key_hash: crypto.createHash('sha256').update('test-key-2').digest('hex'),
        created_by: userId,
        status: 'revoked',
        revoked_at: revokedAt
      })
      .execute();
    
    // Fetch all API keys
    const result = await getApiKeys();
    
    expect(result).toHaveLength(2);
    
    // Verify we have both active and revoked keys
    const statuses = result.map(k => k.status);
    expect(statuses).toContain('active');
    expect(statuses).toContain('revoked');
    
    // Verify revoked key has revoked_at timestamp
    const revokedKey = result.find(k => k.status === 'revoked');
    expect(revokedKey?.revoked_at).toBeInstanceOf(Date);
    
    const activeKey = result.find(k => k.status === 'active');
    expect(activeKey?.revoked_at).toBeNull();
  });

  it('should return API keys from multiple users', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    
    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'instructor@example.com',
        password_hash: 'hashed_password',
        first_name: 'Instructor',
        last_name: 'User',
        role: 'instructor'
      })
      .returning()
      .execute();
    
    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;
    
    // Create API keys for both users
    await db.insert(apiKeysTable)
      .values([
        {
          key_name: 'Admin API Key',
          key_hash: crypto.createHash('sha256').update('test-key-1').digest('hex'),
          created_by: user1Id,
          status: 'active'
        },
        {
          key_name: 'Instructor API Key',
          key_hash: crypto.createHash('sha256').update('test-key-2').digest('hex'),
          created_by: user2Id,
          status: 'active'
        }
      ])
      .execute();
    
    // Fetch all API keys
    const result = await getApiKeys();
    
    expect(result).toHaveLength(2);
    
    // Verify API keys from different users
    const creatorIds = result.map(k => k.created_by);
    expect(creatorIds).toContain(user1Id);
    expect(creatorIds).toContain(user2Id);
    
    // Verify key names
    const keyNames = result.map(k => k.key_name);
    expect(keyNames).toContain('Admin API Key');
    expect(keyNames).toContain('Instructor API Key');
  });

  it('should handle database query correctly', async () => {
    // Create prerequisite user directly in database
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
    
    const userId = userResult[0].id;
    
    // Create a single API key
    const createdKey = await db.insert(apiKeysTable)
      .values({
        key_name: 'Test API Key',
        key_hash: crypto.createHash('sha256').update('test-key-unique').digest('hex'),
        created_by: userId,
        status: 'active'
      })
      .returning()
      .execute();
    
    // Fetch all API keys
    const result = await getApiKeys();
    
    expect(result).toHaveLength(1);
    
    const apiKey = result[0];
    expect(apiKey.id).toBe(createdKey[0].id);
    expect(apiKey.key_name).toBe('Test API Key');
    expect(apiKey.created_by).toBe(userId);
    expect(apiKey.status).toBe('active');
    expect(apiKey.created_at).toBeInstanceOf(Date);
    expect(apiKey.revoked_at).toBeNull();
    expect(typeof apiKey.key_hash).toBe('string');
    expect(apiKey.key_hash.length).toBeGreaterThan(0);
  });
});