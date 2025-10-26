import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  sparkline: number[];
  high24h: number;
  low24h: number;
}

interface ChartDataPoint {
  time: string;
  price: number;
  volume?: number;
}

const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'cardano'];

const Index = () => {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  const fetchCryptoData = async () => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${CRYPTO_IDS.join(',')}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`
      );
      
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      
      const formattedData: CryptoData[] = data.map((coin: any) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h || 0,
        volume: coin.total_volume,
        marketCap: coin.market_cap,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        sparkline: coin.sparkline_in_7d?.price?.slice(-24) || []
      }));

      setCryptoData(formattedData);
      if (!selectedCrypto && formattedData.length > 0) {
        setSelectedCrypto(formattedData[0]);
      }
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      toast({
        title: "Ошибка загрузки данных",
        description: "Не удалось получить данные с CoinGecko API",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const fetchChartData = async (coinId: string) => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1&interval=hourly`
      );
      
      if (!response.ok) throw new Error('Failed to fetch chart data');
      
      const data = await response.json();
      
      const formattedChartData: ChartDataPoint[] = data.prices.map((item: [number, number], index: number) => ({
        time: new Date(item[0]).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        price: item[1],
        volume: data.total_volumes[index]?.[1] || 0
      }));

      setChartData(formattedChartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCrypto) {
      fetchChartData(selectedCrypto.id);
    }
  }, [selectedCrypto]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 4 : 2
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2
    }).format(volume);
  };

  const calculateRSI = (prices: number[]) => {
    if (prices.length < 14) return 50;
    const changes = prices.slice(-14).map((price, i, arr) => i > 0 ? price - arr[i - 1] : 0).slice(1);
    const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / 14;
    const losses = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0)) / 14;
    const rs = gains / (losses || 1);
    return 100 - (100 / (1 + rs));
  };

  const calculateMA = (prices: number[], period: number) => {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
  };

  const getIndicators = (crypto: CryptoData) => {
    const prices = crypto.sparkline.length > 0 ? crypto.sparkline : [crypto.price];
    const rsi = calculateRSI(prices);
    const ma50 = calculateMA(prices, Math.min(50, prices.length));
    const ma200 = calculateMA(prices, Math.min(200, prices.length));
    
    return [
      { name: 'RSI(14)', value: rsi, status: rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral' },
      { name: 'Price', value: crypto.price, status: crypto.change24h > 0 ? 'bullish' : 'bearish' },
      { name: 'MA(50)', value: ma50, status: crypto.price > ma50 ? 'bullish' : 'bearish' },
      { name: 'Vol 24h', value: crypto.volume / 1000000, status: 'neutral' }
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Icon name="Loader2" size={48} className="animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold crypto-gradient bg-clip-text text-transparent">
              Crypto Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Powered by CoinGecko API • Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={fetchCryptoData}>
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Обновить
            </Button>
            <Badge variant="outline" className="px-3 py-1 animate-pulse-glow">
              <Icon name="Activity" size={16} className="mr-2" />
              Live
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          {cryptoData.map((crypto, index) => (
            <Card
              key={crypto.id}
              className={`cursor-pointer transition-all hover:scale-105 ${
                selectedCrypto?.id === crypto.id ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''
              }`}
              onClick={() => setSelectedCrypto(crypto)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{crypto.name}</CardTitle>
                    <CardDescription className="text-sm font-mono font-bold">{crypto.symbol}</CardDescription>
                  </div>
                  <Badge
                    variant={crypto.change24h > 0 ? 'default' : 'destructive'}
                    className={crypto.change24h > 0 ? 'bg-success' : ''}
                  >
                    {crypto.change24h > 0 ? '↗' : '↘'} {Math.abs(crypto.change24h).toFixed(2)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{formatPrice(crypto.price)}</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>24h High:</span>
                      <span className="font-mono">{formatPrice(crypto.high24h)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>24h Low:</span>
                      <span className="font-mono">{formatPrice(crypto.low24h)}</span>
                    </div>
                  </div>
                  <div className="h-12 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={crypto.sparkline.slice(-24).map((price, i) => ({ price, time: i }))}>
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={crypto.change24h > 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedCrypto && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="TrendingUp" size={24} />
                    {selectedCrypto.name} ({selectedCrypto.symbol})
                  </CardTitle>
                  <CardDescription>
                    Динамика цены за 24 часа • Vol: {formatVolume(selectedCrypto.volume)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="price" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="price">Цена</TabsTrigger>
                      <TabsTrigger value="volume">Объём</TabsTrigger>
                    </TabsList>
                    <TabsContent value="price" className="mt-4">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="time" 
                              stroke="hsl(var(--muted-foreground))"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                              stroke="hsl(var(--muted-foreground))"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => `$${value.toFixed(0)}`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem',
                                color: 'hsl(var(--foreground))'
                              }}
                              formatter={(value: any) => [formatPrice(value), 'Цена']}
                            />
                            <Area
                              type="monotone"
                              dataKey="price"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorPrice)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </TabsContent>
                    <TabsContent value="volume" className="mt-4">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="time" 
                              stroke="hsl(var(--muted-foreground))"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                              stroke="hsl(var(--muted-foreground))"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => formatVolume(value)}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem',
                                color: 'hsl(var(--foreground))'
                              }}
                              formatter={(value: any) => [formatVolume(value), 'Объём']}
                            />
                            <Bar dataKey="volume" fill="hsl(var(--secondary))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon name="LineChart" size={20} />
                      Технические индикаторы
                    </CardTitle>
                    <CardDescription>Анализ {selectedCrypto.symbol}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getIndicators(selectedCrypto).map((indicator) => (
                        <div key={indicator.name} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm text-muted-foreground">{indicator.name}</p>
                            <p className="text-xl font-bold text-foreground">
                              {indicator.name === 'Price' || indicator.name.startsWith('MA') 
                                ? formatPrice(indicator.value)
                                : indicator.value.toFixed(2)}
                            </p>
                          </div>
                          <Badge
                            variant={indicator.status === 'bullish' ? 'default' : indicator.status === 'bearish' ? 'destructive' : 'secondary'}
                            className={indicator.status === 'bullish' ? 'bg-success' : ''}
                          >
                            {indicator.status === 'bullish' && <Icon name="TrendingUp" size={16} className="mr-1" />}
                            {indicator.status === 'bearish' && <Icon name="TrendingDown" size={16} className="mr-1" />}
                            {indicator.status === 'neutral' && <Icon name="Minus" size={16} className="mr-1" />}
                            {indicator.status === 'overbought' && '🔥'}
                            {indicator.status === 'oversold' && '❄️'}
                            {indicator.status.charAt(0).toUpperCase() + indicator.status.slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon name="Info" size={20} />
                      Рыночные данные
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Market Cap</span>
                        <span className="font-mono font-medium">{formatVolume(selectedCrypto.marketCap)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">24h Volume</span>
                        <span className="font-mono font-medium">{formatVolume(selectedCrypto.volume)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">24h High</span>
                        <span className="font-mono font-medium text-success">{formatPrice(selectedCrypto.high24h)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">24h Low</span>
                        <span className="font-mono font-medium text-destructive">{formatPrice(selectedCrypto.low24h)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Wallet" size={24} />
                  Сводка по рынку
                </CardTitle>
                <CardDescription>Агрегированная статистика портфеля</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Icon name="DollarSign" size={32} className="mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Общий Market Cap</p>
                    <p className="text-2xl font-bold mt-1">
                      {formatVolume(cryptoData.reduce((sum, c) => sum + c.marketCap, 0))}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Icon name="TrendingUp" size={32} className="mx-auto mb-2 text-success" />
                    <p className="text-sm text-muted-foreground">Средний рост</p>
                    <p className="text-2xl font-bold text-success mt-1">
                      +{(cryptoData.reduce((sum, c) => sum + c.change24h, 0) / cryptoData.length).toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Icon name="BarChart3" size={32} className="mx-auto mb-2 text-secondary" />
                    <p className="text-sm text-muted-foreground">Общий объём</p>
                    <p className="text-2xl font-bold text-secondary mt-1">
                      {formatVolume(cryptoData.reduce((sum, c) => sum + c.volume, 0))}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Icon name="Coins" size={32} className="mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Активов</p>
                    <p className="text-2xl font-bold mt-1">{cryptoData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
