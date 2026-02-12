import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type Language } from "@/lib/i18n";

const languages: { code: Language; label: string; display: string }[] = [
  { code: "en", label: "English", display: "EN" },
  { code: "fr", label: "Français", display: "FR" },
  { code: "ar", label: "العربية", display: "AR" },
];

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const current = languages.find((l) => l.code === language) ?? languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          data-testid="button-language-toggle"
          className="gap-1.5"
        >
          <Globe className="w-4 h-4" />
          <span>{current.display}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            data-testid={`option-lang-${lang.code}`}
            onClick={() => setLanguage(lang.code)}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
