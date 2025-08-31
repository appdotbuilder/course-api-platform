import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  getUserByIdInputSchema,
  createCourseInputSchema,
  updateCourseInputSchema,
  getCourseByIdInputSchema,
  getCoursesByInstructorInputSchema,
  createEnrollmentInputSchema,
  getEnrollmentsByStudentInputSchema,
  createApiKeyInputSchema,
  revokeApiKeyInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { login } from './handlers/login';
import { getUserById } from './handlers/get_user_by_id';
import { getUsers } from './handlers/get_users';
import { createCourse } from './handlers/create_course';
import { updateCourse } from './handlers/update_course';
import { getCourses } from './handlers/get_courses';
import { getCourseById } from './handlers/get_course_by_id';
import { getCoursesByInstructor } from './handlers/get_courses_by_instructor';
import { deleteCourse } from './handlers/delete_course';
import { createEnrollment } from './handlers/create_enrollment';
import { getEnrollmentsByStudent } from './handlers/get_enrollments_by_student';
import { createApiKey } from './handlers/create_api_key';
import { getApiKeys } from './handlers/get_api_keys';
import { revokeApiKey } from './handlers/revoke_api_key';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
    
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
    
  getUserById: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getUserById(input)),
    
  getUsers: publicProcedure
    .query(() => getUsers()),

  // Course management routes
  createCourse: publicProcedure
    .input(createCourseInputSchema)
    .mutation(({ input }) => createCourse(input)),
    
  updateCourse: publicProcedure
    .input(updateCourseInputSchema)
    .mutation(({ input }) => updateCourse(input)),
    
  getCourses: publicProcedure
    .query(() => getCourses()),
    
  getCourseById: publicProcedure
    .input(getCourseByIdInputSchema)
    .query(({ input }) => getCourseById(input)),
    
  getCoursesByInstructor: publicProcedure
    .input(getCoursesByInstructorInputSchema)
    .query(({ input }) => getCoursesByInstructor(input)),
    
  deleteCourse: publicProcedure
    .input(getCourseByIdInputSchema)
    .mutation(({ input }) => deleteCourse(input)),

  // Enrollment management routes
  createEnrollment: publicProcedure
    .input(createEnrollmentInputSchema)
    .mutation(({ input }) => createEnrollment(input)),
    
  getEnrollmentsByStudent: publicProcedure
    .input(getEnrollmentsByStudentInputSchema)
    .query(({ input }) => getEnrollmentsByStudent(input)),

  // API Key management routes
  createApiKey: publicProcedure
    .input(createApiKeyInputSchema)
    .mutation(({ input }) => createApiKey(input)),
    
  getApiKeys: publicProcedure
    .query(() => getApiKeys()),
    
  revokeApiKey: publicProcedure
    .input(revokeApiKeyInputSchema)
    .mutation(({ input }) => revokeApiKey(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();