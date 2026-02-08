import { db } from "./db";
import { streams, subjects, chapters, lessons, examPapers, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedDatabase() {
  // Check if already seeded
  const existingStreams = await db.select().from(streams);
  if (existingStreams.length > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  console.log("Seeding database...");

  // ─── Streams ───
  const [streamC, streamD, streamA, streamO] = await db
    .insert(streams)
    .values([
      { name: "Sciences Mathématiques (Série C)", code: "C" },
      { name: "Sciences Naturelles (Série D)", code: "D" },
      { name: "Lettres Modernes (Série A)", code: "A" },
      { name: "Lettres Originales (Série O)", code: "O" },
    ])
    .returning();

  // ─── Subjects for Série C ───
  const [math, physics, french, arabic, philosophy, english] = await db
    .insert(subjects)
    .values([
      { name: "Mathématiques", icon: "Calculator", streamId: streamC.id, order: 1 },
      { name: "Physique-Chimie", icon: "Atom", streamId: streamC.id, order: 2 },
      { name: "Français", icon: "Languages", streamId: streamC.id, order: 3 },
      { name: "Arabe", icon: "BookOpen", streamId: streamC.id, order: 4 },
      { name: "Philosophie", icon: "Brain", streamId: streamC.id, order: 5 },
      { name: "Anglais", icon: "Globe", streamId: streamC.id, order: 6 },
    ])
    .returning();

  // ─── Subjects for Série D ───
  await db.insert(subjects).values([
    { name: "Mathématiques", icon: "Calculator", streamId: streamD.id, order: 1 },
    { name: "Sciences Naturelles", icon: "Dna", streamId: streamD.id, order: 2 },
    { name: "Physique-Chimie", icon: "Atom", streamId: streamD.id, order: 3 },
    { name: "Français", icon: "Languages", streamId: streamD.id, order: 4 },
    { name: "Arabe", icon: "BookOpen", streamId: streamD.id, order: 5 },
  ]);

  // ─── Math Chapters (Série C) ───
  const [chComplex, chAnalysis, chProbability, chGeometry] = await db
    .insert(chapters)
    .values([
      { title: "Nombres Complexes", subjectId: math.id, order: 1 },
      { title: "Analyse et Fonctions", subjectId: math.id, order: 2 },
      { title: "Probabilités", subjectId: math.id, order: 3 },
      { title: "Géométrie dans l'Espace", subjectId: math.id, order: 4 },
    ])
    .returning();

  // ─── Physics Chapters ───
  const [chMech, chElec, chOptics] = await db
    .insert(chapters)
    .values([
      { title: "Mécanique", subjectId: physics.id, order: 1 },
      { title: "Électricité", subjectId: physics.id, order: 2 },
      { title: "Optique", subjectId: physics.id, order: 3 },
    ])
    .returning();

  // ─── Math Lessons ───
  await db.insert(lessons).values([
    {
      title: "Forme Algébrique",
      content: `## Introduction\n\nUn nombre complexe z s'écrit sous forme algébrique:\n\n**z = a + bi**\n\noù a est la partie réelle et b la partie imaginaire.\n\n## Opérations de base\n\n### Addition\n(a + bi) + (c + di) = (a+c) + (b+d)i\n\n### Multiplication\n(a + bi)(c + di) = (ac - bd) + (ad + bc)i\n\n## Conjugué\nLe conjugué de z = a + bi est z̄ = a - bi.\n\nPropriétés:\n- z × z̄ = a² + b² = |z|²\n- z + z̄ = 2a (partie réelle doublée)\n- z - z̄ = 2bi (partie imaginaire doublée)`,
      durationMinutes: 15,
      chapterId: chComplex.id,
      order: 1,
      isPublic: true,
    },
    {
      title: "Forme Trigonométrique",
      content: `## De l'algébrique au trigonométrique\n\nTout nombre complexe non nul z = a + bi peut s'écrire:\n\n**z = r(cos θ + i sin θ)**\n\noù:\n- r = |z| = √(a² + b²) est le module\n- θ = arg(z) est l'argument\n\n## Calcul du module\n|z| = √(a² + b²)\n\n## Calcul de l'argument\ncos θ = a/r et sin θ = b/r\n\n## Multiplication en forme trigonométrique\nz₁ × z₂ = r₁r₂[cos(θ₁ + θ₂) + i sin(θ₁ + θ₂)]\n\nOn multiplie les modules et on additionne les arguments.`,
      durationMinutes: 20,
      chapterId: chComplex.id,
      order: 2,
      isPublic: true,
    },
    {
      title: "Notation Exponentielle",
      content: `## Formule d'Euler\n\nLe mathématicien suisse Leonhard Euler a introduit une notation puissante:\n\n**e^(iθ) = cos θ + i sin θ**\n\nC'est l'une des formules les plus remarquables des mathématiques.\n\n## Forme exponentielle\n\nTout nombre complexe non nul z peut s'écrire:\n\n**z = r × e^(iθ)**\n\n## Avantages\n\nCette notation simplifie considérablement:\n\n- **Multiplication:** z₁z₂ = r₁r₂ × e^(i(θ₁+θ₂))\n- **Division:** z₁/z₂ = (r₁/r₂) × e^(i(θ₁-θ₂))\n- **Puissance:** (re^(iθ))^n = r^n × e^(inθ) — Formule de Moivre\n\n## Exemple\nSoit z = 1 + i\n- |z| = √2\n- arg(z) = π/4\n- z = √2 × e^(iπ/4)`,
      durationMinutes: 10,
      chapterId: chComplex.id,
      order: 3,
      isPublic: true,
    },
    {
      title: "Résolution d'Équations",
      content: `## Équations du second degré dans ℂ\n\nToute équation az² + bz + c = 0 admet des solutions dans ℂ.\n\n### Discriminant\nΔ = b² - 4ac\n\n### Cas Δ > 0\nDeux solutions réelles: z = (-b ± √Δ) / 2a\n\n### Cas Δ = 0\nUne solution double: z = -b / 2a\n\n### Cas Δ < 0\nDeux solutions complexes conjuguées:\nz = (-b ± i√|Δ|) / 2a\n\n## Exemple\nRésoudre z² + 2z + 5 = 0\nΔ = 4 - 20 = -16 < 0\nz = (-2 ± i×4) / 2 = -1 ± 2i`,
      durationMinutes: 25,
      chapterId: chComplex.id,
      order: 4,
      isPublic: true,
    },
    {
      title: "Limites et Continuité",
      content: `## Définition de la limite\n\nOn dit que f admet une limite L en a si:\n\n∀ε > 0, ∃δ > 0, |x - a| < δ ⟹ |f(x) - L| < ε\n\n## Limites usuelles\n\n- lim(x→0) sin(x)/x = 1\n- lim(x→+∞) (1 + 1/x)^x = e\n- lim(x→0) (e^x - 1)/x = 1\n- lim(x→0) ln(1+x)/x = 1\n\n## Continuité\n\nf est continue en a si lim(x→a) f(x) = f(a)\n\n## Théorème des valeurs intermédiaires\n\nSi f est continue sur [a,b] et si f(a)×f(b) < 0,\nalors il existe c ∈ ]a,b[ tel que f(c) = 0.`,
      durationMinutes: 20,
      chapterId: chAnalysis.id,
      order: 1,
      isPublic: true,
    },
    {
      title: "Dérivation",
      content: `## Définition\n\nLa dérivée de f en a est:\n\nf'(a) = lim(h→0) [f(a+h) - f(a)] / h\n\n## Dérivées usuelles\n\n| Fonction | Dérivée |\n|----------|--------|\n| x^n | nx^(n-1) |\n| e^x | e^x |\n| ln(x) | 1/x |\n| sin(x) | cos(x) |\n| cos(x) | -sin(x) |\n\n## Règles de dérivation\n\n- (f+g)' = f' + g'\n- (fg)' = f'g + fg'\n- (f/g)' = (f'g - fg')/g²\n- (f∘g)' = (f'∘g) × g'\n\n## Application\n\nLa dérivée permet d'étudier:\n- Le sens de variation\n- Les extremums\n- La tangente à la courbe`,
      durationMinutes: 30,
      chapterId: chAnalysis.id,
      order: 2,
      isPublic: true,
    },
    {
      title: "Intégration",
      content: `## Primitive\n\nF est une primitive de f si F' = f.\n\n## Intégrale définie\n\n∫[a,b] f(x)dx = F(b) - F(a)\n\n## Primitives usuelles\n\n| Fonction | Primitive |\n|----------|----------|\n| x^n | x^(n+1)/(n+1) |\n| 1/x | ln|x| |\n| e^x | e^x |\n| cos(x) | sin(x) |\n| sin(x) | -cos(x) |\n\n## Intégration par parties\n\n∫ u dv = uv - ∫ v du\n\n## Applications\n\n- Calcul d'aires\n- Calcul de volumes\n- Valeur moyenne d'une fonction`,
      durationMinutes: 35,
      chapterId: chAnalysis.id,
      order: 3,
      isPublic: true,
    },
    {
      title: "Combinatoire",
      content: `## Arrangements\n\nA(n,p) = n! / (n-p)!\n\nNombre de façons de choisir p éléments parmi n avec ordre.\n\n## Combinaisons\n\nC(n,p) = n! / (p!(n-p)!)\n\nNombre de façons de choisir p éléments parmi n sans ordre.\n\n## Formule du binôme\n\n(a+b)^n = Σ C(n,k) × a^(n-k) × b^k\n\n## Triangle de Pascal\n\nC(n,p) = C(n-1,p-1) + C(n-1,p)`,
      durationMinutes: 15,
      chapterId: chProbability.id,
      order: 1,
      isPublic: true,
    },
    {
      title: "Probabilités Conditionnelles",
      content: `## Définition\n\nP(A|B) = P(A∩B) / P(B)\n\nProbabilité de A sachant B.\n\n## Formule de Bayes\n\nP(A|B) = P(B|A) × P(A) / P(B)\n\n## Indépendance\n\nA et B sont indépendants si:\nP(A∩B) = P(A) × P(B)\n\n## Formule des probabilités totales\n\nSi B₁, B₂, ..., Bₙ forment une partition de Ω:\nP(A) = Σ P(A|Bᵢ) × P(Bᵢ)\n\n## Application: Arbres de probabilités\n\nLes arbres permettent de visualiser et calculer les probabilités dans des expériences à plusieurs étapes.`,
      durationMinutes: 20,
      chapterId: chProbability.id,
      order: 2,
      isPublic: true,
    },
  ]);

  // ─── Physics Lessons ───
  await db.insert(lessons).values([
    {
      title: "Cinématique du point",
      content: `## Position et trajectoire\n\nLa position d'un point M est repérée par son vecteur position OM.\n\n## Vitesse\n\nv = dOM/dt\n\n## Accélération\n\na = dv/dt\n\n## Mouvements types\n\n- **Rectiligne uniforme:** v = constante, a = 0\n- **Rectiligne uniformément varié:** a = constante\n- **Circulaire uniforme:** v constante en norme, a centripète`,
      durationMinutes: 20,
      chapterId: chMech.id,
      order: 1,
      isPublic: true,
    },
    {
      title: "Lois de Newton",
      content: `## Première loi (Inertie)\n\nTout corps persévère dans son état de repos ou de mouvement rectiligne uniforme si les forces qui s'exercent sur lui se compensent.\n\n## Deuxième loi\n\nΣF = ma\n\nLa somme des forces est égale au produit de la masse par l'accélération.\n\n## Troisième loi (Action-Réaction)\n\nSi A exerce une force sur B, alors B exerce sur A une force de même intensité, de même direction, mais de sens opposé.`,
      durationMinutes: 25,
      chapterId: chMech.id,
      order: 2,
      isPublic: true,
    },
  ]);

  // ─── Exam Papers ───
  await db.insert(examPapers).values([
    {
      subjectId: math.id,
      year: 2025,
      session: "Normale",
      streamId: streamC.id,
      content: "Exercice 1: Nombres Complexes (6 pts)\n\n1. Écrire sous forme algébrique z = (2+3i)(1-i)\n2. Déterminer le module et l'argument de z\n3. Écrire z sous forme exponentielle\n\nExercice 2: Analyse (7 pts)\n\nSoit f(x) = x³ - 3x + 2\n1. Calculer f'(x)\n2. Étudier les variations de f\n3. Tracer la courbe\n\nExercice 3: Probabilités (7 pts)\n\nUne urne contient 3 boules rouges et 5 boules blanches...",
      solution: "Solutions disponibles après soumission.",
      isPublic: true,
    },
    {
      subjectId: math.id,
      year: 2025,
      session: "Complémentaire",
      streamId: streamC.id,
      content: "Exercice 1: Suites numériques (6 pts)\n\n...\n\nExercice 2: Fonctions (7 pts)\n\n...\n\nExercice 3: Géométrie (7 pts)\n\n...",
      isPublic: true,
    },
    {
      subjectId: math.id,
      year: 2024,
      session: "Normale",
      streamId: streamC.id,
      content: "Exercice 1: Nombres Complexes (6 pts)\n\n...\n\nExercice 2: Intégration (7 pts)\n\n...\n\nExercice 3: Probabilités (7 pts)\n\n...",
      isPublic: true,
    },
    {
      subjectId: math.id,
      year: 2024,
      session: "Complémentaire",
      streamId: streamC.id,
      content: "Exercice 1: Dérivation (6 pts)\n\n...\n\nExercice 2: Suites (7 pts)\n\n...\n\nExercice 3: Combinatoire (7 pts)\n\n...",
      isPublic: true,
    },
    {
      subjectId: math.id,
      year: 2023,
      session: "Normale",
      streamId: streamC.id,
      content: "Exercice 1: Complexes (6 pts)\n\n...\n\nExercice 2: Fonctions (7 pts)\n\n...\n\nExercice 3: Probabilités (7 pts)\n\n...",
      isPublic: true,
    },
  ]);

  // ─── Demo Admin User ───
  const adminPass = await hashPassword("admin123");
  await db.insert(users).values({
    email: "admin@bacmr.mr",
    password: adminPass,
    fullName: "BACMR Admin",
    role: "admin",
    streamId: streamC.id,
    sessionYear: 2026,
    language: "fr",
  });

  console.log("Database seeded successfully!");
  console.log("Admin account: admin@bacmr.mr / admin123");
}
