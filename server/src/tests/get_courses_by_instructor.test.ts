import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable } from '../db/schema';
import { type GetCoursesByInstructorInput } from '../schema';
import { getCoursesByInstructor } from '../handlers/get_courses_by_instructor';

// Test data
const instructorUser = {
  email: 'instructor@test.com',
  password_hash: 'hashed_password_123',
  first_name: 'John',
  last_name: 'Instructor',
  role: 'instructor' as const
};

const studentUser = {
  email: 'student@test.com',
  password_hash: 'hashed_password_456',
  first_name: 'Jane',
  last_name: 'Student',
  role: 'student' as const
};

const course1 = {
  title: 'Advanced JavaScript',
  description: 'Learn advanced JavaScript concepts',
  status: 'published' as const
};

const course2 = {
  title: 'React Fundamentals',
  description: 'Introduction to React framework',
  status: 'draft' as const
};

const course3 = {
  title: 'Node.js Backend',
  description: 'Building APIs with Node.js',
  status: 'archived' as const
};

describe('getCoursesByInstructor', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return courses for a specific instructor', async () => {
    // Create instructor user
    const [instructor] = await db.insert(usersTable)
      .values(instructorUser)
      .returning()
      .execute();

    // Create courses for this instructor
    const [createdCourse1, createdCourse2] = await db.insert(coursesTable)
      .values([
        { ...course1, instructor_id: instructor.id },
        { ...course2, instructor_id: instructor.id }
      ])
      .returning()
      .execute();

    const input: GetCoursesByInstructorInput = {
      instructor_id: instructor.id
    };

    const result = await getCoursesByInstructor(input);

    // Should return 2 courses
    expect(result).toHaveLength(2);
    
    // Verify course details
    const courseIds = result.map(c => c.id).sort();
    expect(courseIds).toEqual([createdCourse1.id, createdCourse2.id].sort());

    // Verify all courses belong to the instructor
    result.forEach(course => {
      expect(course.instructor_id).toEqual(instructor.id);
    });

    // Verify course data
    const course1Result = result.find(c => c.title === 'Advanced JavaScript');
    expect(course1Result).toBeDefined();
    expect(course1Result!.description).toEqual('Learn advanced JavaScript concepts');
    expect(course1Result!.status).toEqual('published');
    expect(course1Result!.created_at).toBeInstanceOf(Date);
    expect(course1Result!.updated_at).toBeInstanceOf(Date);

    const course2Result = result.find(c => c.title === 'React Fundamentals');
    expect(course2Result).toBeDefined();
    expect(course2Result!.description).toEqual('Introduction to React framework');
    expect(course2Result!.status).toEqual('draft');
  });

  it('should return empty array when instructor has no courses', async () => {
    // Create instructor user with no courses
    const [instructor] = await db.insert(usersTable)
      .values(instructorUser)
      .returning()
      .execute();

    const input: GetCoursesByInstructorInput = {
      instructor_id: instructor.id
    };

    const result = await getCoursesByInstructor(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return only courses for the specified instructor, not others', async () => {
    // Create two instructors
    const [instructor1] = await db.insert(usersTable)
      .values(instructorUser)
      .returning()
      .execute();

    const [instructor2] = await db.insert(usersTable)
      .values({
        ...instructorUser,
        email: 'instructor2@test.com'
      })
      .returning()
      .execute();

    // Create courses for instructor1
    const [course1ForInst1, course2ForInst1] = await db.insert(coursesTable)
      .values([
        { ...course1, instructor_id: instructor1.id },
        { ...course2, instructor_id: instructor1.id }
      ])
      .returning()
      .execute();

    // Create course for instructor2
    await db.insert(coursesTable)
      .values({ ...course3, instructor_id: instructor2.id })
      .returning()
      .execute();

    const input: GetCoursesByInstructorInput = {
      instructor_id: instructor1.id
    };

    const result = await getCoursesByInstructor(input);

    // Should return only courses for instructor1
    expect(result).toHaveLength(2);
    result.forEach(course => {
      expect(course.instructor_id).toEqual(instructor1.id);
    });

    const courseIds = result.map(c => c.id).sort();
    expect(courseIds).toEqual([course1ForInst1.id, course2ForInst1.id].sort());
  });

  it('should return empty array for non-existent instructor', async () => {
    const input: GetCoursesByInstructorInput = {
      instructor_id: 99999 // Non-existent instructor ID
    };

    const result = await getCoursesByInstructor(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return courses with all different statuses', async () => {
    // Create instructor
    const [instructor] = await db.insert(usersTable)
      .values(instructorUser)
      .returning()
      .execute();

    // Create courses with different statuses
    await db.insert(coursesTable)
      .values([
        { ...course1, instructor_id: instructor.id, status: 'draft' },
        { ...course2, instructor_id: instructor.id, status: 'published' },
        { ...course3, instructor_id: instructor.id, status: 'archived' }
      ])
      .returning()
      .execute();

    const input: GetCoursesByInstructorInput = {
      instructor_id: instructor.id
    };

    const result = await getCoursesByInstructor(input);

    // Should return all 3 courses regardless of status
    expect(result).toHaveLength(3);
    
    const statuses = result.map(c => c.status).sort();
    expect(statuses).toEqual(['archived', 'draft', 'published']);
  });

  it('should handle courses with null descriptions', async () => {
    // Create instructor
    const [instructor] = await db.insert(usersTable)
      .values(instructorUser)
      .returning()
      .execute();

    // Create course with null description
    const [createdCourse] = await db.insert(coursesTable)
      .values({
        title: 'Course with No Description',
        description: null,
        instructor_id: instructor.id,
        status: 'draft'
      })
      .returning()
      .execute();

    const input: GetCoursesByInstructorInput = {
      instructor_id: instructor.id
    };

    const result = await getCoursesByInstructor(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Course with No Description');
    expect(result[0].description).toBeNull();
    expect(result[0].id).toEqual(createdCourse.id);
  });
});