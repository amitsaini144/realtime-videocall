import { clerkMiddleware } from '@clerk/nextjs/server';

// '/' and '/room/(.*)' are intentionally public so guests can use them
// without a Clerk session; auth is enforced at the page level instead.
export default clerkMiddleware();

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};