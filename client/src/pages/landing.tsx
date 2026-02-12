import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Sparkles,
  Upload,
  MessageSquare,
  GraduationCap,
  Calculator,
  Atom,
  Leaf,
  Languages,
  Type,
  FileText,
  Search,
  BookMarked,
  Target,
  ArrowRight,
  Clock,
  Library,
  Layers,
  User,
} from "lucide-react";

export default function LandingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { t, dir, language } = useLanguage();

  const subjects = [
    {
      key: "math",
      icon: Calculator,
    },
    {
      key: "physics",
      icon: Atom,
    },
    {
      key: "science",
      icon: Leaf,
    },
    {
      key: "philosophy",
      icon: BookOpen,
    },
    {
      key: "french",
      icon: Languages,
    },
    {
      key: "arabic",
      icon: Type,
    },
  ];

  const features = [
    {
      key: "rag",
      icon: Search,
    },
    {
      key: "steps",
      icon: Layers,
    },
    {
      key: "citations",
      icon: FileText,
    },
    {
      key: "exam",
      icon: Target,
    },
  ];

  const steps = [
    {
      number: "01",
      key: "step1",
      icon: Upload,
    },
    {
      number: "02",
      key: "step2",
      icon: MessageSquare,
    },
    {
      number: "03",
      key: "step3",
      icon: GraduationCap,
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <BookOpen className="w-10 h-10 text-primary" />
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <nav
        className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg"
        data-testid="nav-bar"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-primary">
              <BookOpen className="w-5 h-5" />
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight">BACMR</span>
              <span className="text-xs text-muted-foreground font-medium">
                {"باك مار"}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground transition-colors"
              data-testid="link-how-it-works"
            >
              {t("nav.howItWorks")}
            </a>
            <a
              href="#subjects"
              className="text-sm text-muted-foreground transition-colors"
              data-testid="link-subjects"
            >
              {t("nav.subjects")}
            </a>
            <a
              href="#features"
              className="text-sm text-muted-foreground transition-colors"
              data-testid="link-features"
            >
              {t("nav.features")}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            {isAuthenticated && user ? (
              <Button asChild data-testid="button-user-nav">
                <a href={user.role === "admin" ? "/admin" : "/chat"} className="gap-2">
                  <User className="w-4 h-4" />
                  {user.firstName || user.username || user.email || "Account"}
                </a>
              </Button>
            ) : (
              <Button asChild data-testid="button-sign-in">
                <a href="/login">{t("nav.signIn")}</a>
              </Button>
            )}
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">{t("hero.badge")}</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
              data-testid="text-hero-title"
            >
              {t("hero.title")}{" "}
              <span className="text-primary">{t("hero.titleHighlight")}</span>
            </h1>

            <p
              className="mt-4 text-lg sm:text-xl text-muted-foreground font-medium"
              data-testid="text-hero-arabic"
            >
              {t("hero.subtitle")}
            </p>

            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("hero.description")}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild data-testid="button-start-learning">
                <a href="/chat" className="gap-2">
                  {t("hero.startLearning")}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-see-how">
                <a href="#how-it-works">{t("hero.seeHow")}</a>
              </Button>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-lg bg-card border border-card-border">
              <Library className="w-5 h-5 text-primary mb-1" />
              <span className="text-lg sm:text-xl font-bold" data-testid="text-stat-pages">500+</span>
              <span className="text-xs text-muted-foreground text-center">{t("stats.pagesIndexed")}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-lg bg-card border border-card-border">
              <BookMarked className="w-5 h-5 text-primary mb-1" />
              <span className="text-lg sm:text-xl font-bold" data-testid="text-stat-subjects">10+</span>
              <span className="text-xs text-muted-foreground text-center">{t("stats.subjects")}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-lg bg-card border border-card-border">
              <Clock className="w-5 h-5 text-primary mb-1" />
              <span className="text-lg sm:text-xl font-bold" data-testid="text-stat-availability">24/7</span>
              <span className="text-xs text-muted-foreground text-center">{t("stats.available")}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t("howItWorks.title")}
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              {t("howItWorks.description")}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((step) => (
              <Card key={step.number} className="relative overflow-visible" data-testid={`card-step-${step.number}`}>
                <CardContent className="p-6 pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs font-mono text-primary font-semibold">
                        {step.number}
                      </span>
                      <h3 className="text-lg font-semibold mt-0.5">{t(`howItWorks.${step.key}.title`)}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {t(`howItWorks.${step.key}.description`)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="subjects" className="py-20 sm:py-24 bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t("subjects.title")}
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              {t("subjects.description")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <Card
                key={subject.key}
                className="hover-elevate transition-transform"
                data-testid={`card-subject-${subject.key}`}
              >
                <CardContent className="p-6 pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <subject.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{t(`subjects.${subject.key}.name`)}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                        {t(`subjects.${subject.key}.description`)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t("features.title")}
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              {t("features.description")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.key} data-testid={`card-feature-${feature.key}`}>
                <CardContent className="p-6 pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{t(`features.${feature.key}.title`)}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                        {t(`features.${feature.key}.description`)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-xl overflow-hidden bg-primary px-6 py-16 sm:px-16 sm:py-20 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-90" />
            <div className="relative z-10">
              <h2
                className="text-3xl sm:text-4xl font-bold text-primary-foreground tracking-tight"
                data-testid="text-cta-heading"
              >
                {t("cta.title")}
              </h2>
              <p
                className="mt-4 text-lg text-primary-foreground/80 font-medium"
              >
                {t("cta.subtitle")}
              </p>
              <div className="mt-8">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm text-primary-foreground border-white/20"
                  asChild
                  data-testid="button-cta-signup"
                >
                  <a href="/chat" className="gap-2">
                    {t("cta.button")}
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10" data-testid="footer">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-primary">
                <BookOpen className="w-4 h-4" />
                <Sparkles className="w-3 h-3" />
              </div>
              <span className="font-bold">BACMR</span>
              <span className="text-xs text-muted-foreground">
                {"باك مار"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("footer.tagline")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("footer.builtBy")}{" "}
              <a
                href="https://www.lebjawi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
                data-testid="link-lebjawi"
              >
                Lebjawi Tech
              </a>{" "}
              &mdash; {t("footer.allRights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
