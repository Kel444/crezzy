export type StatutJuridique =
  | "auto-entrepreneur"
  | "sasu"
  | "eurl"
  | "ei"
  | "autre";

export type RegimeFiscal =
  | "micro-entreprise"
  | "versement-liberatoire"
  | "reel-simplifie"
  | "is"
  | "autre";

export type SourceRevenu =
  | "adsense"
  | "membership"
  | "super-chat"
  | "sponsoring"
  | "merch"
  | "autre";

export type CategorieDepense =
  | "materiel"
  | "logiciels"
  | "sous-traitants"
  | "deplacements"
  | "formation"
  | "communication"
  | "bureau"
  | "autre";

export type StatutFacture = "brouillon" | "envoyee" | "payee" | "en-retard";

export interface Profile {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  statut_juridique: StatutJuridique;
  regime_fiscal: RegimeFiscal;
  siret?: string;
  adresse?: string;
  created_at: string;
  updated_at: string;
}

export interface Chaine {
  id: string;
  user_id: string;
  nom: string;
  url?: string;
  devise: string;
  description?: string;
  created_at: string;
}

export interface Revenu {
  id: string;
  user_id: string;
  chaine_id: string;
  source: SourceRevenu;
  montant: number;
  devise: string;
  montant_eur: number;
  mois: number;
  annee: number;
  description?: string;
  created_at: string;
  chaine?: Chaine;
}

export interface Depense {
  id: string;
  user_id: string;
  categorie: CategorieDepense;
  description: string;
  montant: number;
  date_depense: string;
  deductible: boolean;
  justificatif_url?: string;
  created_at: string;
}

export interface Facture {
  id: string;
  user_id: string;
  numero: string;
  nom_client: string;
  email_client?: string;
  adresse_client?: string;
  objet: string;
  montant_ht: number;
  tva_pct: number;
  montant_ttc: number;
  statut: StatutFacture;
  date_emission: string;
  date_echeance: string;
  date_paiement?: string;
  conditions_paiement?: string;
  notes?: string;
  created_at: string;
}

export interface LigneFacture {
  description: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
}
