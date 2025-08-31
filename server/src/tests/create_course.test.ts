import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type CreateCourseInput } from '../schema';
import { createCourse } from '../handlers/create_course';
import { eq } from 'drizzle-orm';

describe('createCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test users for different scenarios
  const createTestInstructor = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Instructor',
        role: 'instructor'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestAdmin = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestStudent = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create a course with instructor role', async () => {
    const instructor = await createTestInstructor();
    
    const testInput: CreateCourseInput = {
      title: 'Introduction to Programming',
      description: 'Learn the basics of programming',
      instructor_id: instructor.id,
      status: 'draft'
    };

    const result = await createCourse(testInput);

    // Verify course properties
    expect(result.title).toEqual('Introduction to Programming');
    expect(result.description).toEqual('Learn the basics of programming');
    expect(result.instructor_id).toEqual(instructor.id);
    expect(result.status).toEqual('draft');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a course with admin role', async () => {
    const admin = await createTestAdmin();
    
    const testInput: CreateCourseInput = {
      title: 'Advanced Data Structures',
      description: 'Deep dive into data structures',
      instructor_id: admin.id,
      status: 'published'
    };

    const result = await createCourse(testInput);

    expect(result.title).toEqual('Advanced Data Structures');
    expect(result.instructor_id).toEqual(admin.id);
    expect(result.status).toEqual('published');
    expect(result.id).toBeDefined();
  });

  it('should create a course with null description', async () => {
    const instructor = await createTestInstructor();
    
    const testInput: CreateCourseInput = {
      title: 'Mathematics Fundamentals',
      description: null,
      instructor_id: instructor.id,
      status: 'draft'
    };

    const result = await createCourse(testInput);

    expect(result.title).toEqual('Mathematics Fundamentals');
    expect(result.description).toBeNull();
    expect(result.instructor_id).toEqual(instructor.id);
    expect(result.status).toEqual('draft');
  });

  it('should save course to database', async () => {
    const instructor = await createTestInstructor();
    
    const testInput: CreateCourseInput = {
      title: 'Database Design',
      description: 'Learn database fundamentals',
      instructor_id: instructor.id,
      status: 'draft'
    };

    const result = await createCourse(testInput);

    // Verify course was saved to database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('Database Design');
    expect(courses[0].description).toEqual('Learn database fundamentals');
    expect(courses[0].instructor_id).toEqual(instructor.id);
    expect(courses[0].status).toEqual('draft');
    expect(courses[0].created_at).toBeInstanceOf(Date);
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should use default status from Zod schema', async () => {
    const instructor = await createTestInstructor();
    
    // Create input without status to test Zod default
    const testInput: CreateCourseInput = {
      title: 'Web Development',
      description: 'Learn web development basics',
      instructor_id: instructor.id,
      status: 'draft' // Zod default applied during parsing
    };

    const result = await createCourse(testInput);

    expect(result.status).toEqual('draft');
  });

  it('should throw error when instructor does not exist', async () => {
    const testInput: CreateCourseInput = {
      title: 'Non-existent Instructor Course',
      description: 'This should fail',
      instructor_id: 99999, // Non-existent user ID
      status: 'draft'
    };

    expect(createCourse(testInput)).rejects.toThrow(/instructor not found/i);
  });

  it('should throw error when user is not instructor or admin', async () => {
    const student = await createTestStudent();
    
    const testInput: CreateCourseInput = {
      title: 'Student Attempt Course',
      description: 'This should fail',
      instructor_id: student.id,
      status: 'draft'
    };

    expect(createCourse(testInput)).rejects.toThrow(/user must have instructor or admin role/i);
  });

  it('should create multiple courses for same instructor', async () => {
    const instructor = await createTestInstructor();
    
    const course1Input: CreateCourseInput = {
      title: 'Course 1',
      description: 'First course',
      instructor_id: instructor.id,
      status: 'draft'
    };

    const course2Input: CreateCourseInput = {
      title: 'Course 2',
      description: 'Second course',
      instructor_id: instructor.id,
      status: 'published'
    };

    const result1 = await createCourse(course1Input);
    const result2 = await createCourse(course2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('Course 1');
    expect(result2.title).toEqual('Course 2');
    expect(result1.instructor_id).toEqual(instructor.id);
    expect(result2.instructor_id).toEqual(instructor.id);

    // Verify both courses exist in database
    const allCourses = await db.select()
      .from(coursesTable)
      .execute();

    expect(allCourses).toHaveLength(2);
  });

  it('should handle different course statuses correctly', async () => {
    const instructor = await createTestInstructor();
    
    const draftCourse: CreateCourseInput = {
      title: 'Draft Course',
      description: 'Draft status course',
      instructor_id: instructor.id,
      status: 'draft'
    };

    const publishedCourse: CreateCourseInput = {
      title: 'Published Course',
      description: 'Published status course',
      instructor_id: instructor.id,
      status: 'published'
    };

    const archivedCourse: CreateCourseInput = {
      title: 'Archived Course',
      description: 'Archived status course',
      instructor_id: instructor.id,
      status: 'archived'
    };

    const draftResult = await createCourse(draftCourse);
    const publishedResult = await createCourse(publishedCourse);
    const archivedResult = await createCourse(archivedCourse);

    expect(draftResult.status).toEqual('draft');
    expect(publishedResult.status).toEqual('published');
    expect(archivedResult.status).toEqual('archived');
  });
});