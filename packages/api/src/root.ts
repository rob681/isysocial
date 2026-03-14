import { router } from "./trpc";
import { authRouter } from "./routers/auth.router";
import { clientsRouter } from "./routers/clients.router";
import { editorsRouter } from "./routers/editors.router";
import { notificationsRouter } from "./routers/notifications.router";
import { agenciesRouter } from "./routers/agencies.router";
import { postsRouter } from "./routers/posts.router";
import { calendarRouter } from "./routers/calendar.router";
import { ideasRouter } from "./routers/ideas.router";
import { categoriesRouter } from "./routers/categories.router";
import { analyticsRouter } from "./routers/analytics.router";
import { templatesRouter } from "./routers/templates.router";
import { profileRouter } from "./routers/profile.router";
import { clientGroupsRouter } from "./routers/clientGroups.router";
import { publishingRouter } from "./routers/publishing.router";
import { aiRouter } from "./routers/ai.router";

export const appRouter = router({
  auth: authRouter,
  ai: aiRouter,
  clients: clientsRouter,
  clientGroups: clientGroupsRouter,
  publishing: publishingRouter,
  editors: editorsRouter,
  notifications: notificationsRouter,
  agencies: agenciesRouter,
  posts: postsRouter,
  calendar: calendarRouter,
  ideas: ideasRouter,
  categories: categoriesRouter,
  analytics: analyticsRouter,
  templates: templatesRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
