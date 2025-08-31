import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all users from database', async () => {
    // Create test users
    const passwordHash = 'hashed_password_123';
    
    const testUsers = [
      {
        email: 'student@example.com',
        password_hash: passwordHash,
        first_name: 'John',
        last_name: 'Doe',
        role: 'student' as const
      },
      {
        email: 'instructor@example.com', 
        password_hash: passwordHash,
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'instructor' as const
      },
      {
        email: 'admin@example.com',
        password_hash: passwordHash,
        first_name: 'Bob',
        last_name: 'Admin',
        role: 'admin' as const
      }
    ];

    await db.insert(usersTable).values(testUsers).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify all users are returned
    const emails = result.map(user => user.email);
    expect(emails).toContain('student@example.com');
    expect(emails).toContain('instructor@example.com');
    expect(emails).toContain('admin@example.com');
  });

  it('should return users with all expected fields', async () => {
    // Create a test user
    const passwordHash = 'hashed_password_123';
    
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: passwordHash,
        first_name: 'Test',
        last_name: 'User',
        role: 'student'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    
    const user = result[0];
    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.password_hash).toBe(passwordHash);
    expect(user.first_name).toBe('Test');
    expect(user.last_name).toBe('User');
    expect(user.role).toBe('student');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should return users with different roles', async () => {
    const passwordHash = 'hashed_password_123';
    
    // Create users with different roles
    const usersData = [
      {
        email: 'student1@example.com',
        password_hash: passwordHash,
        first_name: 'Student',
        last_name: 'One',
        role: 'student' as const
      },
      {
        email: 'student2@example.com',
        password_hash: passwordHash,
        first_name: 'Student',
        last_name: 'Two', 
        role: 'student' as const
      },
      {
        email: 'instructor1@example.com',
        password_hash: passwordHash,
        first_name: 'Instructor',
        last_name: 'One',
        role: 'instructor' as const
      },
      {
        email: 'admin1@example.com',
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'One',
        role: 'admin' as const
      }
    ];

    await db.insert(usersTable).values(usersData).execute();

    const result = await getUsers();

    expect(result).toHaveLength(4);

    // Count users by role
    const roleCount = result.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(roleCount['student']).toBe(2);
    expect(roleCount['instructor']).toBe(1);
    expect(roleCount['admin']).toBe(1);
  });

  it('should handle database with single user correctly', async () => {
    const passwordHash = 'single_user_hash';
    
    await db.insert(usersTable)
      .values({
        email: 'single@example.com',
        password_hash: passwordHash,
        first_name: 'Single',
        last_name: 'User',
        role: 'instructor'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('single@example.com');
    expect(result[0].role).toBe('instructor');
    expect(result[0].first_name).toBe('Single');
    expect(result[0].last_name).toBe('User');
  });

  it('should maintain user order from database', async () => {
    const passwordHash = 'test_hash';
    
    const usersData = [
      {
        email: 'first@example.com',
        password_hash: passwordHash,
        first_name: 'First',
        last_name: 'User',
        role: 'student' as const
      },
      {
        email: 'second@example.com',
        password_hash: passwordHash,
        first_name: 'Second',
        last_name: 'User',
        role: 'instructor' as const
      }
    ];

    await db.insert(usersTable).values(usersData).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result[0].email).toBe('first@example.com');
    expect(result[1].email).toBe('second@example.com');
  });
});