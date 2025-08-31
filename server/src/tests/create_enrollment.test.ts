import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, enrollmentsTable } from '../db/schema';
import { type CreateEnrollmentInput } from '../schema';
import { createEnrollment } from '../handlers/create_enrollment';
import { eq, and } from 'drizzle-orm';

describe('createEnrollment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create a test user
  const createTestUser = async (role: 'student' | 'instructor' = 'student') => {
    const result = await db.insert(usersTable)
      .values({
        email: role === 'student' ? 'student@test.com' : 'instructor@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: role
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper to create a test course
  const createTestCourse = async (instructorId: number) => {
    const result = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        instructor_id: instructorId,
        status: 'published'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create an enrollment successfully', async () => {
    // Create prerequisite data
    const student = await createTestUser('student');
    const instructor = await createTestUser('instructor');
    const course = await createTestCourse(instructor.id);

    const input: CreateEnrollmentInput = {
      student_id: student.id,
      course_id: course.id
    };

    const result = await createEnrollment(input);

    // Verify enrollment fields
    expect(result.id).toBeDefined();
    expect(result.student_id).toEqual(student.id);
    expect(result.course_id).toEqual(course.id);
    expect(result.enrolled_at).toBeInstanceOf(Date);
  });

  it('should save enrollment to database', async () => {
    // Create prerequisite data
    const student = await createTestUser('student');
    const instructor = await createTestUser('instructor');
    const course = await createTestCourse(instructor.id);

    const input: CreateEnrollmentInput = {
      student_id: student.id,
      course_id: course.id
    };

    const result = await createEnrollment(input);

    // Query database to verify enrollment was saved
    const enrollments = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.id, result.id))
      .execute();

    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].student_id).toEqual(student.id);
    expect(enrollments[0].course_id).toEqual(course.id);
    expect(enrollments[0].enrolled_at).toBeInstanceOf(Date);
  });

  it('should throw error if student does not exist', async () => {
    const instructor = await createTestUser('instructor');
    const course = await createTestCourse(instructor.id);

    const input: CreateEnrollmentInput = {
      student_id: 9999, // Non-existent student ID
      course_id: course.id
    };

    await expect(createEnrollment(input)).rejects.toThrow(/student with id 9999 not found/i);
  });

  it('should throw error if course does not exist', async () => {
    const student = await createTestUser('student');

    const input: CreateEnrollmentInput = {
      student_id: student.id,
      course_id: 9999 // Non-existent course ID
    };

    await expect(createEnrollment(input)).rejects.toThrow(/course with id 9999 not found/i);
  });

  it('should throw error if user is not a student', async () => {
    // Create an instructor user
    const instructor = await createTestUser('instructor');
    const course = await createTestCourse(instructor.id);

    const input: CreateEnrollmentInput = {
      student_id: instructor.id, // Trying to enroll an instructor
      course_id: course.id
    };

    await expect(createEnrollment(input)).rejects.toThrow(/is not a student/i);
  });

  it('should prevent duplicate enrollments', async () => {
    // Create prerequisite data
    const student = await createTestUser('student');
    const instructor = await createTestUser('instructor');
    const course = await createTestCourse(instructor.id);

    const input: CreateEnrollmentInput = {
      student_id: student.id,
      course_id: course.id
    };

    // Create first enrollment
    await createEnrollment(input);

    // Attempt to create duplicate enrollment
    await expect(createEnrollment(input)).rejects.toThrow(/already enrolled/i);
  });

  it('should allow same student to enroll in different courses', async () => {
    // Create prerequisite data
    const student = await createTestUser('student');
    const instructor = await createTestUser('instructor');
    const course1 = await createTestCourse(instructor.id);
    
    // Create second course
    const course2 = await db.insert(coursesTable)
      .values({
        title: 'Second Test Course',
        description: 'Another course for testing',
        instructor_id: instructor.id,
        status: 'published'
      })
      .returning()
      .execute();

    // Enroll in first course
    const enrollment1 = await createEnrollment({
      student_id: student.id,
      course_id: course1.id
    });

    // Enroll in second course
    const enrollment2 = await createEnrollment({
      student_id: student.id,
      course_id: course2[0].id
    });

    expect(enrollment1.id).not.toEqual(enrollment2.id);
    expect(enrollment1.course_id).toEqual(course1.id);
    expect(enrollment2.course_id).toEqual(course2[0].id);
  });

  it('should allow different students to enroll in same course', async () => {
    // Create prerequisite data
    const student1 = await createTestUser('student');
    const student2 = await db.insert(usersTable)
      .values({
        email: 'student2@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Student2',
        role: 'student'
      })
      .returning()
      .execute();

    const instructor = await createTestUser('instructor');
    const course = await createTestCourse(instructor.id);

    // Enroll first student
    const enrollment1 = await createEnrollment({
      student_id: student1.id,
      course_id: course.id
    });

    // Enroll second student in same course
    const enrollment2 = await createEnrollment({
      student_id: student2[0].id,
      course_id: course.id
    });

    expect(enrollment1.id).not.toEqual(enrollment2.id);
    expect(enrollment1.student_id).toEqual(student1.id);
    expect(enrollment2.student_id).toEqual(student2[0].id);
    expect(enrollment1.course_id).toEqual(course.id);
    expect(enrollment2.course_id).toEqual(course.id);
  });
});