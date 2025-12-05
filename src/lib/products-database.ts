// Sistema híbrido: Supabase + APIs externas + cache local
// Prioriza Supabase, depois APIs reais, usa base local como fallback

import { searchProductByBarcode as searchOpenFoodFacts } from './api/open-food-facts';
import { searchCosmeticByBarcode } from './api/cosmetics-api';
import { supabase, DatabaseProduct } from './supabase';

export interface Product {
  barcode: string;
  name: string;
  brand: string;
  category: 'food' | 'cosmetic';
  score: number; // 0-100
  nutriScore?: 'A' | 'B' | 'C' | 'D' | 'E';
  ingredients: string[];
  nutritionalInfo?: {
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
  image?: string;
}

// Cache em memória para produtos já consultados
const productCache = new Map<string, Product>();

// Converter produto do Supabase para nosso formato
function convertFromDatabase(dbProduct: DatabaseProduct): Product {
  return {
    barcode: dbProduct.barcode,
    name: dbProduct.name,
    brand: dbProduct.brand,
    category: dbProduct.category,
    score: dbProduct.score,
    nutriScore: dbProduct.nutri_score,
    ingredients: dbProduct.ingredients,
    nutritionalInfo: dbProduct.nutritional_info,
    additives: dbProduct.additives,
    allergens: dbProduct.allergens,
    warnings: dbProduct.warnings,
    benefits: dbProduct.benefits,
    image: dbProduct.image_url
  };
}

// Converter produto para formato do banco de dados
function convertToDatabase(product: Product): Omit<DatabaseProduct, 'id' | 'created_at' | 'updated_at'> {
  return {
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    category: product.category,
    score: product.score,
    nutri_score: product.nutriScore,
    ingredients: product.ingredients,
    nutritional_info: product.nutritionalInfo,
    additives: product.additives,
    allergens: product.allergens,
    warnings: product.warnings,
    benefits: product.benefits,
    image_url: product.image
  };
}

// Base local de produtos brasileiros populares (fallback)
const localDatabase: Product[] = [
  // ==================== BEBIDAS - REFRIGERANTES ====================
  {
    barcode: '7891000100103',
    name: 'Coca-Cola Original 2L',
    brand: 'Coca-Cola',
    category: 'food',
    score: 35,
    nutriScore: 'E',
    ingredients: ['Água gaseificada', 'Açúcar', 'Extrato de noz de cola', 'Cafeína', 'Corante caramelo IV', 'Acidulante INS 338', 'Aromatizante'],
    nutritionalInfo: { calories: 42, protein: 0, carbs: 10.6, fat: 0, fiber: 0, sodium: 10, sugar: 10.6 },
    additives: [
      { name: 'Corante Caramelo IV', code: 'INS 150d', risk: 'moderate' },
      { name: 'Ácido Fosfórico', code: 'INS 338', risk: 'moderate' }
    ],
    allergens: [],
    warnings: ['Alto teor de açúcar', 'Bebida ultraprocessada', 'Contém cafeína'],
    benefits: [],
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop'
  },
  {
    barcode: '7891000100110',
    name: 'Coca-Cola Zero 2L',
    brand: 'Coca-Cola',
    category: 'food',
    score: 48,
    nutriScore: 'C',
    ingredients: ['Água gaseificada', 'Corante caramelo IV', 'Acidulante INS 338', 'Edulcorantes aspartame e acesulfame K', 'Conservador benzoato de sódio', 'Cafeína'],
    nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 15, sugar: 0 },
    additives: [
      { name: 'Aspartame', code: 'INS 951', risk: 'moderate' },
      { name: 'Acesulfame K', code: 'INS 950', risk: 'moderate' }
    ],
    allergens: ['Contém fenilalanina'],
    warnings: ['Contém edulcorantes artificiais', 'Fenilcetonúricos: contém fenilalanina'],
    benefits: ['Zero açúcar', 'Zero calorias'],
    image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop'
  },
  {
    barcode: '7896004700014',
    name: 'Suco Del Valle Laranja 1L',
    brand: 'Del Valle',
    category: 'food',
    score: 52,
    nutriScore: 'C',
    ingredients: ['Água', 'Suco concentrado de laranja', 'Açúcar', 'Vitamina C', 'Acidulante INS 330'],
    nutritionalInfo: { calories: 45, protein: 0.3, carbs: 11, fat: 0, fiber: 0.2, sodium: 5, sugar: 10.5 },
    additives: [{ name: 'Ácido Cítrico', code: 'INS 330', risk: 'low' }],
    allergens: [],
    warnings: ['Contém açúcar adicionado'],
    benefits: ['Enriquecido com vitamina C', 'Contém suco natural'],
    image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop'
  },
  {
    barcode: '7891024135105',
    name: 'Sabonete Dove Original 90g',
    brand: 'Dove',
    category: 'cosmetic',
    score: 75,
    ingredients: ['Sodium Lauroyl Isethionate', 'Stearic Acid', 'Sodium Tallowate', 'Water', 'Sodium Stearate', 'Cocamidopropyl Betaine', 'Fragrance', 'Titanium Dioxide'],
    additives: [],
    allergens: [],
    warnings: ['Contém fragrância sintética'],
    benefits: ['¼ de creme hidratante', 'pH neutro', 'Dermatologicamente testado'],
    image: 'https://images.unsplash.com/photo-1585128903994-03b9e8e2d0c7?w=400&h=400&fit=crop'
  }
];

// Buscar produto por código de barras (sistema híbrido com Supabase)
export async function findProductByBarcode(barcode: string): Promise<Product | undefined> {
  // 1. Verificar cache
  if (productCache.has(barcode)) {
    console.log('✅ Produto encontrado no cache');
    return productCache.get(barcode);
  }

  // 2. Tentar Supabase (dados reais armazenados)
  try {
    console.log('🔍 Buscando no Supabase...');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (data && !error) {
      console.log('✅ Produto encontrado no Supabase');
      const product = convertFromDatabase(data);
      productCache.set(barcode, product);
      return product;
    }
  } catch (error) {
    console.warn('Erro ao buscar no Supabase:', error);
  }

  // 3. Tentar Open Food Facts (API real)
  console.log('🔍 Buscando na Open Food Facts API...');
  const openFoodProduct = await searchOpenFoodFacts(barcode);
  if (openFoodProduct) {
    console.log('✅ Produto encontrado na Open Food Facts');
    // Salvar no Supabase para futuras consultas
    try {
      await supabase.from('products').upsert(convertToDatabase(openFoodProduct));
    } catch (error) {
      console.warn('Erro ao salvar produto no Supabase:', error);
    }
    productCache.set(barcode, openFoodProduct);
    return openFoodProduct;
  }

  // 4. Tentar API de cosméticos
  console.log('🔍 Buscando em APIs de cosméticos...');
  const cosmeticProduct = await searchCosmeticByBarcode(barcode);
  if (cosmeticProduct) {
    console.log('✅ Produto encontrado em API de cosméticos');
    // Salvar no Supabase
    try {
      await supabase.from('products').upsert(convertToDatabase(cosmeticProduct));
    } catch (error) {
      console.warn('Erro ao salvar produto no Supabase:', error);
    }
    productCache.set(barcode, cosmeticProduct);
    return cosmeticProduct;
  }

  // 5. Fallback para base local
  console.log('📦 Buscando na base local (fallback)...');
  const localProduct = localDatabase.find(p => p.barcode === barcode);
  if (localProduct) {
    console.log('✅ Produto encontrado na base local');
    // Salvar no Supabase para enriquecer a base
    try {
      await supabase.from('products').upsert(convertToDatabase(localProduct));
    } catch (error) {
      console.warn('Erro ao salvar produto no Supabase:', error);
    }
    productCache.set(localProduct.barcode, localProduct);
    return localProduct;
  }

  console.log('❌ Produto não encontrado em nenhuma fonte');
  return undefined;
}

// Buscar produtos por categoria
export async function findProductsByCategory(category: 'food' | 'cosmetic'): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .limit(50);

    if (data && !error) {
      return data.map(convertFromDatabase);
    }
  } catch (error) {
    console.warn('Erro ao buscar produtos por categoria no Supabase:', error);
  }

  // Fallback para base local
  return localDatabase.filter(p => p.category === category);
}

// Buscar produtos por marca
export async function findProductsByBrand(brand: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('brand', `%${brand}%`)
      .limit(50);

    if (data && !error) {
      return data.map(convertFromDatabase);
    }
  } catch (error) {
    console.warn('Erro ao buscar produtos por marca no Supabase:', error);
  }

  // Fallback para base local
  return localDatabase.filter(p =>
    p.brand.toLowerCase().includes(brand.toLowerCase())
  );
}

// Buscar produtos por nome
export async function findProductsByName(name: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${name}%`)
      .limit(50);

    if (data && !error) {
      return data.map(convertFromDatabase);
    }
  } catch (error) {
    console.warn('Erro ao buscar produtos por nome no Supabase:', error);
  }

  // Fallback para base local
  return localDatabase.filter(p =>
    p.name.toLowerCase().includes(name.toLowerCase())
  );
}

// Salvar produto manualmente (para administração)
export async function saveProduct(product: Product): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .upsert(convertToDatabase(product));

    if (!error) {
      productCache.set(product.barcode, product);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    return false;
  }
}

// Estatísticas do sistema
export async function getDatabaseStats() {
  let supabaseCount = 0;
  let supabaseFood = 0;
  let supabaseCosmetic = 0;

  try {
    const { data: allProducts, error } = await supabase
      .from('products')
      .select('category');

    if (allProducts && !error) {
      supabaseCount = allProducts.length;
      supabaseFood = allProducts.filter(p => p.category === 'food').length;
      supabaseCosmetic = allProducts.filter(p => p.category === 'cosmetic').length;
    }
  } catch (error) {
    console.warn('Erro ao obter estatísticas do Supabase:', error);
  }

  const localTotal = localDatabase.length;
  const localFood = localDatabase.filter(p => p.category === 'food').length;
  const localCosmetic = localDatabase.filter(p => p.category === 'cosmetic').length;
  const cacheSize = productCache.size;

  return {
    supabase: {
      total: supabaseCount,
      food: supabaseFood,
      cosmetic: supabaseCosmetic
    },
    local: {
      total: localTotal,
      food: localFood,
      cosmetic: localCosmetic
    },
    cache: {
      size: cacheSize,
      products: Array.from(productCache.keys())
    },
    apis: {
      openFoodFacts: {
        name: 'Open Food Facts',
        coverage: '2.8+ milhões de produtos',
        status: 'Ativo'
      },
      cosmetics: {
        name: 'Base de ingredientes cosméticos',
        coverage: 'Ingredientes comuns',
        status: 'Ativo'
      }
    },
    note: 'Sistema híbrido: Supabase + APIs reais + cache + fallback local'
  };
}

// Limpar cache (útil para desenvolvimento)
export function clearCache() {
  productCache.clear();
  console.log('🗑️ Cache limpo');
}