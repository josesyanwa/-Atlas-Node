import { lazy, Suspense } from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { AuthAPI } from "@/api/auth.api";
import { clearSignedOutUserState } from "@/hooks/api/use-auth";
import { normalizeRedirectPath } from "@/lib/auth-redirect";

const AppShell = lazy(() =>
  import("@/components/layout/app-shell").then((module) => ({
    default: module.AppShell,
  })),
);
const AcceptInvitePage = lazy(() =>
  import("@/routes/accept-invite").then((module) => ({
    default: module.AcceptInvitePage,
  })),
);
const AuthErrorPage = lazy(() =>
  import("@/routes/auth-error").then((module) => ({
    default: module.AuthErrorPage,
  })),
);
const ClientPortalHistoryPage = lazy(() =>
  import("@/routes/client-portal").then((module) => ({
    default: module.ClientPortalHistoryPage,
  })),
);
const ClientPortalPage = lazy(() =>
  import("@/routes/client-portal").then((module) => ({
    default: module.ClientPortalPage,
  })),
);
const ClientPortalInvitePage = lazy(() =>
  import("@/routes/client-portal").then((module) => ({
    default: module.ClientPortalInvitePage,
  })),
);
const ClientsPage = lazy(() =>
  import("@/routes/clients").then((module) => ({
    default: module.ClientsPage,
  })),
);
const CreateOrganizationPage = lazy(() =>
  import("@/routes/create-organization").then((module) => ({
    default: module.CreateOrganizationPage,
  })),
);
const DashboardPage = lazy(() =>
  import("@/routes/dashboard").then((module) => ({
    default: module.DashboardPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("@/routes/forgot-password").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const GoogleSignInPage = lazy(() =>
  import("@/routes/google-sign-in").then((module) => ({
    default: module.GoogleSignInPage,
  })),
);
const GoogleSignUpPage = lazy(() =>
  import("@/routes/google-sign-up").then((module) => ({
    default: module.GoogleSignUpPage,
  })),
);
const HomePage = lazy(() =>
  import("@/routes/home").then((module) => ({ default: module.HomePage })),
);
const OrganizationMembersPage = lazy(() =>
  import("@/routes/organization-members").then((module) => ({
    default: module.OrganizationMembersPage,
  })),
);
const OrganizationSettingsPage = lazy(() =>
  import("@/routes/organization-settings").then((module) => ({
    default: module.OrganizationSettingsPage,
  })),
);
const PendingInvitesPage = lazy(() =>
  import("@/routes/pending-invites").then((module) => ({
    default: module.PendingInvitesPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("@/routes/reset-password").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/routes/settings").then((module) => ({
    default: module.SettingsPage,
  })),
);
const SignInPage = lazy(() =>
  import("@/routes/sign-in").then((module) => ({
    default: module.SignInPage,
  })),
);
const SignUpPage = lazy(() =>
  import("@/routes/sign-up").then((module) => ({
    default: module.SignUpPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("@/routes/verify-email").then((module) => ({
    default: module.VerifyEmailPage,
  })),
);

type AuthSearch = {
  redirect?: string;
  email?: string;
};

type SignInSearch = AuthSearch & { reset?: "success" };

type VerifyEmailSearch = {
  redirect?: string;
  email?: string;
};

type AuthErrorSearch = {
  redirect?: string;
  mode?: "sign-in" | "sign-up";
  message?: string;
  error?: string;
  error_description?: string;
};

type ResetPasswordSearch = { email?: string };

type AcceptInviteSearch = {
  token?: string;
};

const authSearchSchema = (search: Record<string, unknown>): AuthSearch => ({
  redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  email: typeof search.email === "string" ? search.email : undefined,
});

const signInSearchSchema = (search: Record<string, unknown>): SignInSearch => ({
  redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  email: typeof search.email === "string" ? search.email : undefined,
  reset: search.reset === "success" ? "success" : undefined,
});

const resetPasswordSearchSchema = (
  search: Record<string, unknown>,
): ResetPasswordSearch => ({
  email: typeof search.email === "string" ? search.email : undefined,
});

const verifyEmailSearchSchema = (
  search: Record<string, unknown>,
): VerifyEmailSearch => ({
  redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  email: typeof search.email === "string" ? search.email : undefined,
});

const authErrorSearchSchema = (
  search: Record<string, unknown>,
): AuthErrorSearch => ({
  redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  mode:
    search.mode === "sign-in" || search.mode === "sign-up"
      ? search.mode
      : undefined,
  message: typeof search.message === "string" ? search.message : undefined,
  error: typeof search.error === "string" ? search.error : undefined,
  error_description:
    typeof search.error_description === "string"
      ? search.error_description
      : undefined,
});

const acceptInviteSearchSchema = (
  search: Record<string, unknown>,
): AcceptInviteSearch => ({
  token: typeof search.token === "string" ? search.token : undefined,
});

const rootRoute = createRootRoute({
  component: () => (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
          role="status"
        >
          Loading page…
        </div>
      }
    >
      <Outlet />
    </Suspense>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
      Page not found.
    </div>
  ),
});

async function redirectAuthenticatedUser(search: AuthSearch) {
  const sessionResult = await AuthAPI.getSession();
  if (!sessionResult.data?.session) {
    return;
  }

  if (sessionResult.data.user.emailVerified !== true) {
    throw redirect({
      to: "/verify-email",
      search: {
        email: sessionResult.data.user.email,
        redirect: normalizeRedirectPath(search.redirect),
      },
    });
  }

  throw redirect({ to: normalizeRedirectPath(search.redirect) });
}

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  validateSearch: signInSearchSchema,
  beforeLoad: async ({ search }) => {
    await redirectAuthenticatedUser(search);
  },
  component: SignInPage,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up",
  validateSearch: authSearchSchema,
  beforeLoad: async ({ search }) => {
    await redirectAuthenticatedUser(search);
  },
  component: SignUpPage,
});

const googleSignInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/google-sign-in",
  validateSearch: authSearchSchema,
  beforeLoad: async ({ search }) => {
    await redirectAuthenticatedUser(search);
  },
  component: GoogleSignInPage,
});

const googleSignUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/google-sign-up",
  validateSearch: authSearchSchema,
  beforeLoad: async ({ search }) => {
    await redirectAuthenticatedUser(search);
  },
  component: GoogleSignUpPage,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  validateSearch: verifyEmailSearchSchema,
  beforeLoad: async ({ search }) => {
    const sessionResult = await AuthAPI.getSession();
    if (
      sessionResult.data?.session &&
      sessionResult.data.user.emailVerified === true
    ) {
      throw redirect({ to: normalizeRedirectPath(search.redirect) });
    }
  },
  component: VerifyEmailPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  validateSearch: authSearchSchema,
  beforeLoad: async ({ search }) => {
    await redirectAuthenticatedUser(search);
  },
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

const authErrorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/error",
  validateSearch: authErrorSearchSchema,
  component: AuthErrorPage,
});

const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accept-invite",
  validateSearch: acceptInviteSearchSchema,
  component: AcceptInvitePage,
});

const clientPortalInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/client-portal/invite",
  validateSearch: acceptInviteSearchSchema,
  component: function ClientPortalInviteRoute() {
    const search = clientPortalInviteRoute.useSearch();
    return <ClientPortalInvitePage token={search.token} />;
  },
});

const clientPortalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/client-portal",
  beforeLoad: async () => {
    const sessionResult = await AuthAPI.getSession();
    if (!sessionResult.data?.session) {
      clearSignedOutUserState();
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/client-portal" },
      });
    }
    if (sessionResult.data.user.emailVerified !== true) {
      throw redirect({
        to: "/verify-email",
        search: {
          email: sessionResult.data.user.email,
          redirect: "/client-portal",
        },
      });
    }
  },
  component: ClientPortalPage,
});

const clientPortalHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/client-portal/history",
  beforeLoad: async () => {
    const sessionResult = await AuthAPI.getSession();
    if (!sessionResult.data?.session) {
      clearSignedOutUserState();
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/client-portal/history" },
      });
    }
    if (sessionResult.data.user.emailVerified !== true) {
      throw redirect({
        to: "/verify-email",
        search: {
          email: sessionResult.data.user.email,
          redirect: "/client-portal/history",
        },
      });
    }
  },
  component: ClientPortalHistoryPage,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  beforeLoad: async ({ location }) => {
    const sessionResult = await AuthAPI.getSession();
    if (!sessionResult.data?.session) {
      // Sessions also end without a click on Sign out (expiry, revocation).
      clearSignedOutUserState();
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: location.pathname,
        },
      });
    }

    if (sessionResult.data.user.emailVerified !== true) {
      throw redirect({
        to: "/verify-email",
        search: {
          email: sessionResult.data.user.email,
          redirect: location.pathname,
        },
      });
    }
  },
  component: AppShell,
});

const homeRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: HomePage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const clientsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/clients",
  component: ClientsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/settings",
  component: SettingsPage,
});

const createOrganizationRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/organizations/new",
  component: CreateOrganizationPage,
});

const pendingInvitesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/invites",
  component: PendingInvitesPage,
});

const organizationSettingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/settings/organization",
  component: OrganizationSettingsPage,
});

const organizationMembersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/settings/organization/members",
  component: OrganizationMembersPage,
});

const routeTree = rootRoute.addChildren([
  signInRoute,
  signUpRoute,
  googleSignInRoute,
  googleSignUpRoute,
  verifyEmailRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  authErrorRoute,
  acceptInviteRoute,
  clientPortalInviteRoute,
  clientPortalRoute,
  clientPortalHistoryRoute,
  protectedRoute.addChildren([
    homeRoute,
    dashboardRoute,
    clientsRoute,
    settingsRoute,
    createOrganizationRoute,
    pendingInvitesRoute,
    organizationSettingsRoute,
    organizationMembersRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
  interface StaticDataRouteOption {
    /**
     * The page owns its height and scroll: AppShell renders it edge to edge
     * instead of inside the padded, scrolling container.
     */
    fullBleed?: boolean;
  }
}
