import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para o banco de dados
export interface DatabaseProduct {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: 'food' | 'cosmetic';
  score: number;
  nutri_score?: 'A' | 'B' | 'C' | 'D' | 'E';
  ingredients: string[];
  nutritional_info?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
    sugar: number;
  };
  additives: Array<{
    name: string;
    code: string;
    risk: 'low' | 'moderate' | 'high';
  }>;
  allergens: string[];
  warnings: string[];
  benefits: string[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}