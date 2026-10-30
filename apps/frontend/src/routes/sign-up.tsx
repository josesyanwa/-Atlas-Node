import { Link, useSearch } from "@tanstack/react-router";
import { Building2, Rocket, ShieldCheck, UsersRound } from "lucide-react";
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
import { useSignUpEmail } from "@/hooks/api/use-auth";
import {
  DEFAULT_AUTH_REDIRECT_PATH,
  GOOGLE_SIGN_UP_ROUTE_PATH,
  buildVerifyEmailRoute,
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

export function SignUpPage() {
  const search = useSearch({ strict: false }) as { redirect?: string; email?: string };
  const redirectTo = normalizeRedirectPath(search.redirect);
  const callbackURL = toAbsoluteCallbackURL(redirectTo);

  const signUpEmail = useSignUpEmail();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);

  const handleEmailSignUp = async (values: {
    name?: string;
    email: string;
    password: string;
  }) => {
    setErrorMessage(null);

    if (!values.name) {
      setErrorMessage("Name is required.");
      return;
    }

    const result = await signUpEmail.mutateAsync({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL,
    });

    if (result.error) {
      setErrorMessage(getErrorMessage(result.error, "Unable to create account."));
      return;
    }

    window.location.assign(buildVerifyEmailRoute(values.email, redirectTo));
  };

  const handleGoogleSignUp = () => {
    setErrorMessage(null);
    setIsGoogleRedirecting(true);
    window.location.assign(
      buildAuthRouteWithRedirect(GOOGLE_SIGN_UP_ROUTE_PATH, redirectTo),
    );
  };

  return (
    <>
      <AuthThemeToggle />
      <main className="mx-auto grid min-h-screen w-full max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-16 md:px-8">
        <section className="mx-auto w-full max-w-xl space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Atlas Node
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Your team, organized from day one.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              Bring your organization and teammates together in one clear,
              secure workspace. Manage access, collaborate with the right
              people, and keep the essentials close at hand.
            </p>
          </div>

          <ul className="space-y-5">
            <li className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <h2 className="text-sm font-medium">One shared workspace</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Keep your organization and its members together in one place.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Access that fits each role</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Give owners, admins, and viewers the right level of access.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <UsersRound className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Bring people in easily</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Invite teammates and manage membership as your team grows.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <Card className="mx-auto w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="size-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>
              Sign up with email/password or continue with Google.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <EmailAuthForm
              mode="sign-up"
              isPending={signUpEmail.isPending}
              errorMessage={errorMessage}
              initialEmail={search.email ?? ""}
              onSubmit={handleEmailSignUp}
            />

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>

            <GoogleAuthButton
              isPending={isGoogleRedirecting}
              onClick={handleGoogleSignUp}
              label="Sign up with Google"
            />

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/sign-in"
                search={
                  redirectTo === DEFAULT_AUTH_REDIRECT_PATH
                    ? {}
                    : { redirect: redirectTo }
                }
                className="font-medium text-primary underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
