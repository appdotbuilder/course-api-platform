import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type GetCourseByIdInput } from '../schema';
import { deleteCourse } from '../handlers/delete_course';
import { eq } from 'drizzle-orm';

describe('deleteCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete a course by setting status to archived', async () => {
    // Create a test user first (needed for instructor_id foreign key)
    const [testUser] = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'instructor'
      })
      .returning()
      .execute();

    // Create a test course
    const [testCourse] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        instructor_id: testUser.id,
        status: 'published'
      })
      .returning()
      .execute();

    const deleteInput: GetCourseByIdInput = {
      id: testCourse.id
    };

    // Delete the course
    await deleteCourse(deleteInput);

    // Verify the course status was changed to 'archived'
    const updatedCourse = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, testCourse.id))
      .execute();

    expect(updatedCourse).toHaveLength(1);
    expect(updatedCourse[0].status).toEqual('archived');
    expect(updatedCourse[0].id).toEqual(testCourse.id);
    expect(updatedCourse[0].title).toEqual('Test Course');
    expect(updatedCourse[0].updated_at).toBeInstanceOf(Date);
    
    // Verify updated_at timestamp was actually updated
    expect(updatedCourse[0].updated_at.getTime()).toBeGreaterThan(testCourse.updated_at.getTime());
  });

  it('should preserve all course data except status when deleting', async () => {
    // Create a test user first
    const [testUser] = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'instructor'
      })
      .returning()
      .execute();

    // Create a test course with all fields populated
    const [testCourse] = await db.insert(coursesTable)
      .values({
        title: 'Advanced Course',
        description: 'A detailed course description',
        instructor_id: testUser.id,
        status: 'published'
      })
      .returning()
      .execute();

    const deleteInput: GetCourseByIdInput = {
      id: testCourse.id
    };

    // Delete the course
    await deleteCourse(deleteInput);

    // Verify all fields are preserved except status
    const updatedCourse = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, testCourse.id))
      .execute();

    expect(updatedCourse).toHaveLength(1);
    const course = updatedCourse[0];
    
    expect(course.id).toEqual(testCourse.id);
    expect(course.title).toEqual('Advanced Course');
    expect(course.description).toEqual('A detailed course description');
    expect(course.instructor_id).toEqual(testUser.id);
    expect(course.status).toEqual('archived');
    expect(course.created_at).toEqual(testCourse.created_at);
    expect(course.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when course does not exist', async () => {
    const deleteInput: GetCourseByIdInput = {
      id: 999 // Non-existent course ID
    };

    // Attempt to delete non-existent course
    await expect(deleteCourse(deleteInput))
      .rejects
      .toThrow(/course with id 999 not found/i);
  });

  it('should work with courses that are already archived', async () => {
    // Create a test user first
    const [testUser] = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'instructor'
      })
      .returning()
      .execute();

    // Create a test course that's already archived
    const [testCourse] = await db.insert(coursesTable)
      .values({
        title: 'Already Archived Course',
        description: 'This course is already archived',
        instructor_id: testUser.id,
        status: 'archived'
      })
      .returning()
      .execute();

    const deleteInput: GetCourseByIdInput = {
      id: testCourse.id
    };

    // Delete the already archived course - should work without error
    await deleteCourse(deleteInput);

    // Verify the course is still archived
    const updatedCourse = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, testCourse.id))
      .execute();

    expect(updatedCourse).toHaveLength(1);
    expect(updatedCourse[0].status).toEqual('archived');
    expect(updatedCourse[0].updated_at).toBeInstanceOf(Date);
    expect(updatedCourse[0].updated_at.getTime()).toBeGreaterThan(testCourse.updated_at.getTime());
  });

  it('should work with courses in draft status', async () => {
    // Create a test user first
    const [testUser] = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'instructor'
      })
      .returning()
      .execute();

    // Create a draft course
    const [testCourse] = await db.insert(coursesTable)
      .values({
        title: 'Draft Course',
        description: 'A course in draft status',
        instructor_id: testUser.id,
        status: 'draft'
      })
      .returning()
      .execute();

    const deleteInput: GetCourseByIdInput = {
      id: testCourse.id
    };

    // Delete the draft course
    await deleteCourse(deleteInput);

    // Verify the course status changed from draft to archived
    const updatedCourse = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, testCourse.id))
      .execute();

    expect(updatedCourse).toHaveLength(1);
    expect(updatedCourse[0].status).toEqual('archived');
    expect(updatedCourse[0].title).toEqual('Draft Course');
  });
});