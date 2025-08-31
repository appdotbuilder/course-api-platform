import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type GetCourseByIdInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteCourse(input: GetCourseByIdInput): Promise<void> {
  try {
    // First, verify the course exists
    const existingCourse = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.id))
      .execute();

    if (existingCourse.length === 0) {
      throw new Error(`Course with id ${input.id} not found`);
    }

    // Soft delete by setting status to 'archived' and updating the timestamp
    await db.update(coursesTable)
      .set({
        status: 'archived',
        updated_at: new Date()
      })
      .where(eq(coursesTable.id, input.id))
      .execute();

  } catch (error) {
    console.error('Course deletion failed:', error);
    throw error;
  }
}