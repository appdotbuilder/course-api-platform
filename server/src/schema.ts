import { z } from 'zod';

// User roles enum
export const userRoleEnum = z.enum(['student', 'instructor', 'admin']);
export type UserRole = z.infer<typeof userRoleEnum>;

// Course status enum
export const courseStatusEnum = z.enum(['draft', 'published', 'archived']);
export type CourseStatus = z.infer<typeof courseStatusEnum>;

// API Key status enum
export const apiKeyStatusEnum = z.enum(['active', 'revoked']);
export type ApiKeyStatus = z.infer<typeof apiKeyStatusEnum>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Course schema
export const courseSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  instructor_id: z.number(),
  status: courseStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Course = z.infer<typeof courseSchema>;

// Enrollment schema
export const enrollmentSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  course_id: z.number(),
  enrolled_at: z.coerce.date()
});

export type Enrollment = z.infer<typeof enrollmentSchema>;

// API Key schema
export const apiKeySchema = z.object({
  id: z.number(),
  key_name: z.string(),
  key_hash: z.string(),
  created_by: z.number(),
  status: apiKeyStatusEnum,
  created_at: z.coerce.date(),
  revoked_at: z.coerce.date().nullable()
});

export type ApiKey = z.infer<typeof apiKeySchema>;

// Input schemas for creating entities

// User registration/creation input
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleEnum.default('student')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// User login input
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Course creation input
export const createCourseInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  instructor_id: z.number(),
  status: courseStatusEnum.default('draft')
});

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

// Course update input
export const updateCourseInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: courseStatusEnum.optional()
});

export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

// Enrollment creation input
export const createEnrollmentInputSchema = z.object({
  student_id: z.number(),
  course_id: z.number()
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentInputSchema>;

// API Key creation input
export const createApiKeyInputSchema = z.object({
  key_name: z.string().min(1),
  created_by: z.number()
});

export type CreateApiKeyInput = z.infer<typeof createApiKeyInputSchema>;

// API Key revocation input
export const revokeApiKeyInputSchema = z.object({
  id: z.number()
});

export type RevokeApiKeyInput = z.infer<typeof revokeApiKeyInputSchema>;

// Query inputs
export const getUserByIdInputSchema = z.object({
  id: z.number()
});

export type GetUserByIdInput = z.infer<typeof getUserByIdInputSchema>;

export const getCourseByIdInputSchema = z.object({
  id: z.number()
});

export type GetCourseByIdInput = z.infer<typeof getCourseByIdInputSchema>;

export const getCoursesByInstructorInputSchema = z.object({
  instructor_id: z.number()
});

export type GetCoursesByInstructorInput = z.infer<typeof getCoursesByInstructorInputSchema>;

export const getEnrollmentsByStudentInputSchema = z.object({
  student_id: z.number()
});

export type GetEnrollmentsByStudentInput = z.infer<typeof getEnrollmentsByStudentInputSchema>;