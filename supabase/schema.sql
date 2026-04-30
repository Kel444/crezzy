-- ============================================================
-- CREZZY — Schéma Supabase complet
-- À coller dans l'éditeur SQL de ton projet Supabase
-- ============================================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE : profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text,
  nom text,
  prenom text,
  statut_juridique text default 'auto-entrepreneur',
  regime_fiscal text default 'micro-entreprise',
  siret text,
  adresse text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLE : chaines
-- ============================================================
create table if not exists public.chaines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nom text not null,
  url text,
  devise text default 'EUR',
  description text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE : revenus
-- ============================================================
create table if not exists public.revenus (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  chaine_id uuid references public.chaines(id) on delete cascade not null,
  source text not null, -- adsense, membership, super-chat, sponsoring, merch, autre
  montant numeric(12,2) not null,
  devise text default 'EUR',
  montant_eur numeric(12,2) not null,
  mois integer not null check (mois >= 1 and mois <= 12),
  annee integer not null,
  description text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE : depenses
-- ============================================================
create table if not exists public.depenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  categorie text not null, -- materiel, logiciels, sous-traitants, deplacements, formation, communication, bureau, autre
  description text not null,
  montant numeric(12,2) not null,
  date_depense date not null,
  deductible boolean default true,
  justificatif_url text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE : factures
-- ============================================================
create table if not exists public.factures (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  numero text not null,
  nom_client text not null,
  email_client text,
  adresse_client text,
  objet text not null,
  montant_ht numeric(12,2) not null,
  tva_pct numeric(5,2) default 0,
  montant_ttc numeric(12,2) not null,
  statut text default 'brouillon', -- brouillon, envoyee, payee, en-retard
  date_emission date not null,
  date_echeance date not null,
  date_paiement date,
  conditions_paiement text default '30 jours',
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — chaque utilisateur voit uniquement ses données
-- ============================================================

alter table public.profiles enable row level security;
alter table public.chaines enable row level security;
alter table public.revenus enable row level security;
alter table public.depenses enable row level security;
alter table public.factures enable row level security;

-- Policies profiles
create policy "profiles_select" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = user_id);

-- Policies chaines
create policy "chaines_select" on public.chaines for select using (auth.uid() = user_id);
create policy "chaines_insert" on public.chaines for insert with check (auth.uid() = user_id);
create policy "chaines_update" on public.chaines for update using (auth.uid() = user_id);
create policy "chaines_delete" on public.chaines for delete using (auth.uid() = user_id);

-- Policies revenus
create policy "revenus_select" on public.revenus for select using (auth.uid() = user_id);
create policy "revenus_insert" on public.revenus for insert with check (auth.uid() = user_id);
create policy "revenus_update" on public.revenus for update using (auth.uid() = user_id);
create policy "revenus_delete" on public.revenus for delete using (auth.uid() = user_id);

-- Policies depenses
create policy "depenses_select" on public.depenses for select using (auth.uid() = user_id);
create policy "depenses_insert" on public.depenses for insert with check (auth.uid() = user_id);
create policy "depenses_update" on public.depenses for update using (auth.uid() = user_id);
create policy "depenses_delete" on public.depenses for delete using (auth.uid() = user_id);

-- Policies factures
create policy "factures_select" on public.factures for select using (auth.uid() = user_id);
create policy "factures_insert" on public.factures for insert with check (auth.uid() = user_id);
create policy "factures_update" on public.factures for update using (auth.uid() = user_id);
create policy "factures_delete" on public.factures for delete using (auth.uid() = user_id);

-- ============================================================
-- AUTO-CRÉATION DU PROFIL à l'inscription
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, nom, prenom, statut_juridique, regime_fiscal)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nom', ''),
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    coalesce(new.raw_user_meta_data->>'statut_juridique', 'auto-entrepreneur'),
    coalesce(new.raw_user_meta_data->>'regime_fiscal', 'micro-entreprise')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
