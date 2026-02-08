import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Language = "en" | "ar" | "fr";

export const LANGUAGES: { code: Language; label: string; nativeLabel: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
];

const translations = {
  nav: {
    dashboard: { en: "Dashboard", ar: "لوحة القيادة", fr: "Tableau de bord" },
    subjects: { en: "Subjects", ar: "المواد", fr: "Matières" },
    exams: { en: "Exams", ar: "الامتحانات", fr: "Examens" },
    profile: { en: "Profile", ar: "الملف الشخصي", fr: "Profil" },
    signOut: { en: "Sign Out", ar: "تسجيل الخروج", fr: "Déconnexion" },
    welcomeBack: { en: "Welcome back", ar: "مرحباً بعودتك", fr: "Bon retour" },
  },
  landing: {
    logIn: { en: "Log In", ar: "تسجيل الدخول", fr: "Connexion" },
    getStarted: { en: "Get Started", ar: "ابدأ الآن", fr: "Commencer" },
    heroTitle: { en: "Master the BAC with Confidence.", ar: "أتقن الباكالوريا بثقة.", fr: "Maîtrisez le BAC en toute confiance." },
    heroSubtitle: {
      en: "Your personal AI study companion. Aligned with the Mauritanian curriculum. Designed for clarity.",
      ar: "رفيقك الذكي في الدراسة. متوافق مع المنهج الموريتاني. مصمم للوضوح.",
      fr: "Votre compagnon d'étude IA. Aligné avec le programme mauritanien. Conçu pour la clarté.",
    },
    startLearning: { en: "Start Learning Free", ar: "ابدأ التعلم مجاناً", fr: "Commencer gratuitement" },
    haveAccount: { en: "I have an account", ar: "لدي حساب", fr: "J'ai un compte" },
    feature1Title: { en: "Official Curriculum", ar: "المنهج الرسمي", fr: "Programme officiel" },
    feature1Desc: { en: "100% aligned with the IPN program for all streams.", ar: "متوافق 100% مع برنامج IPN لجميع الشعب.", fr: "100% aligné avec le programme IPN pour toutes les séries." },
    feature2Title: { en: "Smart Explanations", ar: "شروحات ذكية", fr: "Explications intelligentes" },
    feature2Desc: { en: "Don't just get the answer. Understand the 'Why'.", ar: "لا تحصل على الإجابة فقط. افهم «لماذا».", fr: "Ne vous contentez pas de la réponse. Comprenez le « Pourquoi »." },
    feature3Title: { en: "Exam Archives", ar: "أرشيف الامتحانات", fr: "Archives d'examens" },
    feature3Desc: { en: "Practice with past papers from 2010 to 2025.", ar: "تدرب على امتحانات سابقة من 2010 إلى 2025.", fr: "Entraînez-vous avec les sujets de 2010 à 2025." },
    footer: { en: "Built for Mauritania.", ar: "صُنع لموريتانيا.", fr: "Conçu pour la Mauritanie." },
  },
  auth: {
    welcomeBack: { en: "Welcome back", ar: "مرحباً بعودتك", fr: "Bon retour" },
    enterEmail: { en: "Enter your email to sign in to your account", ar: "أدخل بريدك الإلكتروني لتسجيل الدخول", fr: "Entrez votre email pour vous connecter" },
    email: { en: "Email", ar: "البريد الإلكتروني", fr: "Email" },
    password: { en: "Password", ar: "كلمة المرور", fr: "Mot de passe" },
    signIn: { en: "Sign In", ar: "تسجيل الدخول", fr: "Se connecter" },
    signingIn: { en: "Signing in...", ar: "جاري الدخول...", fr: "Connexion..." },
    noAccount: { en: "Don't have an account?", ar: "ليس لديك حساب؟", fr: "Vous n'avez pas de compte ?" },
    signUp: { en: "Sign up", ar: "إنشاء حساب", fr: "S'inscrire" },
    createAccount: { en: "Create an account", ar: "إنشاء حساب", fr: "Créer un compte" },
    startJourney: { en: "Start your preparation journey today", ar: "ابدأ رحلة التحضير اليوم", fr: "Commencez votre préparation dès aujourd'hui" },
    fullName: { en: "Full Name", ar: "الاسم الكامل", fr: "Nom complet" },
    stream: { en: "Baccalaureate Stream", ar: "شعبة الباكالوريا", fr: "Série du Baccalauréat" },
    selectStream: { en: "Select your stream", ar: "اختر شعبتك", fr: "Choisissez votre série" },
    streamHelp: { en: "This will customize your dashboard and curriculum.", ar: "سيتم تخصيص لوحتك والمنهج الدراسي.", fr: "Cela personnalisera votre tableau de bord et programme." },
    creatingAccount: { en: "Creating account...", ar: "جاري إنشاء الحساب...", fr: "Création du compte..." },
    createAccountBtn: { en: "Create Account", ar: "إنشاء حساب", fr: "Créer un compte" },
    haveAccount: { en: "Already have an account?", ar: "لديك حساب بالفعل؟", fr: "Vous avez déjà un compte ?" },
    logIn: { en: "Log in", ar: "تسجيل الدخول", fr: "Se connecter" },
    loginFailed: { en: "Login failed. Please try again.", ar: "فشل تسجيل الدخول. حاول مرة أخرى.", fr: "Échec de la connexion. Veuillez réessayer." },
    registrationFailed: { en: "Registration failed. Please try again.", ar: "فشل التسجيل. حاول مرة أخرى.", fr: "Échec de l'inscription. Veuillez réessayer." },
  },
  dashboard: {
    goodMorning: { en: "Good Morning", ar: "صباح الخير", fr: "Bonjour" },
    continuePrep: { en: "Let's continue your preparation for", ar: "لنواصل تحضيرك لمادة", fr: "Continuons votre préparation pour" },
    continueGeneric: { en: "Let's continue your preparation.", ar: "لنواصل التحضير.", fr: "Continuons votre préparation." },
    getStarted: { en: "Get Started", ar: "ابدأ", fr: "Commencer" },
    continueLearning: { en: "Continue Learning", ar: "واصل التعلم", fr: "Continuer l'apprentissage" },
    completedLessons: { en: "You've completed {count} lesson(s) so far. Keep going!", ar: "لقد أكملت {count} درس حتى الآن. واصل!", fr: "Vous avez terminé {count} leçon(s). Continuez !" },
    startFirst: { en: "Start your first lesson today.", ar: "ابدأ أول درس لك اليوم.", fr: "Commencez votre première leçon aujourd'hui." },
    browseSubjects: { en: "Browse Subjects", ar: "تصفح المواد", fr: "Parcourir les matières" },
    lessonsCompleted: { en: "Lessons Completed", ar: "الدروس المكتملة", fr: "Leçons terminées" },
    keepStreak: { en: "Keep the streak alive!", ar: "حافظ على استمراريتك!", fr: "Maintenez le rythme !" },
    subjectsLabel: { en: "Subjects", ar: "المواد", fr: "Matières" },
    inCurriculum: { en: "In your curriculum", ar: "في منهجك", fr: "Dans votre programme" },
    progress: { en: "Progress", ar: "التقدم", fr: "Progrès" },
    done: { en: "done", ar: "مكتمل", fr: "terminé(s)" },
    justStarted: { en: "Just started", ar: "بدأت للتو", fr: "Juste commencé" },
    greatProgress: { en: "Great progress!", ar: "تقدم ممتاز!", fr: "Bon progrès !" },
  },
  subjects: {
    yourSubjects: { en: "Your Subjects", ar: "موادك", fr: "Vos matières" },
    selectSubject: { en: "Select a subject to browse lessons and chapters.", ar: "اختر مادة لتصفح الدروس والفصول.", fr: "Sélectionnez une matière pour parcourir les leçons." },
    chapters: { en: "Chapter(s)", ar: "فصل", fr: "Chapitre(s)" },
    lessonsDone: { en: "lessons done", ar: "دروس مكتملة", fr: "leçons terminées" },
    notStarted: { en: "Not started", ar: "لم يبدأ بعد", fr: "Pas encore commencé" },
    failedLoad: { en: "Failed to load subjects. Please try again.", ar: "فشل تحميل المواد. حاول مرة أخرى.", fr: "Échec du chargement des matières. Veuillez réessayer." },
    officialCurriculum: { en: "Official Curriculum", ar: "المنهج الرسمي", fr: "Programme officiel" },
    noChapters: { en: "No chapters available yet.", ar: "لا توجد فصول متاحة بعد.", fr: "Aucun chapitre disponible pour le moment." },
    noLessons: { en: "No lessons yet.", ar: "لا توجد دروس بعد.", fr: "Pas de leçons pour le moment." },
    review: { en: "Review", ar: "مراجعة", fr: "Revoir" },
    start: { en: "Start", ar: "ابدأ", fr: "Commencer" },
    min: { en: "min", ar: "د", fr: "min" },
  },
  exams: {
    examArchive: { en: "Exam Archive", ar: "أرشيف الامتحانات", fr: "Archive des examens" },
    practiceWith: { en: "Practice with official past papers.", ar: "تدرب على الامتحانات الرسمية السابقة.", fr: "Entraînez-vous avec les sujets officiels." },
    session: { en: "Session", ar: "الدورة", fr: "Session" },
    view: { en: "View", ar: "عرض", fr: "Voir" },
    noExams: { en: "No exam papers available yet.", ar: "لا توجد أوراق امتحان متاحة بعد.", fr: "Aucun sujet d'examen disponible pour le moment." },
  },
  profile: {
    profileSettings: { en: "Profile & Settings", ar: "الملف الشخصي والإعدادات", fr: "Profil et paramètres" },
    manageAccount: { en: "Manage your account and study preferences.", ar: "إدارة حسابك وتفضيلات الدراسة.", fr: "Gérez votre compte et vos préférences." },
    personalInfo: { en: "Personal Information", ar: "المعلومات الشخصية", fr: "Informations personnelles" },
    fullName: { en: "Full Name", ar: "الاسم الكامل", fr: "Nom complet" },
    email: { en: "Email", ar: "البريد الإلكتروني", fr: "Email" },
    academicSettings: { en: "Academic Settings", ar: "الإعدادات الأكاديمية", fr: "Paramètres académiques" },
    currentStream: { en: "Current Stream", ar: "الشعبة الحالية", fr: "Série actuelle" },
    notSelected: { en: "Not selected", ar: "غير محدد", fr: "Non sélectionné" },
    contactSupport: { en: "Contact support to change your stream.", ar: "تواصل مع الدعم لتغيير شعبتك.", fr: "Contactez le support pour changer de série." },
    sessionYear: { en: "Session Year", ar: "سنة الدورة", fr: "Année de session" },
    account: { en: "Account", ar: "الحساب", fr: "Compte" },
  },
  lesson: {
    lesson: { en: "Lesson", ar: "الدرس", fr: "Leçon" },
    read: { en: "Read", ar: "قراءة", fr: "Lire" },
    askAI: { en: "Ask AI", ar: "اسأل الذكاء", fr: "Demander à l'IA" },
    markComplete: { en: "Mark Complete", ar: "تحديد كمكتمل", fr: "Marquer comme terminé" },
    marking: { en: "Marking...", ar: "جاري التحديد...", fr: "Marquage..." },
    completed: { en: "Completed", ar: "مكتمل", fr: "Terminé" },
    noContent: { en: "No content available for this lesson yet.", ar: "لا يوجد محتوى متاح لهذا الدرس بعد.", fr: "Aucun contenu disponible pour cette leçon." },
    tutorName: { en: "BACMR Tutor", ar: "معلم BACMR", fr: "Tuteur BACMR" },
    tutorHelp: { en: "I can explain any concept from this lesson. Ask me anything!", ar: "يمكنني شرح أي مفهوم من هذا الدرس. اسألني!", fr: "Je peux expliquer tout concept de cette leçon. Posez-moi vos questions !" },
    tutorGreeting: {
      en: "Hello! I'm here to help you understand this lesson. Is there a part that feels confusing? Ask me anything!",
      ar: "مرحباً! أنا هنا لمساعدتك في فهم هذا الدرس. هل هناك جزء غير واضح؟ اسألني!",
      fr: "Bonjour ! Je suis là pour vous aider à comprendre cette leçon. Y a-t-il une partie confuse ? Posez-moi vos questions !",
    },
    askQuestion: { en: "Ask a question...", ar: "اطرح سؤالاً...", fr: "Posez une question..." },
    transcribing: { en: "Transcribing...", ar: "جاري النسخ...", fr: "Transcription..." },
    thinking: { en: "Thinking...", ar: "أفكر...", fr: "Réflexion..." },
    errorMessage: { en: "Sorry, I couldn't process that request. Please try again.", ar: "عذراً، لم أتمكن من معالجة طلبك. حاول مرة أخرى.", fr: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer." },
  },
  common: {
    loading: { en: "Loading...", ar: "جاري التحميل...", fr: "Chargement..." },
    student: { en: "Student", ar: "طالب", fr: "Étudiant" },
  },
} as const;

type TranslationKeys = typeof translations;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: <S extends keyof TranslationKeys, K extends keyof TranslationKeys[S]>(section: S, key: K) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bacmr-lang");
      if (saved === "en" || saved === "ar" || saved === "fr") return saved;
    }
    return "en";
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("bacmr-lang", newLang);
    fetch("/api/auth/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ language: newLang }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(<S extends keyof TranslationKeys, K extends keyof TranslationKeys[S]>(section: S, key: K): string => {
    const entry = translations[section]?.[key];
    if (!entry) return String(key);
    return (entry as any)[lang] || (entry as any)["en"] || String(key);
  }, [lang]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
