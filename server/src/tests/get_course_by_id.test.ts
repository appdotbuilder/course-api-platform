import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetCourseByIdInput } from '../schema';
import { getCourseById } from '../handlers/get_course_by_id';

describe('getCourseById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let instructorId: number;
  let courseId: number;

  beforeEach(async () => {
    // Create instructor first (prerequisite for courses)
    const instructorResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'instructor'
      })
      .returning()
      .execute();
    
    instructorId = instructorResult[0].id;

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course description',
        instructor_id: instructorId,
        status: 'published'
      })
      .returning()
      .execute();
    
    courseId = courseResult[0].id;
  });

  it('should return course when found', async () => {
    const input: GetCourseByIdInput = { id: courseId };
    
    const result = await getCourseById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(courseId);
    expect(result!.title).toBe('Test Course');
    expect(result!.description).toBe('A test course description');
    expect(result!.instructor_id).toBe(instructorId);
    expect(result!.status).toBe('published');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when course not found', async () => {
    const input: GetCourseByIdInput = { id: 99999 }; // Non-existent ID
    
    const result = await getCourseById(input);

    expect(result).toBeNull();
  });

  it('should handle course with null description', async () => {
    // Create course with null description
    const courseWithNullDesc = await db.insert(coursesTable)
      .values({
        title: 'Course No Description',
        description: null,
        instructor_id: instructorId,
        status: 'draft'
      })
      .returning()
      .execute();

    const input: GetCourseByIdInput = { id: courseWithNullDesc[0].id };
    
    const result = await getCourseById(input);

    expect(result).not.toBeNull();
    expect(result!.title).toBe('Course No Description');
    expect(result!.description).toBeNull();
    expect(result!.status).toBe('draft');
    expect(result!.instructor_id).toBe(instructorId);
  });

  it('should return course with different statuses', async () => {
    // Test with archived status
    const archivedCourse = await db.insert(coursesTable)
      .values({
        title: 'Archived Course',
        description: 'This course is archived',
        instructor_id: instructorId,
        status: 'archived'
      })
      .returning()
      .execute();

    const input: GetCourseByIdInput = { id: archivedCourse[0].id };
    
    const result = await getCourseById(input);

    expect(result).not.toBeNull();
    expect(result!.status).toBe('archived');
    expect(result!.title).toBe('Archived Course');
  });

  it('should verify data persisted in database', async () => {
    const input: GetCourseByIdInput = { id: courseId };
    
    // Call handler
    const handlerResult = await getCourseById(input);

    // Verify directly from database
    const dbResults = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    expect(dbResults).toHaveLength(1);
    expect(handlerResult).toEqual({
      id: dbResults[0].id,
      title: dbResults[0].title,
      description: dbResults[0].description,
      instructor_id: dbResults[0].instructor_id,
      status: dbResults[0].status,
      created_at: dbResults[0].created_at,
      updated_at: dbResults[0].updated_at
    });
  });
});