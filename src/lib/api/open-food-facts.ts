// Integração com Open Food Facts API - Maior banco de dados aberto de produtos alimentícios
// Documentação: https://world.openfoodfacts.org/data

import { Product } from '../products-database';

const API_BASE = 'https://world.openfoodfacts.org/api/v2';
const API_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';

interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands: string;
  categories: string;
  ingredients_text: string;
  nutriments: {
    'energy-kcal_100g': number;
    proteins_100g: number;
    carbohydrates_100g: number;
    fat_100g: number;
    fiber_100g: number;
    sodium_100g: number;
    sugars_100g: number;
  };
  nutriscore_grade?: string;
  additives_tags?: string[];
  allergens_tags?: string[];
  image_url?: string;
  nova_group?: number;
}

// Converter produto da API para nosso formato
function convertToProduct(apiProduct: OpenFoodFactsProduct): Product {
  const nutriScore = apiProduct.nutriscore_grade?.toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E' | undefined;
  
  // Calcular score baseado em Nutri-Score e NOVA
  let score = 50;
  if (nutriScore === 'A') score = 85;
  else if (nutriScore === 'B') score = 70;
  else if (nutriScore === 'C') score = 55;
  else if (nutriScore === 'D') score = 40;
  else if (nutriScore === 'E') score = 25;
  
  // Ajustar por NOVA (ultraprocessamento)
  if (apiProduct.nova_group === 4) score -= 15;
  else if (apiProduct.nova_group === 3) score -= 5;
  
  // Extrair aditivos
  const additives = (apiProduct.additives_tags || []).map(tag => {
    const code = tag.replace('en:', '').toUpperCase();
    return {
      name: code,
      code: code,
      risk: 'moderate' as const
    };
  });

  // Extrair alergênicos
  const allergens = (apiProduct.allergens_tags || []).map(tag => 
    tag.replace('en:', '').replace(/-/g, ' ')
  );

  // Gerar warnings baseado em nutrientes
  const warnings: string[] = [];
  if (apiProduct.nutriments['sugars_100g'] > 15) warnings.push('Alto teor de açúcar');
  if (apiProduct.nutriments['sodium_100g'] > 0.6) warnings.push('Alto teor de sódio');
  if (apiProduct.nutriments['fat_100g'] > 20) warnings.push('Alto teor de gordura');
  if (apiProduct.nova_group === 4) warnings.push('Produto ultraprocessado');
  if (additives.length > 5) warnings.push('Contém múltiplos aditivos');

  // Gerar benefícios
  const benefits: string[] = [];
  if (apiProduct.nutriments['fiber_100g'] > 5) benefits.push('Rico em fibras');
  if (apiProduct.nutriments['proteins_100g'] > 10) benefits.push('Fonte de proteína');
  if (nutriScore === 'A' || nutriScore === 'B') benefits.push('Boa qualidade nutricional');
  if (apiProduct.nova_group === 1) benefits.push('Alimento minimamente processado');

  return {
    barcode: apiProduct.code,
    name: apiProduct.product_name || 'Produto sem nome',
    brand: apiProduct.brands?.split(',')[0] || 'Marca desconhecida',
    category: 'food',
    score: Math.max(0, Math.min(100, score)),
    nutriScore,
    ingredients: apiProduct.ingredients_text?.split(',').map(i => i.trim()) || [],
    nutritionalInfo: {
      calories: Math.round(apiProduct.nutriments['energy-kcal_100g'] || 0),
      protein: Math.round((apiProduct.nutriments['proteins_100g'] || 0) * 10) / 10,
      carbs: Math.round((apiProduct.nutriments['carbohydrates_100g'] || 0) * 10) / 10,
      fat: Math.round((apiProduct.nutriments['fat_100g'] || 0) * 10) / 10,
      fiber: Math.round((apiProduct.nutriments['fiber_100g'] || 0) * 10) / 10,
      sodium: Math.round((apiProduct.nutriments['sodium_100g'] || 0) * 1000),
      sugar: Math.round((apiProduct.nutriments['sugars_100g'] || 0) * 10) / 10
    },
    additives,
    allergens,
    warnings,
    benefits,
    image: apiProduct.image_url
  };
}

// Buscar produto por código de barras na API
export async function searchProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_BASE}/product/${barcode}.json`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.status === 0 || !data.product) {
      return null;
    }

    return convertToProduct(data.product as OpenFoodFactsProduct);
  } catch (error) {
    console.error('Erro ao buscar produto na Open Food Facts:', error);
    return null;
  }
}

// Buscar produtos por nome/marca
export async function searchProducts(query: string, limit = 20): Promise<Product[]> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: limit.toString(),
      fields: 'code,product_name,brands,categories,ingredients_text,nutriments,nutriscore_grade,additives_tags,allergens_tags,image_url,nova_group'
    });

    const response = await fetch(`${API_SEARCH}?${params}`);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (!data.products || data.products.length === 0) {
      return [];
    }

    return data.products.map((p: OpenFoodFactsProduct) => convertToProduct(p));
  } catch (error) {
    console.error('Erro ao buscar produtos na Open Food Facts:', error);
    return [];
  }
}

// Buscar produtos por categoria
export async function searchProductsByCategory(category: string, limit = 20): Promise<Product[]> {
  try {
    const params = new URLSearchParams({
      tagtype_0: 'categories',
      tag_contains_0: 'contains',
      tag_0: category,
      action: 'process',
      json: '1',
      page_size: limit.toString(),
      fields: 'code,product_name,brands,categories,ingredients_text,nutriments,nutriscore_grade,additives_tags,allergens_tags,image_url,nova_group'
    });

    const response = await fetch(`${API_SEARCH}?${params}`);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (!data.products || data.products.length === 0) {
      return [];
    }

    return data.products.map((p: OpenFoodFactsProduct) => convertToProduct(p));
  } catch (error) {
    console.error('Erro ao buscar produtos por categoria:', error);
    return [];
  }
}

// Estatísticas da API
export async function getAPIStats() {
  try {
    const response = await fetch('https://world.openfoodfacts.org/data/data-fields.txt');
    const text = await response.text();
    
    // Extrair número de produtos (aproximado)
    const match = text.match(/(\d+)\s+products/i);
    const totalProducts = match ? parseInt(match[1]) : 2800000; // Valor aproximado conhecido

    return {
      totalProducts,
      source: 'Open Food Facts',
      coverage: 'Mundial (com foco em produtos brasileiros)',
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    return {
      totalProducts: 2800000,
      source: 'Open Food Facts',
      coverage: 'Mundial',
      lastUpdate: new Date().toISOString()
    };
  }
}
