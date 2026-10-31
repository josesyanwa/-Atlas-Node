import { Link, useSearch } from "@tanstack/react-router";
import { Rocket } from "lucide-react";
import { useState } from "react";

import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { AuthThemeToggle } from "@/components/theme/auth-theme-toggle";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSignInEmail } from "@/hooks/api/use-auth";
import {
  DEFAULT_AUTH_REDIRECT_PATH,
  GOOGLE_SIGN_IN_ROUTE_PATH,
  buildAuthRouteWithRedirect,
  normalizeRedirectPath,
  toAbsoluteCallbackURL,
} from "@/lib/auth-redirect";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  return fallback;
}

export function SignInPage() {
  const search = useSearch({ strict: false }) as {
    redirect?: string;
    reset?: "success";
  };
  const redirectTo = normalizeRedirectPath(search.redirect);
  const callbackURL = toAbsoluteCallbackURL(redirectTo);

  const signInEmail = useSignInEmail();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);

  const handleEmailSignIn = async (values: {
    name?: string;
    email: string;
    password: string;
  }) => {
    setErrorMessage(null);
    setUnverifiedEmail(null);

    const result = await signInEmail.mutateAsync({
      email: values.email,
      password: values.password,
      callbackURL,
    });

    if (result.error) {
      const message = getErrorMessage(result.error, "Unable to sign in.");
      setErrorMessage(message);
      if (message.toLowerCase().includes("verify your email")) {
        setUnverifiedEmail(values.email);
      }
      return;
    }

    window.location.assign(redirectTo);
  };

  const handleGoogleSignIn = () => {
    setErrorMessage(null);
    setIsGoogleRedirecting(true);
    window.location.assign(
      buildAuthRouteWithRedirect(GOOGLE_SIGN_IN_ROUTE_PATH, redirectTo),
    );
  };

  return (
    <>
      <AuthThemeToggle />
      <main className="mx-auto grid min-h-screen w-full max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-16 md:px-8">
        <section className="mx-auto w-full max-w-xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Atlas Node · Client portal for accounting teams
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Client onboarding, without the email chase.
          </h1>
          <p className="max-w-lg text-base leading-7 text-muted-foreground">
            Atlas Node helps small accounting and bookkeeping firms invite
            clients, request financial documents, and track what has been
            received through a private portal.
          </p>
        </section>

        <Card className="mx-auto w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="size-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>
              Use your email/password or continue with Google.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {search.reset === "success" ? (
              <div
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                role="status"
              >
                Password updated. Sign in with your new password.
              </div>
            ) : null}

            <EmailAuthForm
              mode="sign-in"
              isPending={signInEmail.isPending}
              errorMessage={errorMessage}
              onSubmit={handleEmailSignIn}
            />
            {unverifiedEmail ? (
              <p className="text-center text-sm text-muted-foreground">
                <Link
                  to="/verify-email"
                  search={{
                    email: unverifiedEmail,
                    redirect: redirectTo,
                  }}
                  className="font-medium text-primary underline"
                >
                  Enter your email verification code
                </Link>
                {" or resend it"}
              </p>
            ) : null}

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>

            <GoogleAuthButton
              isPending={isGoogleRedirecting}
              onClick={handleGoogleSignIn}
              label="Sign in with Google"
            />

            <p className="text-center text-sm text-muted-foreground">
              Need an account?{" "}
              <Link
                to="/sign-up"
                search={
                  redirectTo === DEFAULT_AUTH_REDIRECT_PATH
                    ? {}
                    : { redirect: redirectTo }
                }
                className="font-medium text-primary underline"
              >
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
