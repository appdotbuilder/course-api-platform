import { serial, text, pgTable, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['student', 'instructor', 'admin']);
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published', 'archived']);
export const apiKeyStatusEnum = pgEnum('api_key_status', ['active', 'revoked']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull().default('student'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Courses table
export const coursesTable = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  instructor_id: integer('instructor_id').notNull().references(() => usersTable.id),
  status: courseStatusEnum('status').notNull().default('draft'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Enrollments table
export const enrollmentsTable = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  enrolled_at: timestamp('enrolled_at').defaultNow().notNull()
});

// API Keys table
export const apiKeysTable = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  key_name: text('key_name').notNull(),
  key_hash: text('key_hash').notNull().unique(),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  status: apiKeyStatusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  revoked_at: timestamp('revoked_at') // Nullable by default
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  courses: many(coursesTable),
  enrollments: many(enrollmentsTable),
  apiKeys: many(apiKeysTable)
}));

export const coursesRelations = relations(coursesTable, ({ one, many }) => ({
  instructor: one(usersTable, {
    fields: [coursesTable.instructor_id],
    references: [usersTable.id]
  }),
  enrollments: many(enrollmentsTable)
}));

export const enrollmentsRelations = relations(enrollmentsTable, ({ one }) => ({
  student: one(usersTable, {
    fields: [enrollmentsTable.student_id],
    references: [usersTable.id]
  }),
  course: one(coursesTable, {
    fields: [enrollmentsTable.course_id],
    references: [coursesTable.id]
  })
}));

export const apiKeysRelations = relations(apiKeysTable, ({ one }) => ({
  creator: one(usersTable, {
    fields: [apiKeysTable.created_by],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Course = typeof coursesTable.$inferSelect;
export type NewCourse = typeof coursesTable.$inferInsert;

export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type NewEnrollment = typeof enrollmentsTable.$inferInsert;

export type ApiKey = typeof apiKeysTable.$inferSelect;
export type NewApiKey = typeof apiKeysTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  courses: coursesTable,
  enrollments: enrollmentsTable,
  apiKeys: apiKeysTable
};