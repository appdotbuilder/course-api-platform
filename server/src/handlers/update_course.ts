import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type UpdateCourseInput, type Course } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCourse = async (input: UpdateCourseInput): Promise<Course> => {
  try {
    // First verify the course exists
    const existingCourse = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.id))
      .execute();

    if (existingCourse.length === 0) {
      throw new Error(`Course with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof coursesTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update the course
    const result = await db.update(coursesTable)
      .set(updateData)
      .where(eq(coursesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Course update failed:', error);
    throw error;
  }
};