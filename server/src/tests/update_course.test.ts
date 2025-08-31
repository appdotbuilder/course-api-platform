import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type UpdateCourseInput, type CreateUserInput } from '../schema';
import { updateCourse } from '../handlers/update_course';
import { eq } from 'drizzle-orm';

// Test instructor data
const testInstructor: CreateUserInput = {
  email: 'instructor@test.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'instructor'
};

// Test course data
const testCourseData = {
  title: 'Original Course Title',
  description: 'Original course description',
  instructor_id: 0, // Will be set after instructor creation
  status: 'draft' as const
};

describe('updateCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update course title only', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values({
        email: testInstructor.email,
        password_hash: 'hashed_password',
        first_name: testInstructor.first_name,
        last_name: testInstructor.last_name,
        role: testInstructor.role
      })
      .returning()
      .execute();

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseData,
        instructor_id: instructorResult[0].id
      })
      .returning()
      .execute();

    const originalCourse = courseResult[0];

    // Update only the title
    const updateInput: UpdateCourseInput = {
      id: originalCourse.id,
      title: 'Updated Course Title'
    };

    const result = await updateCourse(updateInput);

    // Verify title was updated
    expect(result.title).toEqual('Updated Course Title');
    expect(result.description).toEqual(originalCourse.description);
    expect(result.status).toEqual(originalCourse.status);
    expect(result.instructor_id).toEqual(originalCourse.instructor_id);
    expect(result.id).toEqual(originalCourse.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCourse.updated_at.getTime());
  });

  it('should update course description only', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values({
        email: testInstructor.email,
        password_hash: 'hashed_password',
        first_name: testInstructor.first_name,
        last_name: testInstructor.last_name,
        role: testInstructor.role
      })
      .returning()
      .execute();

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseData,
        instructor_id: instructorResult[0].id
      })
      .returning()
      .execute();

    const originalCourse = courseResult[0];

    // Update only the description
    const updateInput: UpdateCourseInput = {
      id: originalCourse.id,
      description: 'Updated course description'
    };

    const result = await updateCourse(updateInput);

    // Verify description was updated
    expect(result.description).toEqual('Updated course description');
    expect(result.title).toEqual(originalCourse.title);
    expect(result.status).toEqual(originalCourse.status);
    expect(result.instructor_id).toEqual(originalCourse.instructor_id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCourse.updated_at.getTime());
  });

  it('should update course status only', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values({
        email: testInstructor.email,
        password_hash: 'hashed_password',
        first_name: testInstructor.first_name,
        last_name: testInstructor.last_name,
        role: testInstructor.role
      })
      .returning()
      .execute();

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseData,
        instructor_id: instructorResult[0].id
      })
      .returning()
      .execute();

    const originalCourse = courseResult[0];

    // Update only the status
    const updateInput: UpdateCourseInput = {
      id: originalCourse.id,
      status: 'published'
    };

    const result = await updateCourse(updateInput);

    // Verify status was updated
    expect(result.status).toEqual('published');
    expect(result.title).toEqual(originalCourse.title);
    expect(result.description).toEqual(originalCourse.description);
    expect(result.instructor_id).toEqual(originalCourse.instructor_id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCourse.updated_at.getTime());
  });

  it('should update multiple fields at once', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values({
        email: testInstructor.email,
        password_hash: 'hashed_password',
        first_name: testInstructor.first_name,
        last_name: testInstructor.last_name,
        role: testInstructor.role
      })
      .returning()
      .execute();

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseData,
        instructor_id: instructorResult[0].id
      })
      .returning()
      .execute();

    const originalCourse = courseResult[0];

    // Update multiple fields
    const updateInput: UpdateCourseInput = {
      id: originalCourse.id,
      title: 'New Title',
      description: 'New description',
      status: 'archived'
    };

    const result = await updateCourse(updateInput);

    // Verify all fields were updated
    expect(result.title).toEqual('New Title');
    expect(result.description).toEqual('New description');
    expect(result.status).toEqual('archived');
    expect(result.instructor_id).toEqual(originalCourse.instructor_id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCourse.updated_at.getTime());
  });

  it('should set description to null when explicitly provided', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values({
        email: testInstructor.email,
        password_hash: 'hashed_password',
        first_name: testInstructor.first_name,
        last_name: testInstructor.last_name,
        role: testInstructor.role
      })
      .returning()
      .execute();

    // Create course with description
    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseData,
        instructor_id: instructorResult[0].id,
        description: 'Has description'
      })
      .returning()
      .execute();

    const originalCourse = courseResult[0];

    // Update description to null
    const updateInput: UpdateCourseInput = {
      id: originalCourse.id,
      description: null
    };

    const result = await updateCourse(updateInput);

    // Verify description was set to null
    expect(result.description).toBeNull();
    expect(result.title).toEqual(originalCourse.title);
    expect(result.status).toEqual(originalCourse.status);
  });

  it('should save updated course to database', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values({
        email: testInstructor.email,
        password_hash: 'hashed_password',
        first_name: testInstructor.first_name,
        last_name: testInstructor.last_name,
        role: testInstructor.role
      })
      .returning()
      .execute();

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseData,
        instructor_id: instructorResult[0].id
      })
      .returning()
      .execute();

    const originalCourse = courseResult[0];

    // Update course
    const updateInput: UpdateCourseInput = {
      id: originalCourse.id,
      title: 'Database Test Title'
    };

    const result = await updateCourse(updateInput);

    // Query database directly to verify update
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('Database Test Title');
    expect(courses[0].description).toEqual(originalCourse.description);
    expect(courses[0].status).toEqual(originalCourse.status);
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when course does not exist', async () => {
    const updateInput: UpdateCourseInput = {
      id: 99999, // Non-existent course ID
      title: 'Updated Title'
    };

    await expect(updateCourse(updateInput)).rejects.toThrow(/Course with id 99999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values({
        email: testInstructor.email,
        password_hash: 'hashed_password',
        first_name: testInstructor.first_name,
        last_name: testInstructor.last_name,
        role: testInstructor.role
      })
      .returning()
      .execute();

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourseData,
        instructor_id: instructorResult[0].id
      })
      .returning()
      .execute();

    const originalCourse = courseResult[0];

    // Update with empty object (only updated_at should change)
    const updateInput: UpdateCourseInput = {
      id: originalCourse.id
    };

    const result = await updateCourse(updateInput);

    // Verify only updated_at changed
    expect(result.title).toEqual(originalCourse.title);
    expect(result.description).toEqual(originalCourse.description);
    expect(result.status).toEqual(originalCourse.status);
    expect(result.instructor_id).toEqual(originalCourse.instructor_id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCourse.updated_at.getTime());
  });
});