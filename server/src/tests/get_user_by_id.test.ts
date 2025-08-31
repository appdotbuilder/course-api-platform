import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByIdInput, type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';
import { eq } from 'drizzle-orm';

// Test data for creating a user
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'securepassword123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student'
};

// Helper function to create a test user
async function createTestUser(): Promise<number> {
  const result = await db.insert(usersTable)
    .values({
      email: testUserInput.email,
      password_hash: 'hashed_' + testUserInput.password,
      first_name: testUserInput.first_name,
      last_name: testUserInput.last_name,
      role: testUserInput.role
    })
    .returning()
    .execute();

  return result[0].id;
}

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create test user
    const userId = await createTestUser();

    const input: GetUserByIdInput = { id: userId };
    const result = await getUserById(input);

    // Verify user is returned
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(userId);
    expect(result!.email).toEqual('test@example.com');
    expect(result!.first_name).toEqual('John');
    expect(result!.last_name).toEqual('Doe');
    expect(result!.role).toEqual('student');
    expect(result!.password_hash).toEqual('hashed_securepassword123');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const input: GetUserByIdInput = { id: 999 };
    const result = await getUserById(input);

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create first test user
    const userId1 = await createTestUser();

    // Create second test user
    const secondUserResult = await db.insert(usersTable)
      .values({
        email: 'second@example.com',
        password_hash: 'hashed_password_two',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'instructor'
      })
      .returning()
      .execute();

    const userId2 = secondUserResult[0].id;

    // Query for the second user
    const input: GetUserByIdInput = { id: userId2 };
    const result = await getUserById(input);

    // Verify correct user is returned
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(userId2);
    expect(result!.email).toEqual('second@example.com');
    expect(result!.first_name).toEqual('Jane');
    expect(result!.last_name).toEqual('Smith');
    expect(result!.role).toEqual('instructor');
    expect(result!.password_hash).toEqual('hashed_password_two');
  });

  it('should handle different user roles correctly', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_admin_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();

    const adminId = adminResult[0].id;

    const input: GetUserByIdInput = { id: adminId };
    const result = await getUserById(input);

    expect(result).not.toBeNull();
    expect(result!.role).toEqual('admin');
    expect(result!.email).toEqual('admin@example.com');
  });

  it('should verify user exists in database after retrieval', async () => {
    // Create test user
    const userId = await createTestUser();

    // Get user via handler
    const input: GetUserByIdInput = { id: userId };
    const result = await getUserById(input);

    // Verify user exists in database with direct query
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].email).toEqual(result!.email);
    expect(dbUsers[0].first_name).toEqual(result!.first_name);
    expect(dbUsers[0].last_name).toEqual(result!.last_name);
    expect(dbUsers[0].role).toEqual(result!.role);
  });
});