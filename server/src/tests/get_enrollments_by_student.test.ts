import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, enrollmentsTable } from '../db/schema';
import { type GetEnrollmentsByStudentInput } from '../schema';
import { getEnrollmentsByStudent } from '../handlers/get_enrollments_by_student';

describe('getEnrollmentsByStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return enrollments for a student with multiple courses', async () => {
    // Create test instructor
    const instructorResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'instructor'
      })
      .returning()
      .execute();

    const instructor = instructorResult[0];

    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = studentResult[0];

    // Create test courses
    const course1Result = await db.insert(coursesTable)
      .values({
        title: 'Mathematics 101',
        description: 'Basic mathematics course',
        instructor_id: instructor.id,
        status: 'published'
      })
      .returning()
      .execute();

    const course2Result = await db.insert(coursesTable)
      .values({
        title: 'Physics 101',
        description: 'Basic physics course',
        instructor_id: instructor.id,
        status: 'published'
      })
      .returning()
      .execute();

    const course1 = course1Result[0];
    const course2 = course2Result[0];

    // Create enrollments
    const enrollment1Result = await db.insert(enrollmentsTable)
      .values({
        student_id: student.id,
        course_id: course1.id
      })
      .returning()
      .execute();

    const enrollment2Result = await db.insert(enrollmentsTable)
      .values({
        student_id: student.id,
        course_id: course2.id
      })
      .returning()
      .execute();

    const enrollment1 = enrollment1Result[0];
    const enrollment2 = enrollment2Result[0];

    // Test the handler
    const input: GetEnrollmentsByStudentInput = {
      student_id: student.id
    };

    const result = await getEnrollmentsByStudent(input);

    // Verify results
    expect(result).toHaveLength(2);
    
    // Sort by id for consistent comparison
    const sortedResult = result.sort((a, b) => a.id - b.id);
    const sortedExpected = [enrollment1, enrollment2].sort((a, b) => a.id - b.id);

    expect(sortedResult[0].id).toEqual(sortedExpected[0].id);
    expect(sortedResult[0].student_id).toEqual(student.id);
    expect(sortedResult[0].course_id).toEqual(course1.id);
    expect(sortedResult[0].enrolled_at).toBeInstanceOf(Date);

    expect(sortedResult[1].id).toEqual(sortedExpected[1].id);
    expect(sortedResult[1].student_id).toEqual(student.id);
    expect(sortedResult[1].course_id).toEqual(course2.id);
    expect(sortedResult[1].enrolled_at).toBeInstanceOf(Date);
  });

  it('should return empty array for student with no enrollments', async () => {
    // Create test student without enrollments
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = studentResult[0];

    const input: GetEnrollmentsByStudentInput = {
      student_id: student.id
    };

    const result = await getEnrollmentsByStudent(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent student', async () => {
    const input: GetEnrollmentsByStudentInput = {
      student_id: 99999 // Non-existent student ID
    };

    const result = await getEnrollmentsByStudent(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return enrollments for the specified student', async () => {
    // Create test instructor
    const instructorResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'instructor'
      })
      .returning()
      .execute();

    const instructor = instructorResult[0];

    // Create two test students
    const student1Result = await db.insert(usersTable)
      .values({
        email: 'student1@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Student1',
        role: 'student'
      })
      .returning()
      .execute();

    const student2Result = await db.insert(usersTable)
      .values({
        email: 'student2@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Student2',
        role: 'student'
      })
      .returning()
      .execute();

    const student1 = student1Result[0];
    const student2 = student2Result[0];

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Mathematics 101',
        description: 'Basic mathematics course',
        instructor_id: instructor.id,
        status: 'published'
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Create enrollments for both students
    await db.insert(enrollmentsTable)
      .values({
        student_id: student1.id,
        course_id: course.id
      })
      .execute();

    await db.insert(enrollmentsTable)
      .values({
        student_id: student2.id,
        course_id: course.id
      })
      .execute();

    // Test that we only get enrollments for student1
    const input: GetEnrollmentsByStudentInput = {
      student_id: student1.id
    };

    const result = await getEnrollmentsByStudent(input);

    expect(result).toHaveLength(1);
    expect(result[0].student_id).toEqual(student1.id);
    expect(result[0].course_id).toEqual(course.id);
    expect(result[0].enrolled_at).toBeInstanceOf(Date);
  });

  it('should handle enrollments with different timestamps correctly', async () => {
    // Create test instructor
    const instructorResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'instructor'
      })
      .returning()
      .execute();

    const instructor = instructorResult[0];

    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = studentResult[0];

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Mathematics 101',
        description: 'Basic mathematics course',
        instructor_id: instructor.id,
        status: 'published'
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Create enrollment
    const enrollmentResult = await db.insert(enrollmentsTable)
      .values({
        student_id: student.id,
        course_id: course.id
      })
      .returning()
      .execute();

    const enrollment = enrollmentResult[0];

    const input: GetEnrollmentsByStudentInput = {
      student_id: student.id
    };

    const result = await getEnrollmentsByStudent(input);

    expect(result).toHaveLength(1);
    expect(result[0].enrolled_at).toBeInstanceOf(Date);
    
    // Verify the timestamp is recent (within the last minute)
    const now = new Date();
    const timeDiff = now.getTime() - result[0].enrolled_at.getTime();
    expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
  });
});