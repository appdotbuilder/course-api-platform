import { db } from '../db';
import { enrollmentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetEnrollmentsByStudentInput, type Enrollment } from '../schema';

export async function getEnrollmentsByStudent(input: GetEnrollmentsByStudentInput): Promise<Enrollment[]> {
  try {
    const results = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.student_id, input.student_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch enrollments by student:', error);
    throw error;
  }
}