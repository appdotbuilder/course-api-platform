import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetUserByIdInput, type User } from '../schema';

export async function getUserById(input: GetUserByIdInput): Promise<User | null> {
  try {
    // Query for the user by ID
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .limit(1)
      .execute();

    // Return null if no user found
    if (result.length === 0) {
      return null;
    }

    // Return the first (and only) user found
    return result[0];
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw error;
  }
}