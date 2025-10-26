import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  sparkline: number[];
}

const mockCryptoData: CryptoData[] = [
  {
    id: '1',
    name: 'Bitcoin',
    symbol: 'BTC',
    price: 43250.50,
    change24h: 2.45,
    volume: 28500000000,
    marketCap: 845000000000,
    sparkline: [42000, 42500, 41800, 43000, 43500, 43250]
  },
  {
    id: '2',
    name: 'Ethereum',
    symbol: 'ETH',
    price: 2280.75,
    change24h: -1.23,
    volume: 15200000000,
    marketCap: 274000000000,
    sparkline: [2300, 2290, 2250, 2270, 2260, 2280]
  },
  {
    id: '3',
    name: 'Solana',
    symbol: 'SOL',
    price: 98.45,
    change24h: 5.67,
    volume: 2400000000,
    marketCap: 42000000000,
    sparkline: [92, 94, 96, 97, 99, 98]
  },
  {
    id: '4',
    name: 'Cardano',
    symbol: 'ADA',
    price: 0.58,
    change24h: -0.45,
    volume: 580000000,
    marketCap: 20500000000,
    sparkline: [0.59, 0.585, 0.575, 0.582, 0.578, 0.58]
  }
];

const chartData = [
  { time: '00:00', BTC: 42000, ETH: 2300, SOL: 92 },
  { time: '04:00', BTC: 42500, ETH: 2290, SOL: 94 },
  { time: '08:00', BTC: 41800, ETH: 2250, SOL: 96 },
  { time: '12:00', BTC: 43000, ETH: 2270, SOL: 97 },
  { time: '16:00', BTC: 43500, ETH: 2260, SOL: 99 },
  { time: '20:00', BTC: 43250, ETH: 2280, SOL: 98 }
];

const indicatorsData = [
  { name: 'RSI', value: 68.5, status: 'neutral' },
  { name: 'MACD', value: 125.3, status: 'bullish' },
  { name: 'MA(50)', value: 42800, status: 'bullish' },
  { name: 'MA(200)', value: 40500, status: 'bullish' }
];

const Index = () => {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData>(mockCryptoData[0]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    return new Intl.NumberFormat('ru-RU', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(volume);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold crypto-gradient bg-clip-text text-transparent">
              Crypto Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Торговая панель криптовалют</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              <Icon name="Activity" size={16} className="mr-2" />
              Live
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          {mockCryptoData.map((crypto, index) => (
            <Card
              key={crypto.id}
              className={`cursor-pointer transition-all hover:scale-105 ${
                selectedCrypto.id === crypto.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedCrypto(crypto)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{crypto.name}</CardTitle>
                    <CardDescription className="text-sm font-mono">{crypto.symbol}</CardDescription>
                  </div>
                  <Badge
                    variant={crypto.change24h > 0 ? 'default' : 'destructive'}
                    className={crypto.change24h > 0 ? 'bg-success' : ''}
                  >
                    {crypto.change24h > 0 ? '+' : ''}{crypto.change24h}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{formatPrice(crypto.price)}</p>
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={crypto.sparkline.map((price, i) => ({ price, time: i }))}>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="TrendingUp" size={24} />
                График {selectedCrypto.name}
              </CardTitle>
              <CardDescription>Динамика цены за 24 часа</CardDescription>
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
                          <linearGradient id="colorBTC" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey={selectedCrypto.symbol}
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#colorBTC)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                <TabsContent value="volume" className="mt-4">
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Icon name="BarChart3" size={48} className="mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Объём торгов: {formatVolume(selectedCrypto.volume)}</p>
                    </div>
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
                <CardDescription>Анализ рынка {selectedCrypto.symbol}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {indicatorsData.map((indicator) => (
                    <div key={indicator.name} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{indicator.name}</p>
                        <p className="text-2xl font-bold text-primary">{indicator.value.toLocaleString()}</p>
                      </div>
                      <Badge
                        variant={indicator.status === 'bullish' ? 'default' : 'secondary'}
                        className={indicator.status === 'bullish' ? 'bg-success' : ''}
                      >
                        {indicator.status === 'bullish' ? (
                          <Icon name="TrendingUp" size={16} className="mr-1" />
                        ) : (
                          <Icon name="Minus" size={16} className="mr-1" />
                        )}
                        {indicator.status === 'bullish' ? 'Рост' : 'Нейтрально'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Newspaper" size={20} />
                  Лента новостей
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="pb-3 border-b border-border">
                    <p className="text-sm text-muted-foreground">5 мин назад</p>
                    <p className="font-medium">Bitcoin достиг отметки $43,000</p>
                  </div>
                  <div className="pb-3 border-b border-border">
                    <p className="text-sm text-muted-foreground">1 час назад</p>
                    <p className="font-medium">Solana показывает рост +5.67%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">3 часа назад</p>
                    <p className="font-medium">Объём торгов ETH превысил $15B</p>
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
              Обзор портфеля
            </CardTitle>
            <CardDescription>Статистика и аналитика активов</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Icon name="DollarSign" size={32} className="mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Общая стоимость</p>
                <p className="text-3xl font-bold mt-1">$125,450</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Icon name="TrendingUp" size={32} className="mx-auto mb-2 text-success" />
                <p className="text-sm text-muted-foreground">Прибыль за 24ч</p>
                <p className="text-3xl font-bold text-success mt-1">+$3,245</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Icon name="Percent" size={32} className="mx-auto mb-2 text-secondary" />
                <p className="text-sm text-muted-foreground">Доходность</p>
                <p className="text-3xl font-bold text-secondary mt-1">+2.65%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
