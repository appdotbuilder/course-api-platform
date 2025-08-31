import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable } from '../db/schema';
import { getCourses } from '../handlers/get_courses';

describe('getCourses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only published courses', async () => {
    // Create test instructor first
    const instructors = await db.insert(usersTable)
      .values([
        {
          email: 'instructor@example.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Doe',
          role: 'instructor'
        }
      ])
      .returning()
      .execute();

    const instructorId = instructors[0].id;

    // Create courses with different statuses
    await db.insert(coursesTable)
      .values([
        {
          title: 'Published Course 1',
          description: 'A published course',
          instructor_id: instructorId,
          status: 'published'
        },
        {
          title: 'Draft Course',
          description: 'A draft course',
          instructor_id: instructorId,
          status: 'draft'
        },
        {
          title: 'Published Course 2',
          description: 'Another published course',
          instructor_id: instructorId,
          status: 'published'
        },
        {
          title: 'Archived Course',
          description: 'An archived course',
          instructor_id: instructorId,
          status: 'archived'
        }
      ])
      .execute();

    const result = await getCourses();

    // Should only return published courses
    expect(result).toHaveLength(2);
    
    const courseTitles = result.map(course => course.title);
    expect(courseTitles).toContain('Published Course 1');
    expect(courseTitles).toContain('Published Course 2');
    expect(courseTitles).not.toContain('Draft Course');
    expect(courseTitles).not.toContain('Archived Course');

    // Verify all returned courses have published status
    result.forEach(course => {
      expect(course.status).toEqual('published');
    });
  });

  it('should return empty array when no published courses exist', async () => {
    // Create test instructor first
    const instructors = await db.insert(usersTable)
      .values([
        {
          email: 'instructor@example.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Doe',
          role: 'instructor'
        }
      ])
      .returning()
      .execute();

    const instructorId = instructors[0].id;

    // Create only non-published courses
    await db.insert(coursesTable)
      .values([
        {
          title: 'Draft Course',
          description: 'A draft course',
          instructor_id: instructorId,
          status: 'draft'
        },
        {
          title: 'Archived Course',
          description: 'An archived course',
          instructor_id: instructorId,
          status: 'archived'
        }
      ])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(0);
  });

  it('should return all course fields correctly', async () => {
    // Create test instructor first
    const instructors = await db.insert(usersTable)
      .values([
        {
          email: 'instructor@example.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Doe',
          role: 'instructor'
        }
      ])
      .returning()
      .execute();

    const instructorId = instructors[0].id;

    // Create a published course
    await db.insert(coursesTable)
      .values([
        {
          title: 'Test Course',
          description: 'A test course description',
          instructor_id: instructorId,
          status: 'published'
        }
      ])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    
    const course = result[0];
    expect(course.id).toBeDefined();
    expect(course.title).toEqual('Test Course');
    expect(course.description).toEqual('A test course description');
    expect(course.instructor_id).toEqual(instructorId);
    expect(course.status).toEqual('published');
    expect(course.created_at).toBeInstanceOf(Date);
    expect(course.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    // Create test instructor first
    const instructors = await db.insert(usersTable)
      .values([
        {
          email: 'instructor@example.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Doe',
          role: 'instructor'
        }
      ])
      .returning()
      .execute();

    const instructorId = instructors[0].id;

    // Create a published course with null description
    await db.insert(coursesTable)
      .values([
        {
          title: 'Course Without Description',
          description: null,
          instructor_id: instructorId,
          status: 'published'
        }
      ])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Course Without Description');
    expect(result[0].description).toBeNull();
  });
});