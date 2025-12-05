'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Camera, Barcode, AlertTriangle, CheckCircle, Info, XCircle, Database, Loader2 } from 'lucide-react';
import { findProductByBarcode, getDatabaseStats, type Product } from '@/lib/products-database';

export default function Home() {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Carregar estatísticas ao montar
  useEffect(() => {
    getDatabaseStats().then(setStats);
  }, []);

  const handleSearch = async () => {
    if (!barcode.trim()) {
      setError('Digite um código de barras');
      return;
    }

    setLoading(true);
    setError('');
    setProduct(null);

    try {
      const foundProduct = await findProductByBarcode(barcode.trim());
      
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        setError('Produto não encontrado. Tentamos buscar em múltiplas fontes, mas este código não está cadastrado ainda.');
      }
    } catch (err) {
      setError('Erro ao buscar produto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        setError('');
      }
    } catch (err) {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setScanning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'from-emerald-500 to-green-600';
    if (score >= 50) return 'from-yellow-500 to-orange-500';
    return 'from-orange-500 to-red-600';
  };

  const getNutriScoreColor = (grade?: string) => {
    const colors: Record<string, string> = {
      'A': 'bg-emerald-500',
      'B': 'bg-green-500',
      'C': 'bg-yellow-500',
      'D': 'bg-orange-500',
      'E': 'bg-red-500'
    };
    return colors[grade || ''] || 'bg-gray-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Barcode className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Saúde em Código</h1>
                <p className="text-emerald-100 text-sm">Escaneie e descubra o impacto na sua saúde</p>
              </div>
            </div>
            {stats && (
              <div className="hidden md:flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                <Database className="w-5 h-5" />
                <div className="text-sm">
                  <div className="font-semibold">{stats.apis.openFoodFacts.coverage}</div>
                  <div className="text-emerald-100 text-xs">via Open Food Facts</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-emerald-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Barras
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Digite o código (ex: 7891000100103)"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  disabled={loading}
                />
                <Search className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="flex gap-2 sm:flex-col sm:justify-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Buscar
                  </>
                )}
              </button>
              <button
                onClick={scanning ? stopScanner : startScanner}
                className="flex-1 sm:flex-none bg-white border-2 border-emerald-600 text-emerald-600 px-6 py-3 rounded-xl hover:bg-emerald-50 transition-all font-medium flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                {scanning ? 'Parar' : 'Câmera'}
              </button>
            </div>
          </div>

          {/* Camera Scanner */}
          {scanning && (
            <div className="mt-6 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-xl border-4 border-emerald-500"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-40 border-4 border-emerald-500 rounded-lg shadow-2xl"></div>
              </div>
              <p className="text-center mt-3 text-sm text-gray-600">
                Posicione o código de barras dentro do quadro
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* API Info */}
          {stats && !product && !error && (
            <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">Sistema de busca inteligente:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>🌍 <strong>Open Food Facts</strong>: {stats.apis.openFoodFacts.coverage} de produtos alimentícios</li>
                    <li>💄 <strong>Base de cosméticos</strong>: Análise de ingredientes em tempo real</li>
                    <li>📦 <strong>Cache local</strong>: {stats.cache.size} produtos consultados recentemente</li>
                    <li>🇧🇷 <strong>Fallback</strong>: {stats.local.total} produtos brasileiros populares</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Result */}
        {product && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Product Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-6">
              <div className="flex items-start gap-4">
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-24 h-24 object-cover rounded-xl border-4 border-white/30 shadow-lg"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
                  <p className="text-emerald-100 text-sm mb-3">{product.brand}</p>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                      {product.category === 'food' ? '🍽️ Alimento' : '🧴 Cosmético'}
                    </span>
                    {product.nutriScore && (
                      <span className={`${getNutriScoreColor(product.nutriScore)} text-white px-3 py-1 rounded-full text-xs font-bold`}>
                        Nutri-Score: {product.nutriScore}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Score Section */}
            <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center mb-6">
                <div className="inline-block">
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getScoreColor(product.score)} flex items-center justify-center shadow-2xl mb-3 mx-auto`}>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white">{product.score}</div>
                      <div className="text-xs text-white/90 font-medium">de 100</div>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    {product.score >= 70 ? '✅ Boa escolha!' : product.score >= 50 ? '⚠️ Consumir com moderação' : '❌ Evite consumir frequentemente'}
                  </p>
                </div>
              </div>

              {/* Nutritional Info */}
              {product.nutritionalInfo && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-emerald-600" />
                    Informações Nutricionais (por 100g/ml)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Calorias', value: `${product.nutritionalInfo.calories} kcal`, icon: '🔥' },
                      { label: 'Proteínas', value: `${product.nutritionalInfo.protein}g`, icon: '💪' },
                      { label: 'Carboidratos', value: `${product.nutritionalInfo.carbs}g`, icon: '🌾' },
                      { label: 'Gorduras', value: `${product.nutritionalInfo.fat}g`, icon: '🥑' },
                      { label: 'Fibras', value: `${product.nutritionalInfo.fiber}g`, icon: '🌿' },
                      { label: 'Sódio', value: `${product.nutritionalInfo.sodium}mg`, icon: '🧂' },
                      { label: 'Açúcar', value: `${product.nutritionalInfo.sugar}g`, icon: '🍬' }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <div className="text-xs text-gray-600 mb-1">{item.label}</div>
                        <div className="text-sm font-bold text-gray-800">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {product.warnings.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Alertas de Saúde
                  </h3>
                  <div className="space-y-2">
                    {product.warnings.map((warning, idx) => (
                      <div key={idx} className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-orange-800">{warning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {product.benefits.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    Benefícios
                  </h3>
                  <div className="space-y-2">
                    {product.benefits.map((benefit, idx) => (
                      <div key={idx} className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-lg flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-emerald-800">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additives */}
              {product.additives.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    Aditivos e Ingredientes de Atenção
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {product.additives.map((additive, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                        additive.risk === 'high' ? 'bg-red-50 border-red-500' :
                        additive.risk === 'moderate' ? 'bg-yellow-50 border-yellow-500' :
                        'bg-green-50 border-green-500'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-800">{additive.name}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            additive.risk === 'high' ? 'bg-red-200 text-red-800' :
                            additive.risk === 'moderate' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-green-200 text-green-800'
                          }`}>
                            {additive.risk === 'high' ? 'Alto risco' : additive.risk === 'moderate' ? 'Moderado' : 'Baixo risco'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-600">{additive.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergens */}
              {product.allergens.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Alergênicos
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.allergens.map((allergen, idx) => (
                      <span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium border border-red-300">
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="mb-2">
            💡 <strong>Dica:</strong> Escaneie produtos antes de comprar para fazer escolhas mais saudáveis
          </p>
          <p className="text-xs text-gray-500">
            Dados fornecidos por Open Food Facts e bases de dados públicas
          </p>
        </div>
      </main>
    </div>
  );
}
