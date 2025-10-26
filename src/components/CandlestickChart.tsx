import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  data: OHLCData[];
  cryptoName: string;
  cryptoSymbol: string;
}

interface Pattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
}

const CandlestickChart = ({ data, cryptoName, cryptoSymbol }: CandlestickChartProps) => {
  const candles = useMemo(() => {
    if (data.length === 0) return [];

    const prices = data.map(d => [d.open, d.high, d.low, d.close]).flat();
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    return data.map(candle => {
      const bodyTop = Math.max(candle.open, candle.close);
      const bodyBottom = Math.min(candle.open, candle.close);
      const bodyHeight = Math.abs(candle.close - candle.open);
      const isBullish = candle.close >= candle.open;

      return {
        ...candle,
        bodyTop: ((maxPrice - bodyTop) / priceRange) * 100,
        bodyBottom: ((maxPrice - bodyBottom) / priceRange) * 100,
        bodyHeight: (bodyHeight / priceRange) * 100,
        wickTop: ((maxPrice - candle.high) / priceRange) * 100,
        wickBottom: ((maxPrice - candle.low) / priceRange) * 100,
        isBullish
      };
    });
  }, [data]);

  const calculateSMA = (period: number) => {
    if (data.length < period) return [];
    const sma: { time: string; value: number; y: number }[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
      const avgPrice = sum / period;
      
      const prices = data.map(d => [d.open, d.high, d.low, d.close]).flat();
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;
      
      sma.push({
        time: data[i].time,
        value: avgPrice,
        y: ((maxPrice - avgPrice) / priceRange) * 100
      });
    }
    return sma;
  };

  const calculateEMA = (period: number) => {
    if (data.length < period) return [];
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((acc, d) => acc + d.close, 0) / period;
    
    const prices = data.map(d => [d.open, d.high, d.low, d.close]).flat();
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    const result = data.slice(period).map(d => {
      ema = (d.close - ema) * multiplier + ema;
      return {
        time: d.time,
        value: ema,
        y: ((maxPrice - ema) / priceRange) * 100
      };
    });
    
    return result;
  };

  const calculateBollingerBands = () => {
    const period = 20;
    if (data.length < period) return { upper: [], middle: [], lower: [] };
    
    const prices = data.map(d => [d.open, d.high, d.low, d.close]).flat();
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    const bands = { upper: [], middle: [], lower: [] };
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1).map(d => d.close);
      const sma = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((acc, val) => acc + Math.pow(val - sma, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      bands.middle.push({
        time: data[i].time,
        value: sma,
        y: ((maxPrice - sma) / priceRange) * 100
      });
      bands.upper.push({
        time: data[i].time,
        value: sma + (2 * stdDev),
        y: ((maxPrice - (sma + 2 * stdDev)) / priceRange) * 100
      });
      bands.lower.push({
        time: data[i].time,
        value: sma - (2 * stdDev),
        y: ((maxPrice - (sma - 2 * stdDev)) / priceRange) * 100
      });
    }
    
    return bands;
  };

  const detectPatterns = (): Pattern[] => {
    if (data.length < 3) return [];
    const patterns: Pattern[] = [];
    const recent = data.slice(-5);

    const lastCandle = recent[recent.length - 1];
    const prevCandle = recent[recent.length - 2];
    const body = Math.abs(lastCandle.close - lastCandle.open);
    const totalRange = lastCandle.high - lastCandle.low;
    const upperShadow = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
    const lowerShadow = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;

    if (lowerShadow > body * 2 && upperShadow < body * 0.3) {
      patterns.push({
        name: 'Hammer (Молот)',
        type: 'bullish',
        confidence: 75,
        description: 'Сильный бычий сигнал разворота тренда'
      });
    }

    if (upperShadow > body * 2 && lowerShadow < body * 0.3) {
      patterns.push({
        name: 'Shooting Star (Падающая звезда)',
        type: 'bearish',
        confidence: 70,
        description: 'Медвежий разворотный паттерн'
      });
    }

    if (body < totalRange * 0.1) {
      patterns.push({
        name: 'Doji',
        type: 'neutral',
        confidence: 65,
        description: 'Неопределенность рынка, возможный разворот'
      });
    }

    if (lastCandle.close > lastCandle.open && prevCandle.close < prevCandle.open &&
        lastCandle.close > prevCandle.open && lastCandle.open < prevCandle.close) {
      patterns.push({
        name: 'Bullish Engulfing (Бычье поглощение)',
        type: 'bullish',
        confidence: 85,
        description: 'Сильный бычий сигнал для входа в лонг'
      });
    }

    if (lastCandle.close < lastCandle.open && prevCandle.close > prevCandle.open &&
        lastCandle.close < prevCandle.open && lastCandle.open > prevCandle.close) {
      patterns.push({
        name: 'Bearish Engulfing (Медвежье поглощение)',
        type: 'bearish',
        confidence: 85,
        description: 'Сильный медвежий сигнал для входа в шорт'
      });
    }

    if (recent.length >= 3) {
      const [c1, c2, c3] = recent.slice(-3);
      if (c1.close < c1.open && c2.close < c2.open && c3.close < c3.open &&
          c3.close < c2.close && c2.close < c1.close) {
        patterns.push({
          name: 'Three Black Crows (Три черные вороны)',
          type: 'bearish',
          confidence: 80,
          description: 'Сильный медвежий тренд, рассмотрите шорт'
        });
      }
    }

    return patterns;
  };

  const sma20 = calculateSMA(20);
  const sma50 = calculateSMA(50);
  const ema12 = calculateEMA(12);
  const ema26 = calculateEMA(26);
  const bollinger = calculateBollingerBands();
  const patterns = detectPatterns();

  const calculateRSI = () => {
    const period = 14;
    if (data.length < period + 1) return 50;
    
    const changes = data.slice(-period - 1).map((d, i, arr) => 
      i > 0 ? d.close - arr[i - 1].close : 0
    ).slice(1);
    
    const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
    const losses = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
    const rs = gains / (losses || 1);
    return 100 - (100 / (1 + rs));
  };

  const calculateMACD = () => {
    if (ema12.length === 0 || ema26.length === 0) return { macd: 0, signal: 0, histogram: 0 };
    const macdLine = ema12[ema12.length - 1].value - ema26[ema26.length - 1].value;
    return { macd: macdLine, signal: 0, histogram: macdLine };
  };

  const rsi = calculateRSI();
  const macd = calculateMACD();

  const formatPrice = (price: number) => {
    return price < 1 ? price.toFixed(4) : price.toFixed(2);
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icon name="BarChart3" size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Загрузка графика...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Icon name="CandlestickChart" size={24} />
                Свечной график {cryptoName} ({cryptoSymbol})
              </CardTitle>
              <CardDescription>Профессиональный технический анализ</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                <Icon name="TrendingUp" size={14} className="mr-1" />
                RSI: {rsi.toFixed(1)}
              </Badge>
              <Badge variant="outline">
                <Icon name="Activity" size={14} className="mr-1" />
                MACD: {macd.macd.toFixed(2)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-96 bg-card border border-border rounded-lg p-4">
            <svg width="100%" height="100%" className="overflow-visible">
              <defs>
                <linearGradient id="bbFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1"/>
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05"/>
                </linearGradient>
              </defs>

              {bollinger.upper.length > 0 && (
                <>
                  <path
                    d={`M ${bollinger.upper.map((d, i) => 
                      `${(i / (bollinger.upper.length - 1)) * 100}% ${d.y}%`
                    ).join(' L ')}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.3"
                  />
                  <path
                    d={`M ${bollinger.lower.map((d, i) => 
                      `${(i / (bollinger.lower.length - 1)) * 100}% ${d.y}%`
                    ).join(' L ')}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.3"
                  />
                  <path
                    d={`
                      M ${bollinger.upper.map((d, i) => 
                        `${(i / (bollinger.upper.length - 1)) * 100}% ${d.y}%`
                      ).join(' L ')}
                      L ${bollinger.lower.slice().reverse().map((d, i) => 
                        `${((bollinger.lower.length - 1 - i) / (bollinger.lower.length - 1)) * 100}% ${d.y}%`
                      ).join(' L ')}
                      Z
                    `}
                    fill="url(#bbFill)"
                  />
                </>
              )}

              {sma20.length > 0 && (
                <path
                  d={`M ${sma20.map((d, i) => 
                    `${(i / (sma20.length - 1)) * 100}% ${d.y}%`
                  ).join(' L ')}`}
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="2"
                  opacity="0.8"
                />
              )}

              {sma50.length > 0 && (
                <path
                  d={`M ${sma50.map((d, i) => 
                    `${(i / (sma50.length - 1)) * 100}% ${d.y}%`
                  ).join(' L ')}`}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  opacity="0.6"
                />
              )}

              {candles.map((candle, i) => {
                const x = (i / (candles.length - 1)) * 100;
                const width = 100 / candles.length * 0.6;
                
                return (
                  <g key={i}>
                    <line
                      x1={`${x}%`}
                      y1={`${candle.wickTop}%`}
                      x2={`${x}%`}
                      y2={`${candle.wickBottom}%`}
                      stroke={candle.isBullish ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      strokeWidth="1"
                    />
                    
                    <rect
                      x={`calc(${x}% - ${width / 2}%)`}
                      y={`${candle.bodyTop}%`}
                      width={`${width}%`}
                      height={`${candle.bodyHeight}%`}
                      fill={candle.isBullish ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      stroke={candle.isBullish ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      strokeWidth="1"
                      opacity="0.9"
                    />
                  </g>
                );
              })}
            </svg>

            <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs text-muted-foreground">
              <span>{data[0]?.time}</span>
              <span>{data[data.length - 1]?.time}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded"></div>
              <span>Бычья свеча</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded"></div>
              <span>Медвежья свеча</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-secondary"></div>
              <span>SMA(20)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-primary opacity-60"></div>
              <span>SMA(50)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Search" size={20} />
              Обнаруженные паттерны ({patterns.length})
            </CardTitle>
            <CardDescription>Автоматическое распознавание свечных формаций</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patterns.map((pattern, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <Badge 
                    variant={pattern.type === 'bullish' ? 'default' : pattern.type === 'bearish' ? 'destructive' : 'secondary'}
                    className={pattern.type === 'bullish' ? 'bg-success' : ''}
                  >
                    {pattern.type === 'bullish' && <Icon name="TrendingUp" size={14} className="mr-1" />}
                    {pattern.type === 'bearish' && <Icon name="TrendingDown" size={14} className="mr-1" />}
                    {pattern.confidence}%
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{pattern.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon name="Target" size={18} />
              Скальпинг сигналы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">RSI(14)</span>
                <div className="flex items-center gap-2">
                  <Badge variant={rsi > 70 ? 'destructive' : rsi < 30 ? 'default' : 'secondary'}
                         className={rsi < 30 ? 'bg-success' : ''}>
                    {rsi.toFixed(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {rsi > 70 ? 'Перекуплен' : rsi < 30 ? 'Перепродан' : 'Нейтрально'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">MACD</span>
                <div className="flex items-center gap-2">
                  <Badge variant={macd.macd > 0 ? 'default' : 'destructive'}
                         className={macd.macd > 0 ? 'bg-success' : ''}>
                    {macd.macd.toFixed(2)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {macd.macd > 0 ? 'Бычий' : 'Медвежий'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Bollinger Bands</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {bollinger.upper.length > 0 ? 'Активны' : 'Недостаточно данных'}
                  </span>
                </div>
              </div>

              {data.length >= 2 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-sm font-medium mb-2">Текущая свеча:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Open:</span>
                      <span className="font-mono">${formatPrice(data[data.length - 1].open)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Close:</span>
                      <span className="font-mono">${formatPrice(data[data.length - 1].close)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">High:</span>
                      <span className="font-mono text-success">${formatPrice(data[data.length - 1].high)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Low:</span>
                      <span className="font-mono text-destructive">${formatPrice(data[data.length - 1].low)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon name="Lightbulb" size={18} />
              Торговые рекомендации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rsi < 30 && patterns.some(p => p.type === 'bullish') && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="TrendingUp" size={16} className="text-success" />
                    <span className="font-medium text-success">Сигнал на покупку (Long)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    RSI показывает перепроданность + обнаружен бычий паттерн
                  </p>
                </div>
              )}

              {rsi > 70 && patterns.some(p => p.type === 'bearish') && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="TrendingDown" size={16} className="text-destructive" />
                    <span className="font-medium text-destructive">Сигнал на продажу (Short)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    RSI показывает перекупленность + обнаружен медвежий паттерн
                  </p>
                </div>
              )}

              {patterns.length === 0 && rsi >= 30 && rsi <= 70 && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Minus" size={16} className="text-muted-foreground" />
                    <span className="font-medium">Ожидание сигнала</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Нет явных сигналов для входа. Рекомендуется дождаться паттерна.
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-medium mb-1">💡 Совет для скальпинга:</p>
                <p className="text-xs text-muted-foreground">
                  Используйте стоп-лосс 0.5-1% от точки входа. Фиксируйте прибыль при достижении 1-2%.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CandlestickChart;
