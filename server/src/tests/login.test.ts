import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

const testPassword = 'testpassword123';
const hashedPassword = await Bun.password.hash(testPassword);

// Create a test user first
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      password_hash: hashedPassword,
      first_name: 'John',
      last_name: 'Doe',
      role: 'student'
    })
    .returning()
    .execute();

  return result[0];
};

const validLoginInput: LoginInput = {
  email: 'test@example.com',
  password: testPassword
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate valid user credentials', async () => {
    // Create test user first
    const testUser = await createTestUser();

    const result = await login(validLoginInput);

    // Verify user data is returned
    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('student');
    expect(result.password_hash).toEqual(hashedPassword);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should reject login with incorrect password', async () => {
    // Create test user first
    await createTestUser();

    const invalidInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await expect(login(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login with non-existent email', async () => {
    // Don't create any user

    const invalidInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: testPassword
    };

    await expect(login(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should work with different user roles', async () => {
    // Create instructor user
    const instructorResult = await db.insert(usersTable)
      .values({
        email: 'instructor@example.com',
        password_hash: hashedPassword,
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'instructor'
      })
      .returning()
      .execute();

    const instructorInput: LoginInput = {
      email: 'instructor@example.com',
      password: testPassword
    };

    const result = await login(instructorInput);

    expect(result.id).toEqual(instructorResult[0].id);
    expect(result.email).toEqual('instructor@example.com');
    expect(result.role).toEqual('instructor');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
  });

  it('should handle admin role correctly', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();

    const adminInput: LoginInput = {
      email: 'admin@example.com',
      password: testPassword
    };

    const result = await login(adminInput);

    expect(result.id).toEqual(adminResult[0].id);
    expect(result.email).toEqual('admin@example.com');
    expect(result.role).toEqual('admin');
    expect(result.first_name).toEqual('Admin');
    expect(result.last_name).toEqual('User');
  });

  it('should reject empty password', async () => {
    await createTestUser();

    const invalidInput: LoginInput = {
      email: 'test@example.com',
      password: ''
    };

    await expect(login(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });
});