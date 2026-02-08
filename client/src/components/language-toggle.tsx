import { useLanguage, LANGUAGES, type Language } from "@/lib/i18n";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function LanguageToggle({ variant = "default" }: { variant?: "default" | "ghost" | "minimal" }) {
  const { lang, setLang } = useLanguage();
  const current = LANGUAGES.find(l => l.code === lang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "minimal" ? "ghost" : "outline"}
          size="sm"
          className="gap-1.5 h-8 px-2.5"
          data-testid="button-language-toggle"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="text-xs font-medium uppercase">{lang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`gap-2 ${lang === l.code ? "font-bold bg-muted" : ""}`}
            data-testid={`button-lang-${l.code}`}
          >
            <span>{l.nativeLabel}</span>
            {lang === l.code && <span className="text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
