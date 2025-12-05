// Integração com APIs de cosméticos e produtos de higiene pessoal
// Usando dados públicos e padrões da indústria

import { Product } from '../products-database';

// Base de dados de ingredientes cosméticos e seus riscos
const COSMETIC_INGREDIENTS_RISK: Record<string, 'low' | 'moderate' | 'high'> = {
  // Parabenos
  'methylparaben': 'moderate',
  'propylparaben': 'moderate',
  'butylparaben': 'high',
  
  // Sulfatos
  'sodium lauryl sulfate': 'moderate',
  'sodium laureth sulfate': 'moderate',
  'sls': 'moderate',
  
  // Formaldeído e liberadores
  'formaldehyde': 'high',
  'dmdm hydantoin': 'high',
  'quaternium-15': 'high',
  
  // Ftalatos
  'phthalate': 'high',
  'dbp': 'high',
  'dehp': 'high',
  
  // Outros
  'triclosan': 'moderate',
  'triclocarban': 'moderate',
  'aluminum': 'moderate',
  'aluminum chlorohydrate': 'moderate',
  'fragrance': 'moderate',
  'parfum': 'moderate',
  'petrolatum': 'low',
  'mineral oil': 'low',
  'silicone': 'low',
  'dimethicone': 'low',
  'glycerin': 'low',
  'hyaluronic acid': 'low',
  'vitamin e': 'low',
  'vitamin c': 'low'
};

// Analisar ingredientes e calcular score
function analyzeIngredients(ingredients: string[]): {
  score: number;
  warnings: string[];
  benefits: string[];
  additives: Array<{ name: string; code: string; risk: 'low' | 'moderate' | 'high' }>;
} {
  let score = 70; // Score base para cosméticos
  const warnings: string[] = [];
  const benefits: string[] = [];
  const additives: Array<{ name: string; code: string; risk: 'low' | 'moderate' | 'high' }> = [];

  const ingredientsLower = ingredients.map(i => i.toLowerCase());

  // Analisar cada ingrediente
  for (const ingredient of ingredientsLower) {
    for (const [key, risk] of Object.entries(COSMETIC_INGREDIENTS_RISK)) {
      if (ingredient.includes(key)) {
        additives.push({
          name: ingredient,
          code: key.toUpperCase(),
          risk
        });

        // Ajustar score baseado no risco
        if (risk === 'high') {
          score -= 15;
          warnings.push(`Contém ${ingredient} (alto risco)`);
        } else if (risk === 'moderate') {
          score -= 5;
          warnings.push(`Contém ${ingredient}`);
        } else {
          benefits.push(`Contém ${ingredient} (seguro)`);
        }
      }
    }
  }

  // Verificações específicas
  if (ingredientsLower.some(i => i.includes('paraben'))) {
    warnings.push('Contém parabenos');
  }
  
  if (ingredientsLower.some(i => i.includes('sulfate'))) {
    warnings.push('Contém sulfatos');
  }
  
  if (ingredientsLower.some(i => i.includes('alcohol') && !i.includes('cetearyl'))) {
    warnings.push('Contém álcool');
  }

  // Benefícios
  if (ingredientsLower.some(i => i.includes('vitamin'))) {
    benefits.push('Enriquecido com vitaminas');
  }
  
  if (ingredientsLower.some(i => i.includes('natural') || i.includes('organic'))) {
    benefits.push('Ingredientes naturais');
    score += 10;
  }
  
  if (ingredientsLower.some(i => i.includes('hyaluronic'))) {
    benefits.push('Contém ácido hialurônico');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    warnings,
    benefits,
    additives
  };
}

// Buscar produto cosmético por código de barras (simulado - em produção, usar API real)
export async function searchCosmeticByBarcode(barcode: string): Promise<Product | null> {
  // Em produção, integrar com APIs como:
  // - EWG Skin Deep Database
  // - CosmEthics
  // - Think Dirty
  
  // Por enquanto, retorna null para usar fallback local
  return null;
}

// Analisar produto cosmético manualmente
export function analyzeCosmeticProduct(
  barcode: string,
  name: string,
  brand: string,
  ingredients: string[]
): Product {
  const analysis = analyzeIngredients(ingredients);

  return {
    barcode,
    name,
    brand,
    category: 'cosmetic',
    score: analysis.score,
    ingredients,
    additives: analysis.additives,
    allergens: [],
    warnings: analysis.warnings,
    benefits: analysis.benefits
  };
}

// Buscar informações sobre ingrediente específico
export function getIngredientInfo(ingredient: string): {
  name: string;
  risk: 'low' | 'moderate' | 'high' | 'unknown';
  description: string;
} {
  const ingredientLower = ingredient.toLowerCase();
  
  for (const [key, risk] of Object.entries(COSMETIC_INGREDIENTS_RISK)) {
    if (ingredientLower.includes(key)) {
      return {
        name: ingredient,
        risk,
        description: getIngredientDescription(key, risk)
      };
    }
  }

  return {
    name: ingredient,
    risk: 'unknown',
    description: 'Ingrediente não catalogado. Consulte um dermatologista para mais informações.'
  };
}

function getIngredientDescription(ingredient: string, risk: 'low' | 'moderate' | 'high'): string {
  const descriptions: Record<string, string> = {
    'methylparaben': 'Conservante que pode causar irritação em peles sensíveis',
    'sodium lauryl sulfate': 'Agente de limpeza que pode ressecar a pele',
    'formaldehyde': 'Conservante potencialmente cancerígeno',
    'triclosan': 'Antibacteriano que pode afetar hormônios',
    'aluminum': 'Metal que pode ser absorvido pela pele',
    'fragrance': 'Pode causar alergias e irritações',
    'glycerin': 'Hidratante natural seguro e eficaz',
    'hyaluronic acid': 'Hidratante poderoso que retém água na pele',
    'vitamin e': 'Antioxidante que protege a pele'
  };

  return descriptions[ingredient] || `Ingrediente com risco ${risk}`;
}

// Estatísticas de cosméticos
export function getCosmeticsStats() {
  return {
    totalIngredients: Object.keys(COSMETIC_INGREDIENTS_RISK).length,
    source: 'Base de dados interna + padrões da indústria',
    coverage: 'Ingredientes mais comuns em cosméticos',
    note: 'Para análise completa, recomendamos consultar dermatologista'
  };
}
