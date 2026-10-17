<p align="center"><img src="public/logo.jpg" alt="JecUp by Jeca Solutions" width="260" /></p>

# JecUp — copilote collège & lycée

> **Apprends, révise, réussis !** — by Jeca Solutions
>
> 🌐 Démo en ligne : https://camillejoassin06-crypto.github.io/jecup/

JecUp transforme les cours d'un élève (de la 6e à la Terminale, voies générale, technologique et professionnelle) en un système de révision adaptatif. L'élève importe un cours, et JecUp enchaîne les étapes suivantes :

```
importer → analyser → identifier la matière → détecter les notions → créer des révisions adaptées
→ tester → analyser les erreurs → mesurer la maîtrise → adapter le planning → retester au bon moment
```

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests du moteur pédagogique
npm run build
```

Sans configuration, l'application fonctionne **en local** : les données restent dans le navigateur et le moteur pédagogique intégré tourne hors ligne.

**Démo** : sur l'écran d'accueil, clique sur « Essayer la démo », ou ouvre directement `/bienvenue?demo=lea` (profils `lea`, `emma`, `lucas`, `ines`, `thomas`).

| Profil | Classe | Cours de démo |
|---|---|---|
| 🦊 Léa | 3e, brevet | Première Guerre mondiale, Pythagore |
| 🐧 Emma | Seconde | Marché concurrentiel (SES), vocabulaire d'anglais |
| 🦉 Lucas | 1re, spés SVT, Maths, PC | Réplication de l'ADN et mitose, dérivation |
| 🐱 Inès | Terminale, spés HGGSP et SES | La conscience (philosophie), la guerre froide |
| 🐼 Thomas | 1re, spés NSI, Maths, SES | Algorithmes de tri, binaire |

## Ce que contient la V1

- **Onboarding collège/lycée** : classe, voie, série techno, spécialités (3 en 1re, 2 en Tle), matières pré-remplies selon le niveau, formats d'évaluation (brevet, bac, oral…), objectifs, disponibilités.
- **Profils pédagogiques par matière** : français, maths, histoire-géo, EMC, SVT, physique-chimie, langues, SES, philosophie, NSI/SNT, technologie, HGGSP, HLP, EPS, arts, plus un profil générique. Chaque profil a ses propres dossiers, types de notions et formats de révision.
- **JecUp Scan** : photos (scan continu), PDF texte ou scanné (OCR automatique), texte collé. Détection des pages floues et des doublons, ordre probable des pages, puis correction du texte et bouton « Valider mon cours ».
- **Analyse du cours** : résumé, structure, type de document, complexité, matière probable avec un score de confiance, et notions classées *mémoriser / comprendre / appliquer / analyser*.
- **Revision Studio** : format recommandé selon le contenu (dates → frise, formules → exercices progressifs, vocabulaire → flashcards…), ou « Laisser JecUp choisir ».
- **Tests adaptatifs** : 5 niveaux. La difficulté monte après 2 réussites et revient aux bases après 2 erreurs. Une notion ratée revient plus tard avec une autre formulation. Chaque correction affiche l'explication, la notion testée et la source dans le cours, avec les boutons « Je n'ai pas compris », « Explique plus simplement », « Donne-moi un exemple » et « Montre-moi la méthode ».
- **Ma mémoire** : un Mastery Score de 0 à 100 qui combine la réussite récente, la réussite différée, les questions difficiles réussies, les erreurs répétées, le temps de réponse et le volume de révision. La répétition est espacée et adaptative. Une seule bonne réponse ne suffit jamais à « maîtriser » une notion.
- **Planning** : les sessions sont placées selon les contrôles, l'importance des matières, les notions fragiles, les devoirs et les disponibilités. Une session manquée est replanifiée sans culpabiliser l'élève.
- **Tâches** : saisie naturelle (« Finir mon exposé de SVT jeudi »), aperçu avant validation, détection des contrôles pour les ajouter au planning, et « Organiser mes tâches ».
- **Assistant** : quatre modes. *Mes cours* répond uniquement à partir des documents de l'élève, avec les sources ; une explication générale éventuelle est affichée séparément. *Comprendre*, *Réviser* et *Coach* complètent l'ensemble.
- **Mon espace** : une seule « priorité du jour », les évaluations, le taux de réussite, les notions à revoir, le temps de révision, le planning et la progression par matière.

## Architecture

```
src/
  engine/            agents pédagogiques séparés (TypeScript pur, testés)
    documentAgent    structure, découpage, résumé, type, complexité
    classifier       Academic Classifier (matière)
    conceptAgent     extraction des notions + taxonomie de Bloom
    revisionAgent    choix du format de révision
    quizAgent        génération de questions + session adaptative
    memoryAgent      Mastery Score + répétition espacée
    plannerAgent     planning + réorganisation
    taskParser       saisie naturelle des tâches
    tutorAgent       recherche BM25 (RAG local) + réponses sourcées
    coach            priorité du jour
  services/
    ai/provider.ts   abstraction fournisseur IA (heuristique local | Claude)
    ocr.ts           abstraction OCR (Tesseract.js par défaut, remplaçable)
    supabase.ts
  store/             état (Zustand, persistant)
  pages/             écrans (React, Tailwind, composants façon shadcn/ui)
supabase/
  migrations/0001_init.sql     schéma, RLS sur toutes les tables, pgvector, stockage privé
  functions/jecup-ai/          Edge Function Claude (un prompt par agent)
```

Chaque contenu généré (notion, question) garde le lien vers son document et son extrait source.

### Activer Supabase et Claude

1. Crée un projet Supabase, puis exécute `supabase/migrations/0001_init.sql`.
2. Copie `.env.example` en `.env` et renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. La connexion par lien magique (Supabase Auth) s'active alors automatiquement.
3. Pour Claude : `supabase secrets set ANTHROPIC_API_KEY=...`, puis `supabase functions deploy jecup-ai`, puis `VITE_AI_PROVIDER=claude`. L'Edge Function utilise `claude-opus-5-5` avec le repli serveur automatique (`fallbacks: "default"`) en cas de refus. Si la fonction échoue, l'application revient au moteur local.

> ⚠️ En V1, les données de l'élève restent dans le navigateur, même quand Supabase Auth est activé. Le schéma et la RLS sont prêts, mais la synchronisation des tables n'est pas encore branchée (prochaine étape).

## Feuille de route

- **V2** : synchronisation Supabase, embeddings et recherche sémantique (`match_chunks`), fiches intelligentes, mode examen (brevet blanc, bac blanc, Grand oral), notes avec commandes `/résumer`, `/qcm`…, méthodologie adaptée (commentaire, dissertation, croquis, résolution de problème).
- **V3** : orientation (Parcoursup, stages de 3e), révisions orales et audio, fonctions collaboratives.
