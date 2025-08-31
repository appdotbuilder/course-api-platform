import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type Course } from '../schema';
import { eq } from 'drizzle-orm';

export const getCourses = async (): Promise<Course[]> => {
  try {
    // Fetch all published courses from the database
    const results = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.status, 'published'))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    throw error;
  }
};