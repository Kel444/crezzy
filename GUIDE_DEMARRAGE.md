# 🚀 Crezzy — Guide de démarrage (même pour les nuls en code)

## Ce dont tu as besoin

- **Node.js** installé sur ton PC → https://nodejs.org (version 18 ou plus)
- Un compte **Supabase** gratuit → https://supabase.com
- Un compte **Vercel** gratuit (pour mettre en ligne) → https://vercel.com

---

## Étape 1 — Créer ta base de données Supabase

1. Va sur https://supabase.com → **New Project**
2. Donne un nom à ton projet (ex: "crezzy") et choisis une région Europe
3. Une fois le projet créé, clique sur **SQL Editor** dans le menu gauche
4. Clique sur **New query**
5. Copie-colle tout le contenu du fichier `supabase/schema.sql`
6. Clique **Run** → tu verras "Success"

---

## Étape 2 — Récupérer les clés API Supabase

1. Dans ton projet Supabase → **Settings** (engrenage) → **API**
2. Copie :
   - **Project URL** (ex: `https://abcdefgh.supabase.co`)
   - **anon public** (une longue clé qui commence par `eyJ...`)

---

## Étape 3 — Configurer le projet

1. Ouvre le fichier `.env.local` dans le dossier crezzy
2. Remplace les valeurs :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
   ```

---

## Étape 4 — Lancer en local (sur ton PC)

Ouvre un terminal dans le dossier `crezzy` et tape :

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:3000 dans ton navigateur. 🎉

---

## Étape 5 — Mettre en ligne sur Vercel (optionnel)

1. Va sur https://vercel.com → **New Project**
2. Importe ton dossier (ou connecte GitHub)
3. Dans **Environment Variables**, ajoute les deux variables du `.env.local`
4. Clique **Deploy** → ton appli est en ligne en 2 minutes !

---

## En cas de problème

- L'appli affiche une erreur blanche → vérifie que tes clés Supabase sont correctes
- Tu ne peux pas t'inscrire → va dans Supabase → Authentication → Settings et désactive "Email confirmation" pour les tests
- Les tables n'existent pas → retourne dans l'éditeur SQL Supabase et relance le schema.sql

---

*Crezzy est une appli Next.js 14 + Supabase. Toutes les données sont privées par utilisateur grâce au Row Level Security.*
