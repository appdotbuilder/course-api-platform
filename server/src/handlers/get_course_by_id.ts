import { db } from '../db';
import { coursesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetCourseByIdInput, type Course } from '../schema';

export async function getCourseById(input: GetCourseByIdInput): Promise<Course | null> {
  try {
    const results = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const course = results[0];
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      instructor_id: course.instructor_id,
      status: course.status,
      created_at: course.created_at,
      updated_at: course.updated_at
    };
  } catch (error) {
    console.error('Failed to get course by id:', error);
    throw error;
  }
}