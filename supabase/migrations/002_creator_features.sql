-- Extend profiles table with creator finance settings
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS acre BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS taux_imposition DECIMAL(5,2) DEFAULT 22.0,
  ADD COLUMN IF NOT EXISTS frequence_urssaf TEXT DEFAULT 'mensuel',
  ADD COLUMN IF NOT EXISTS date_debut_activite DATE,
  ADD COLUMN IF NOT EXISTS youtube_api_key TEXT,
  ADD COLUMN IF NOT EXISTS activite_type TEXT DEFAULT 'services';

CREATE TABLE IF NOT EXISTS brand_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  marque TEXT NOT NULL,
  montant DECIMAL(10,2) DEFAULT 0,
  statut TEXT DEFAULT 'negociation',
  plateforme TEXT DEFAULT 'YouTube',
  notes TEXT,
  contact_email TEXT,
  date_contact DATE,
  date_fin DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE brand_deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own brand_deals" ON brand_deals;
CREATE POLICY "Users manage own brand_deals" ON brand_deals
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS youtube_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  abonnes BIGINT DEFAULT 0,
  vues_total BIGINT DEFAULT 0,
  nb_videos INTEGER DEFAULT 0,
  derniere_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own youtube_channels" ON youtube_channels;
CREATE POLICY "Users manage own youtube_channels" ON youtube_channels
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE factures ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
