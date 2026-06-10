import { useEffect, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useAuth,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  Switch,
  Route,
  Redirect,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { PremiumProvider } from "@/context/PremiumProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import NotFound from "@/pages/not-found";
import HabitTracker from "@/pages/HabitTracker";
import Landing from "@/pages/Landing";
import Upgrade from "@/pages/Upgrade";
import Analytics from "@/pages/Analytics";

// REQUIRED — copy verbatim.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev, auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#ffffff",
    colorForeground: "#fafafa",
    colorMutedForeground: "#a1a1aa",
    colorDanger: "#ef4444",
    colorBackground: "#0a0a0a",
    colorInput: "#171717",
    colorInputForeground: "#fafafa",
    colorNeutral: "#ffffff",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-neutral-950 border border-white/10 rounded-2xl w-[400px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white text-xl font-semibold",
    headerSubtitle: "text-white/50",
    socialButtonsBlockButtonText: "text-white/90 font-medium",
    formFieldLabel: "text-white/70",
    footerActionLink: "text-white font-medium hover:text-white/80",
    footerActionText: "text-white/45",
    dividerText: "text-white/40",
    identityPreviewEditButton: "text-white/70 hover:text-white",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-white/80",
    logoBox: "h-10",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton:
      "border border-white/15 bg-white/5 hover:bg-white/10",
    formButtonPrimary:
      "bg-white text-black hover:bg-white/90 font-semibold",
    formFieldInput:
      "bg-neutral-900 border border-white/15 text-white",
    footerAction: "text-white/45",
    dividerLine: "bg-white/10",
    alert: "bg-white/5 border border-white/10",
    otpCodeFieldInput: "bg-neutral-900 border border-white/15 text-white",
    main: "gap-5",
  },
};

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <span className="text-5xl font-bold tracking-tight text-white">
        Habito
      </span>
    </div>
  );
}

function AppShell() {
  const { isLoaded } = useAuth();

  if (!isLoaded) return <LoadingScreen />;

  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/app">
        <SignedInOnly>
          <HabitTracker />
        </SignedInOnly>
      </Route>
      <Route path="/upgrade">
        <SignedInOnly>
          <Upgrade />
        </SignedInOnly>
      </Route>
      <Route path="/analytics">
        <SignedInOnly>
          <Analytics />
        </SignedInOnly>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function SignedInOnly({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your habit tracker",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Start building better habits today",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <PremiumProvider>
          <ThemeProvider>
            <TooltipProvider>
              <AppShell />
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </PremiumProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
