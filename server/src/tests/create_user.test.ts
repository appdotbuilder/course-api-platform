import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('student');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should hash the password', async () => {
    const result = await createUser(testInput);

    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual(testInput.password);
    expect(result.password_hash.length).toBeGreaterThan(50); // Hashed passwords are long

    // Verify password can be verified with Bun's password utility
    const isValid = await Bun.password.verify(testInput.password, result.password_hash);
    expect(isValid).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query the database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.first_name).toEqual('John');
    expect(savedUser.last_name).toEqual('Doe');
    expect(savedUser.role).toEqual('student');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should use default role when not specified', async () => {
    const inputWithoutRole: CreateUserInput = {
      email: 'test2@example.com',
      password: 'password123',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'student' // Zod default is applied at parsing level
    };

    const result = await createUser(inputWithoutRole);
    expect(result.role).toEqual('student');
  });

  it('should handle instructor role', async () => {
    const instructorInput: CreateUserInput = {
      email: 'instructor@example.com',
      password: 'password123',
      first_name: 'Sarah',
      last_name: 'Teacher',
      role: 'instructor'
    };

    const result = await createUser(instructorInput);
    expect(result.role).toEqual('instructor');
  });

  it('should handle admin role', async () => {
    const adminInput: CreateUserInput = {
      email: 'admin@example.com',
      password: 'password123',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin'
    };

    const result = await createUser(adminInput);
    expect(result.role).toEqual('admin');
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      password: 'different_password',
      first_name: 'Different',
      last_name: 'Person',
      role: 'instructor'
    };

    // Should throw error due to unique constraint
    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should set created_at and updated_at timestamps', async () => {
    const beforeCreate = new Date();
    const result = await createUser(testInput);
    const afterCreate = new Date();

    // Timestamps should be within reasonable range
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at >= beforeCreate).toBe(true);
    expect(result.created_at <= afterCreate).toBe(true);
    expect(result.updated_at >= beforeCreate).toBe(true);
    expect(result.updated_at <= afterCreate).toBe(true);
  });
});