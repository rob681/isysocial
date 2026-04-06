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
import { brandBrochureRouter } from "./routers/brandBrochure.router";
import { auditRouter } from "./routers/audit.router";
import { platformRouter } from "./routers/platform.router";
import { videoCommentsRouter } from "./routers/video-comments.router";
import { storiesRouter } from "./routers/stories.router";
import { mediaVersionsRouter } from "./routers/media-versions.router";
import { billingRouter } from "./routers/billing.router";
import { ecosystemRouter } from "./routers/ecosystem.router";
import { socialInsightsRouter } from "./routers/socialInsights.router";

export const appRouter = router({
  auth: authRouter,
  ai: aiRouter,
  audit: auditRouter,
  brandBrochure: brandBrochureRouter,
  videoComments: videoCommentsRouter,
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
  platform: platformRouter,
  stories: storiesRouter,
  mediaVersions: mediaVersionsRouter,
  billing: billingRouter,
  ecosystem: ecosystemRouter,
  socialInsights: socialInsightsRouter,
});

export type AppRouter = typeof appRouter;
