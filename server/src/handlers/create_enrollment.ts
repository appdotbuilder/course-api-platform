import { db } from '../db';
import { enrollmentsTable, usersTable, coursesTable } from '../db/schema';
import { type CreateEnrollmentInput, type Enrollment } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createEnrollment = async (input: CreateEnrollmentInput): Promise<Enrollment> => {
  try {
    // Verify student exists and has student role
    const student = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.student_id))
      .execute();
    
    if (student.length === 0) {
      throw new Error(`Student with ID ${input.student_id} not found`);
    }

    if (student[0].role !== 'student') {
      throw new Error(`User with ID ${input.student_id} is not a student`);
    }

    // Verify course exists
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();
    
    if (course.length === 0) {
      throw new Error(`Course with ID ${input.course_id} not found`);
    }

    // Check for existing enrollment to prevent duplicates
    const existingEnrollment = await db.select()
      .from(enrollmentsTable)
      .where(and(
        eq(enrollmentsTable.student_id, input.student_id),
        eq(enrollmentsTable.course_id, input.course_id)
      ))
      .execute();

    if (existingEnrollment.length > 0) {
      throw new Error(`Student ${input.student_id} is already enrolled in course ${input.course_id}`);
    }

    // Create enrollment
    const result = await db.insert(enrollmentsTable)
      .values({
        student_id: input.student_id,
        course_id: input.course_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Enrollment creation failed:', error);
    throw error;
  }
};