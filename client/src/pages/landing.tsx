import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

export default function Landing() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-20 px-6 md:px-12 flex items-center justify-between border-b border-border/50">
        <div className="text-2xl font-serif font-bold text-primary">BACMR</div>
        <div className="flex gap-4">
          <LanguageToggle />
          <Link href="/auth/login">
            <Button variant="ghost">{t('landing', 'logIn')}</Button>
          </Link>
          <Link href="/auth/signup">
            <Button>{t('landing', 'getStarted')}</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-primary tracking-tight leading-tight">
            {t('landing', 'heroTitle')}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light">
            {t('landing', 'heroSubtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-md justify-center pt-8">
          <Link href="/auth/signup" className="w-full">
            <Button size="lg" className="w-full text-lg h-12">{t('landing', 'startLearning')}</Button>
          </Link>
          <Link href="/auth/login" className="w-full">
            <Button size="lg" variant="outline" className="w-full text-lg h-12">{t('landing', 'haveAccount')}</Button>
          </Link>
        </div>

        <div className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full">
          {[
            { title: t('landing', 'feature1Title'), desc: t('landing', 'feature1Desc') },
            { title: t('landing', 'feature2Title'), desc: t('landing', 'feature2Desc') },
            { title: t('landing', 'feature3Title'), desc: t('landing', 'feature3Desc') },
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-lg bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-serif font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        © 2026 BACMR. {t('landing', 'footer')}
      </footer>
    </div>
  );
}
