import type {
  BloomLevel, ConceptKind, Cycle, DisciplineId, EvalFormat, Goal, LevelId, QuestionType, Voie,
} from "@/types";

export const LEVELS: { id: LevelId; label: string; cycle: Cycle; exam?: string }[] = [
  { id: "6e", label: "6e", cycle: "college" },
  { id: "5e", label: "5e", cycle: "college" },
  { id: "4e", label: "4e", cycle: "college" },
  { id: "3e", label: "3e", cycle: "college", exam: "Brevet (DNB)" },
  { id: "2nde", label: "Seconde", cycle: "lycee" },
  { id: "1re", label: "Première", cycle: "lycee", exam: "Bac de français (EAF)" },
  { id: "tle", label: "Terminale", cycle: "lycee", exam: "Baccalauréat" },
  { id: "cap", label: "CAP", cycle: "lycee", exam: "CAP" },
  { id: "2nde-pro", label: "Seconde pro", cycle: "lycee" },
  { id: "1re-pro", label: "Première pro", cycle: "lycee" },
  { id: "tle-pro", label: "Terminale pro", cycle: "lycee", exam: "Bac pro" },
];

export const levelInfo = (id: LevelId) => LEVELS.find((l) => l.id === id)!;
export const isLycee = (id: LevelId) => levelInfo(id).cycle === "lycee";
export const needsVoie = (id: LevelId) => id === "1re" || id === "tle";
export const isPro = (id: LevelId) => ["cap", "2nde-pro", "1re-pro", "tle-pro"].includes(id);

export const VOIES: { id: Voie; label: string }[] = [
  { id: "generale", label: "Voie générale" },
  { id: "technologique", label: "Voie technologique" },
  { id: "professionnelle", label: "Voie professionnelle" },
];

export const SERIES_TECHNO = ["STMG", "STI2D", "ST2S", "STL", "STD2A", "STHR", "S2TMD", "STAV"];

export const SPECIALITES: { name: string; discipline: DisciplineId }[] = [
  { name: "Mathématiques", discipline: "maths" },
  { name: "Physique-Chimie", discipline: "physique-chimie" },
  { name: "SVT", discipline: "svt" },
  { name: "SES", discipline: "ses" },
  { name: "HGGSP", discipline: "hggsp" },
  { name: "HLP", discipline: "hlp" },
  { name: "LLCER Anglais", discipline: "langues" },
  { name: "LLCER Espagnol", discipline: "langues" },
  { name: "NSI", discipline: "informatique" },
  { name: "Sciences de l'ingénieur", discipline: "technologie" },
  { name: "Arts", discipline: "arts" },
  { name: "Biologie-Écologie", discipline: "svt" },
  { name: "Éducation physique, pratiques et culture sportives", discipline: "eps" },
];

/** Matières du tronc commun proposées automatiquement selon le niveau. */
export function defaultSubjects(level: LevelId, voie?: Voie): { name: string; discipline: DisciplineId }[] {
  const college: { name: string; discipline: DisciplineId }[] = [
    { name: "Français", discipline: "francais" },
    { name: "Mathématiques", discipline: "maths" },
    { name: "Histoire-Géographie", discipline: "histoire-geo" },
    { name: "EMC", discipline: "emc" },
    { name: "SVT", discipline: "svt" },
    { name: "Physique-Chimie", discipline: "physique-chimie" },
    { name: "Technologie", discipline: "technologie" },
    { name: "Anglais", discipline: "langues" },
  ];
  if (level === "6e")
    return [
      ...college.filter((s) => !["SVT", "Physique-Chimie", "Technologie"].includes(s.name)),
      { name: "Sciences et technologie", discipline: "svt" },
    ];
  if (["5e", "4e", "3e"].includes(level)) return [...college, { name: "LV2", discipline: "langues" }];
  if (level === "2nde")
    return [
      { name: "Français", discipline: "francais" },
      { name: "Mathématiques", discipline: "maths" },
      { name: "Histoire-Géographie", discipline: "histoire-geo" },
      { name: "SVT", discipline: "svt" },
      { name: "Physique-Chimie", discipline: "physique-chimie" },
      { name: "SES", discipline: "ses" },
      { name: "SNT", discipline: "informatique" },
      { name: "Anglais", discipline: "langues" },
      { name: "LV2", discipline: "langues" },
    ];
  if (isPro(level))
    return [
      { name: "Français", discipline: "francais" },
      { name: "Mathématiques", discipline: "maths" },
      { name: "Histoire-Géographie-EMC", discipline: "histoire-geo" },
      { name: "Anglais", discipline: "langues" },
      { name: "Enseignement professionnel", discipline: "generique" },
    ];
  const common: { name: string; discipline: DisciplineId }[] = [
    { name: "Histoire-Géographie", discipline: "histoire-geo" },
    { name: "Anglais", discipline: "langues" },
    { name: "LV2", discipline: "langues" },
  ];
  if (level === "1re") common.unshift({ name: "Français", discipline: "francais" });
  if (level === "tle") common.unshift({ name: "Philosophie", discipline: "philosophie" });
  if (voie === "generale") common.push({ name: "Enseignement scientifique", discipline: "svt" });
  if (voie === "technologique") common.push({ name: "Mathématiques", discipline: "maths" });
  return common;
}

export const EVAL_FORMATS: { id: EvalFormat; label: string }[] = [
  { id: "qcm", label: "QCM" },
  { id: "questions-cours", label: "Questions de cours" },
  { id: "exercices", label: "Exercices" },
  { id: "problemes", label: "Problèmes" },
  { id: "redaction", label: "Rédaction / expression écrite" },
  { id: "dissertation", label: "Dissertation" },
  { id: "commentaire", label: "Commentaire de texte" },
  { id: "analyse-documents", label: "Analyse de documents" },
  { id: "croquis", label: "Croquis / schéma" },
  { id: "tp", label: "TP / expériences" },
  { id: "oral", label: "Oral / exposé / Grand oral" },
  { id: "mixte", label: "Un mélange de tout ça" },
];

export const GOALS: { id: Goal; label: string; emoji: string }[] = [
  { id: "brevet", label: "Réussir mon brevet", emoji: "🎓" },
  { id: "bac", label: "Réussir mon bac", emoji: "🏆" },
  { id: "moyenne", label: "Améliorer ma moyenne", emoji: "📈" },
  { id: "comprendre", label: "Mieux comprendre mes cours", emoji: "💡" },
  { id: "organiser", label: "Mieux m'organiser", emoji: "🗓️" },
  { id: "retard", label: "Rattraper mon retard", emoji: "🏃" },
  { id: "memoriser", label: "Mémoriser plus efficacement", emoji: "🧠" },
  { id: "orientation", label: "Préparer mon orientation (Parcoursup)", emoji: "🧭" },
];

export interface DisciplineProfile {
  id: DisciplineId;
  label: string;
  color: string;
  emoji: string;
  /** mots-clés pondérés pour le classifieur */
  keywords: string[];
  /** ce que JEC'UP cherche dans un cours de cette matière */
  detects: string[];
  /** formats de révision privilégiés */
  formats: string[];
  questionTypes: QuestionType[];
  folders: string[];
  /** Bloom par défaut d'une notion selon son type, spécifique à la matière */
  bloomOverrides?: Partial<Record<ConceptKind, BloomLevel[]>>;
  methodHint?: string;
}

const P = (p: DisciplineProfile) => p;

export const DISCIPLINES: Record<DisciplineId, DisciplineProfile> = {
  francais: P({
    id: "francais", label: "Français", color: "#e8590c", emoji: "📚",
    keywords: ["roman", "poème", "poésie", "auteur", "œuvre", "oeuvre", "narrateur", "figure de style", "métaphore", "comparaison", "personnage", "théâtre", "tirade", "alexandrin", "vers", "strophe", "registre", "argumentation", "conjugaison", "subjonctif", "grammaire", "complément", "proposition", "romantisme", "réalisme", "humanisme", "classicisme", "lyrique", "molière", "hugo", "rimbaud", "baudelaire", "zola", "maupassant", "récit", "commentaire", "dissertation", "lecture linéaire"],
    detects: ["Auteurs et œuvres", "Mouvements littéraires", "Figures de style", "Citations du cours", "Grammaire et conjugaison", "Notions d'analyse"],
    formats: ["Associations auteur/œuvre", "QCM figures de style", "Citations à compléter", "Questions de compréhension"],
    questionTypes: ["qcm", "association", "trous", "vrai-faux"],
    folders: ["Œuvres", "Figures de style", "Grammaire", "Lectures linéaires"],
    bloomOverrides: { citation: ["memoriser", "analyser"], oeuvre: ["memoriser", "comprendre"] },
    methodHint: "Pour un commentaire : identifie le procédé, cite le texte, puis interprète l'effet produit.",
  }),
  maths: P({
    id: "maths", label: "Mathématiques", color: "#1c7ed6", emoji: "📐",
    keywords: ["théorème", "propriété", "démonstration", "équation", "fonction", "dérivée", "intégrale", "suite", "vecteur", "probabilité", "calcul", "fraction", "pythagore", "thalès", "triangle", "cercle", "aire", "périmètre", "volume", "factoriser", "développer", "inéquation", "statistique", "médiane", "moyenne", "repère", "coordonnées", "trigonométrie", "cosinus", "sinus", "limite", "exponentielle", "logarithme", "polynôme", "discriminant", "nombre", "pourcentage", "proportionnalité", "racine carrée"],
    detects: ["Définitions", "Théorèmes et propriétés", "Formules", "Méthodes de résolution", "Types d'exercices"],
    formats: ["Exercices progressifs", "Questions de méthode", "Formules à compléter", "Détection d'erreurs"],
    questionTypes: ["qcm", "trous", "vrai-faux"],
    folders: ["Leçons", "Exercices", "Formules", "Méthodes"],
    bloomOverrides: { formule: ["comprendre", "appliquer"], theoreme: ["comprendre", "appliquer"], methode: ["appliquer"] },
    methodHint: "Écris les données, identifie la propriété à utiliser, applique-la étape par étape, puis vérifie la cohérence du résultat.",
  }),
  "histoire-geo": P({
    id: "histoire-geo", label: "Histoire-Géographie", color: "#a61e4d", emoji: "🗺️",
    keywords: ["guerre", "révolution", "empire", "roi", "siècle", "traité", "république", "colonisation", "mondialisation", "territoire", "métropole", "population", "démographie", "frontière", "carte", "croquis", "chronologie", "période", "moyen âge", "antiquité", "renaissance", "napoléon", "louis", "1789", "1914", "1918", "1939", "1945", "guerre froide", "décolonisation", "urbanisation", "développement durable", "europe", "union européenne", "puissance", "conflit", "régime", "totalitarisme"],
    detects: ["Dates et périodes", "Événements", "Personnages", "Causes et conséquences", "Territoires et repères", "Notions géographiques"],
    formats: ["Frise chronologique", "Questions de dates", "Causes / conséquences", "Associations personnage/événement"],
    questionTypes: ["date", "qcm", "association", "vrai-faux"],
    folders: ["Histoire", "Géographie", "Repères & dates", "Croquis"],
    methodHint: "Pour une analyse de document : présente-le (nature, auteur, date, contexte), puis extrais les informations et confronte-les à tes connaissances.",
  }),
  emc: P({
    id: "emc", label: "EMC", color: "#5f3dc4", emoji: "⚖️",
    keywords: ["citoyen", "citoyenneté", "laïcité", "démocratie", "droit", "devoir", "liberté", "égalité", "fraternité", "constitution", "vote", "élection", "justice", "discrimination", "valeurs", "république", "déclaration des droits", "engagement"],
    detects: ["Valeurs et principes", "Institutions", "Droits et devoirs", "Textes fondateurs"],
    formats: ["QCM", "Associations principe/exemple", "Vrai ou faux", "Mini-situations"],
    questionTypes: ["qcm", "vrai-faux", "association"],
    folders: ["Valeurs", "Institutions", "Débats"],
  }),
  svt: P({
    id: "svt", label: "SVT", color: "#2f9e44", emoji: "🧬",
    keywords: ["cellule", "adn", "gène", "chromosome", "mitose", "méiose", "organe", "écosystème", "biodiversité", "évolution", "photosynthèse", "respiration", "enzyme", "protéine", "immunité", "anticorps", "neurone", "hormone", "génétique", "allèle", "glucose", "sang", "digestion", "plaque", "séisme", "volcan", "roche", "fossile", "climat", "microorganisme", "bactérie", "virus", "reproduction"],
    detects: ["Structures", "Fonctions", "Mécanismes", "Cycles et étapes", "Schémas", "Vocabulaire scientifique"],
    formats: ["Étapes à remettre dans l'ordre", "Associations structure/fonction", "QCM", "Schémas à légender"],
    questionTypes: ["qcm", "association", "vrai-faux", "trous"],
    folders: ["Chapitres", "Schémas", "TP", "Vocabulaire"],
    bloomOverrides: { processus: ["comprendre", "analyser"] },
  }),
  "physique-chimie": P({
    id: "physique-chimie", label: "Physique-Chimie", color: "#0b7285", emoji: "⚗️",
    keywords: ["énergie", "force", "vitesse", "masse", "atome", "molécule", "ion", "réaction", "équation chimique", "tension", "intensité", "résistance", "loi d'ohm", "circuit", "lumière", "onde", "fréquence", "newton", "joule", "watt", "volt", "ampère", "mole", "concentration", "acide", "base", "ph", "électron", "gravitation", "mouvement", "pression", "température", "conversion", "unité"],
    detects: ["Lois", "Formules", "Unités et conversions", "Constantes", "Réactions", "Protocoles"],
    formats: ["Calculs guidés", "Questions sur les unités", "Associations formule/application", "Analyse d'erreurs"],
    questionTypes: ["qcm", "trous", "vrai-faux"],
    folders: ["Physique", "Chimie", "Formules", "TP"],
    bloomOverrides: { formule: ["comprendre", "appliquer"], regle: ["comprendre", "appliquer"] },
    methodHint: "Note les grandeurs et leurs unités, convertis si besoin, choisis la formule, calcule puis vérifie l'ordre de grandeur.",
  }),
  langues: P({
    id: "langues", label: "Langues vivantes", color: "#d6336c", emoji: "🌍",
    keywords: ["vocabulary", "grammar", "present perfect", "preterit", "past simple", "irregular verbs", "verbe irrégulier", "vocabulaire", "traduction", "conjugaison", "pretérito", "subjuntivo", "ser", "estar", "the", "have", "been", "español", "english", "deutsch", "expression", "phrasal verb", "modal", "comparatif", "superlatif"],
    detects: ["Vocabulaire", "Grammaire", "Conjugaison", "Expressions", "Structures de phrases"],
    formats: ["Flashcards", "Textes à trous", "Associations mot/traduction", "Questions grammaticales"],
    questionTypes: ["trous", "association", "qcm"],
    folders: ["Vocabulaire", "Grammaire", "Expressions", "Compréhension"],
    bloomOverrides: { vocabulaire: ["memoriser"], regle: ["comprendre", "appliquer"] },
  }),
  ses: P({
    id: "ses", label: "SES", color: "#f08c00", emoji: "📊",
    keywords: ["marché", "offre", "demande", "prix", "pib", "croissance", "chômage", "inflation", "entreprise", "ménage", "consommation", "épargne", "socialisation", "stratification", "classe sociale", "mobilité", "état", "politique économique", "monnaie", "banque", "taux", "élasticité", "productivité", "sociologie", "durkheim", "bourdieu", "weber", "keynes", "smith"],
    detects: ["Concepts", "Mécanismes", "Indicateurs et calculs", "Auteurs", "Documents statistiques"],
    formats: ["QCM", "Associations concept/définition", "Calculs (taux, indices)", "Lecture de données"],
    questionTypes: ["qcm", "association", "vrai-faux", "trous"],
    folders: ["Économie", "Sociologie", "Science politique", "Calculs"],
  }),
  philosophie: P({
    id: "philosophie", label: "Philosophie", color: "#7048e8", emoji: "🦉",
    keywords: ["conscience", "inconscient", "liberté", "vérité", "raison", "devoir", "bonheur", "justice", "état", "art", "travail", "technique", "nature", "religion", "temps", "langage", "descartes", "kant", "platon", "aristote", "rousseau", "spinoza", "nietzsche", "sartre", "hegel", "freud", "thèse", "argument", "problématique", "notion"],
    detects: ["Notions du programme", "Auteurs", "Thèses et arguments", "Distinctions conceptuelles", "Citations du cours"],
    formats: ["Associations auteur/thèse", "Comparaisons de thèses", "Questions de compréhension", "Plans de réflexion"],
    questionTypes: ["association", "qcm", "vrai-faux"],
    folders: ["Notions", "Auteurs", "Repères", "Dissertations"],
    bloomOverrides: { concept: ["comprendre", "analyser"], personne: ["memoriser", "comprendre"] },
    methodHint: "Une dissertation part d'un problème : définis les termes, formule la tension, puis construis un raisonnement progressif.",
  }),
  informatique: P({
    id: "informatique", label: "NSI / SNT", color: "#364fc7", emoji: "💻",
    keywords: ["algorithme", "python", "variable", "boucle", "fonction", "liste", "tableau", "dictionnaire", "récursivité", "tri", "complexité", "binaire", "octet", "réseau", "protocole", "internet", "web", "html", "base de données", "sql", "graphe", "arbre", "pile", "file", "processeur", "def ", "for ", "while", "if ", "return"],
    detects: ["Concepts", "Algorithmes", "Structures de données", "Syntaxe", "Protocoles"],
    formats: ["QCM", "Code à compléter", "Analyse de code", "Questions sur les algorithmes"],
    questionTypes: ["qcm", "trous", "vrai-faux"],
    folders: ["Cours", "Algorithmes", "Projets", "Code"],
    bloomOverrides: { methode: ["comprendre", "appliquer"], processus: ["comprendre", "appliquer"] },
  }),
  technologie: P({
    id: "technologie", label: "Technologie / SI", color: "#495057", emoji: "⚙️",
    keywords: ["objet technique", "fonction d'usage", "énergie", "matériau", "capteur", "actionneur", "programmation", "scratch", "chaîne d'énergie", "chaîne d'information", "cahier des charges", "prototype", "modélisation", "système"],
    detects: ["Fonctions techniques", "Chaînes d'énergie/information", "Matériaux", "Vocabulaire technique"],
    formats: ["QCM", "Associations composant/fonction", "Vrai ou faux"],
    questionTypes: ["qcm", "association", "vrai-faux"],
    folders: ["Cours", "Projets", "Schémas"],
  }),
  hggsp: P({
    id: "hggsp", label: "HGGSP", color: "#c2255c", emoji: "🌐",
    keywords: ["géopolitique", "puissance", "souveraineté", "frontière", "démocratie", "océan", "patrimoine", "environnement", "connaissance", "guerre", "paix", "onu", "nation", "état", "mémoire", "cyberespace"],
    detects: ["Notions clés", "Dates et acteurs", "Études de cas", "Auteurs cités"],
    formats: ["Frise", "QCM", "Associations notion/exemple", "Questions de synthèse"],
    questionTypes: ["qcm", "date", "association", "vrai-faux"],
    folders: ["Thèmes", "Études de cas", "Repères"],
  }),
  hlp: P({
    id: "hlp", label: "HLP", color: "#9c36b5", emoji: "🎭",
    keywords: ["humanité", "littérature", "philosophie", "pouvoirs de la parole", "représentations du monde", "rhétorique", "montaigne", "humanisme", "éloquence"],
    detects: ["Auteurs et œuvres", "Notions", "Citations du cours"],
    formats: ["Associations auteur/œuvre", "Questions de compréhension", "Comparaisons"],
    questionTypes: ["association", "qcm", "vrai-faux"],
    folders: ["Œuvres", "Notions", "Essais"],
  }),
  eps: P({
    id: "eps", label: "EPS", color: "#37b24d", emoji: "🏃",
    keywords: ["échauffement", "endurance", "vma", "fréquence cardiaque", "muscle", "articulation", "règlement", "sport", "entraînement", "récupération"],
    detects: ["Physiologie de l'effort", "Règles", "Méthodes d'entraînement"],
    formats: ["QCM", "Associations", "Vrai ou faux"],
    questionTypes: ["qcm", "vrai-faux", "association"],
    folders: ["Théorie", "Activités"],
  }),
  arts: P({
    id: "arts", label: "Arts", color: "#f76707", emoji: "🎨",
    keywords: ["œuvre", "peinture", "sculpture", "musique", "compositeur", "tableau", "artiste", "mouvement artistique", "impressionnisme", "cubisme", "baroque", "rythme", "mélodie", "perspective", "couleur"],
    detects: ["Artistes et œuvres", "Mouvements", "Vocabulaire plastique/musical"],
    formats: ["Associations artiste/œuvre", "QCM", "Frise des mouvements"],
    questionTypes: ["association", "qcm", "date"],
    folders: ["Œuvres", "Vocabulaire", "Histoire des arts"],
  }),
  generique: P({
    id: "generique", label: "Autre matière", color: "#868e96", emoji: "📘",
    keywords: [],
    detects: ["Définitions", "Concepts", "Dates", "Personnes", "Formules", "Étapes", "Exemples"],
    formats: ["QCM", "Vrai ou faux", "Textes à trous", "Associations"],
    questionTypes: ["qcm", "vrai-faux", "trous", "association"],
    folders: ["Cours", "Exercices", "Fiches"],
  }),
};

export const BASE_FOLDERS = ["Cours", "Exercices", "Fiches", "Contrôles"];

/** Bloom par défaut selon la nature de la notion. */
export const DEFAULT_BLOOM: Record<ConceptKind, BloomLevel[]> = {
  definition: ["memoriser", "comprendre"],
  date: ["memoriser"],
  formule: ["comprendre", "appliquer"],
  personne: ["memoriser"],
  oeuvre: ["memoriser"],
  propriete: ["comprendre", "appliquer"],
  theoreme: ["comprendre", "appliquer"],
  methode: ["appliquer"],
  evenement: ["memoriser", "comprendre"],
  vocabulaire: ["memoriser"],
  regle: ["comprendre", "appliquer"],
  processus: ["comprendre"],
  citation: ["memoriser", "analyser"],
  concept: ["comprendre"],
};

export const BLOOM_LABEL: Record<BloomLevel, string> = {
  memoriser: "Mémoriser",
  comprendre: "Comprendre",
  appliquer: "Appliquer",
  analyser: "Analyser",
};

export const DOC_TYPE_LABEL: Record<string, string> = {
  cours: "Cours / leçon",
  exercices: "Fiche d'exercices",
  fiche: "Fiche de révision",
  diaporama: "Diaporama",
  controle: "Contrôle / DS",
  notes: "Notes personnelles",
  manuel: "Extrait de manuel",
  "td-tp": "TP / activité",
};
