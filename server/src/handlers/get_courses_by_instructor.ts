import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type GetCoursesByInstructorInput, type Course } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCoursesByInstructor(input: GetCoursesByInstructorInput): Promise<Course[]> {
  try {
    // Query courses by instructor_id
    const results = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.instructor_id, input.instructor_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch courses by instructor:', error);
    throw error;
  }
}