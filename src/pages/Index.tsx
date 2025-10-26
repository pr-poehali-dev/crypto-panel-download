import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  change7d?: number;
  change30d?: number;
  volume: number;
  marketCap: number;
  sparkline: number[];
  high24h: number;
  low24h: number;
  rank: number;
}

interface ChartDataPoint {
  time: string;
  price: number;
  volume?: number;
}

interface PriceAlert {
  id: string;
  cryptoId: string;
  cryptoName: string;
  targetPrice: number;
  condition: 'above' | 'below';
  active: boolean;
}

const Index = () => {
  const [allCryptoData, setAllCryptoData] = useState<CryptoData[]>([]);
  const [filteredData, setFilteredData] = useState<CryptoData[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [sortBy, setSortBy] = useState<'rank' | 'volume' | 'gainers' | 'losers'>('rank');
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({ cryptoId: '', targetPrice: 0, condition: 'above' as 'above' | 'below' });
  const { toast } = useToast();

  const fetchCryptoData = async () => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h,7d,30d`
      );
      
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      
      const formattedData: CryptoData[] = data.map((coin: any) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h || 0,
        change7d: coin.price_change_percentage_7d_in_currency || 0,
        change30d: coin.price_change_percentage_30d_in_currency || 0,
        volume: coin.total_volume,
        marketCap: coin.market_cap,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        rank: coin.market_cap_rank || 999,
        sparkline: coin.sparkline_in_7d?.price?.slice(-24) || []
      }));

      setAllCryptoData(formattedData);
      setFilteredData(formattedData);
      
      if (!selectedCrypto && formattedData.length > 0) {
        setSelectedCrypto(formattedData[0]);
      }
      
      checkPriceAlerts(formattedData);
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

  const fetchChartData = async (coinId: string, days: number = 1) => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${days === 1 ? 'hourly' : 'daily'}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch chart data');
      
      const data = await response.json();
      
      const formattedChartData: ChartDataPoint[] = data.prices.map((item: [number, number], index: number) => ({
        time: new Date(item[0]).toLocaleDateString('ru-RU', { 
          month: 'short', 
          day: 'numeric',
          ...(days === 1 && { hour: '2-digit', minute: '2-digit' })
        }),
        price: item[1],
        volume: data.total_volumes[index]?.[1] || 0
      }));

      setChartData(formattedChartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const checkPriceAlerts = (data: CryptoData[]) => {
    priceAlerts.forEach(alert => {
      if (!alert.active) return;
      
      const crypto = data.find(c => c.id === alert.cryptoId);
      if (!crypto) return;

      const triggered = alert.condition === 'above' 
        ? crypto.price >= alert.targetPrice
        : crypto.price <= alert.targetPrice;

      if (triggered) {
        toast({
          title: `🔔 Ценовое уведомление: ${alert.cryptoName}`,
          description: `Цена ${crypto.price.toFixed(2)} ${alert.condition === 'above' ? 'выше' : 'ниже'} целевой ${alert.targetPrice}`,
        });
        
        setPriceAlerts(prev => 
          prev.map(a => a.id === alert.id ? { ...a, active: false } : a)
        );
      }
    });
  };

  const addPriceAlert = () => {
    const crypto = allCryptoData.find(c => c.id === newAlert.cryptoId);
    if (!crypto || newAlert.targetPrice <= 0) return;

    const alert: PriceAlert = {
      id: Date.now().toString(),
      cryptoId: crypto.id,
      cryptoName: crypto.name,
      targetPrice: newAlert.targetPrice,
      condition: newAlert.condition,
      active: true
    };

    setPriceAlerts(prev => [...prev, alert]);
    toast({
      title: "Уведомление создано",
      description: `Вы получите уведомление когда ${crypto.name} ${newAlert.condition === 'above' ? 'поднимется выше' : 'упадёт ниже'} $${newAlert.targetPrice}`
    });

    setAlertDialogOpen(false);
    setNewAlert({ cryptoId: '', targetPrice: 0, condition: 'above' });
  };

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCrypto) {
      const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
      fetchChartData(selectedCrypto.id, days);
    }
  }, [selectedCrypto, timeRange]);

  useEffect(() => {
    let filtered = [...allCryptoData];

    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch(sortBy) {
      case 'volume':
        filtered.sort((a, b) => b.volume - a.volume);
        break;
      case 'gainers':
        filtered.sort((a, b) => b.change24h - a.change24h);
        break;
      case 'losers':
        filtered.sort((a, b) => a.change24h - b.change24h);
        break;
      default:
        filtered.sort((a, b) => a.rank - b.rank);
    }

    setFilteredData(filtered);
  }, [searchQuery, sortBy, allCryptoData]);

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

  const getTopGainers = () => allCryptoData.slice().sort((a, b) => b.change24h - a.change24h).slice(0, 10);
  const getTopLosers = () => allCryptoData.slice().sort((a, b) => a.change24h - b.change24h).slice(0, 10);
  const getTopVolume = () => allCryptoData.slice().sort((a, b) => b.volume - a.volume).slice(0, 10);

  const getChangeForTimeRange = (crypto: CryptoData) => {
    switch(timeRange) {
      case '7d': return crypto.change7d || 0;
      case '30d': return crypto.change30d || 0;
      default: return crypto.change24h;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Icon name="Loader2" size={48} className="animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Загрузка 250+ криптовалют...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold crypto-gradient bg-clip-text text-transparent">
              Crypto Dashboard Pro
            </h1>
            <p className="text-muted-foreground mt-1">
              250+ криптовалют • Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Icon name="Bell" size={16} className="mr-2" />
                  Уведомления ({priceAlerts.filter(a => a.active).length})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Настройка ценовых уведомлений</DialogTitle>
                  <DialogDescription>Получайте уведомления при достижении целевых цен</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Select value={newAlert.cryptoId} onValueChange={(v) => setNewAlert({...newAlert, cryptoId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите криптовалюту" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCryptoData.slice(0, 50).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.symbol}) - {formatPrice(c.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Input 
                    type="number" 
                    placeholder="Целевая цена (USD)"
                    value={newAlert.targetPrice || ''}
                    onChange={(e) => setNewAlert({...newAlert, targetPrice: parseFloat(e.target.value)})}
                  />

                  <Select value={newAlert.condition} onValueChange={(v: any) => setNewAlert({...newAlert, condition: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Поднимется выше</SelectItem>
                      <SelectItem value="below">Упадёт ниже</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button onClick={addPriceAlert} className="w-full">Создать уведомление</Button>

                  {priceAlerts.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-sm font-medium">Активные уведомления:</p>
                      {priceAlerts.filter(a => a.active).map(alert => (
                        <div key={alert.id} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                          <span>{alert.cryptoName} {alert.condition === 'above' ? '>' : '<'} ${alert.targetPrice}</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setPriceAlerts(prev => prev.filter(a => a.id !== alert.id))}
                          >
                            <Icon name="X" size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="md:col-span-2 lg:col-span-4">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>Рынки криптовалют</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Input 
                    placeholder="🔍 Поиск..."
                    className="w-full md:w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rank">По рейтингу</SelectItem>
                      <SelectItem value="volume">По объёму</SelectItem>
                      <SelectItem value="gainers">Топ рост</SelectItem>
                      <SelectItem value="losers">Топ падение</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-2">
                {filteredData.slice(0, 100).map((crypto, index) => (
                  <Card
                    key={crypto.id}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      selectedCrypto?.id === crypto.id ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''
                    }`}
                    onClick={() => setSelectedCrypto(crypto)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm truncate">#{crypto.rank} {crypto.name}</CardTitle>
                          <CardDescription className="text-xs font-mono font-bold">{crypto.symbol}</CardDescription>
                        </div>
                        <Badge
                          variant={crypto.change24h > 0 ? 'default' : 'destructive'}
                          className={`${crypto.change24h > 0 ? 'bg-success' : ''} text-xs`}
                        >
                          {crypto.change24h > 0 ? '↗' : '↘'} {Math.abs(crypto.change24h).toFixed(1)}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-lg font-bold truncate">{formatPrice(crypto.price)}</p>
                      <p className="text-xs text-muted-foreground">Vol: {formatVolume(crypto.volume)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="gainers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gainers">🚀 Топ рост</TabsTrigger>
            <TabsTrigger value="losers">📉 Топ падение</TabsTrigger>
            <TabsTrigger value="volume">📊 Топ объём</TabsTrigger>
          </TabsList>
          
          <TabsContent value="gainers">
            <Card>
              <CardHeader>
                <CardTitle>Лидеры роста за 24 часа</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Изменение 24ч</TableHead>
                      <TableHead>Market Cap</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getTopGainers().map((crypto, i) => (
                      <TableRow key={crypto.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedCrypto(crypto)}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          {crypto.name} <span className="text-muted-foreground text-xs">({crypto.symbol})</span>
                        </TableCell>
                        <TableCell className="font-mono">{formatPrice(crypto.price)}</TableCell>
                        <TableCell>
                          <Badge className="bg-success">↗ {crypto.change24h.toFixed(2)}%</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{formatVolume(crypto.marketCap)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="losers">
            <Card>
              <CardHeader>
                <CardTitle>Лидеры падения за 24 часа</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Изменение 24ч</TableHead>
                      <TableHead>Market Cap</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getTopLosers().map((crypto, i) => (
                      <TableRow key={crypto.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedCrypto(crypto)}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          {crypto.name} <span className="text-muted-foreground text-xs">({crypto.symbol})</span>
                        </TableCell>
                        <TableCell className="font-mono">{formatPrice(crypto.price)}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">↘ {crypto.change24h.toFixed(2)}%</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{formatVolume(crypto.marketCap)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="volume">
            <Card>
              <CardHeader>
                <CardTitle>Максимальный объём торгов за 24 часа</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Объём 24ч</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Market Cap</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getTopVolume().map((crypto, i) => (
                      <TableRow key={crypto.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedCrypto(crypto)}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          {crypto.name} <span className="text-muted-foreground text-xs">({crypto.symbol})</span>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-secondary">{formatVolume(crypto.volume)}</TableCell>
                        <TableCell className="font-mono">{formatPrice(crypto.price)}</TableCell>
                        <TableCell className="font-mono">{formatVolume(crypto.marketCap)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedCrypto && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 animate-fade-in">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Icon name="TrendingUp" size={24} />
                      {selectedCrypto.name} ({selectedCrypto.symbol})
                    </CardTitle>
                    <CardDescription>
                      Vol: {formatVolume(selectedCrypto.volume)} • MCap: {formatVolume(selectedCrypto.marketCap)}
                    </CardDescription>
                  </div>
                  <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 часа</SelectItem>
                      <SelectItem value="7d">7 дней</SelectItem>
                      <SelectItem value="30d">30 дней</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="price" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="price">График цены</TabsTrigger>
                    <TabsTrigger value="volume">График объёма</TabsTrigger>
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
                    <Icon name="Info" size={20} />
                    Детальная информация
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Текущая цена</span>
                      <span className="font-mono font-bold text-lg">{formatPrice(selectedCrypto.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Изменение 24ч</span>
                      <Badge variant={selectedCrypto.change24h > 0 ? 'default' : 'destructive'} 
                             className={selectedCrypto.change24h > 0 ? 'bg-success' : ''}>
                        {selectedCrypto.change24h > 0 ? '+' : ''}{selectedCrypto.change24h.toFixed(2)}%
                      </Badge>
                    </div>
                    {selectedCrypto.change7d !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Изменение 7д</span>
                        <Badge variant={selectedCrypto.change7d > 0 ? 'default' : 'destructive'}
                               className={selectedCrypto.change7d > 0 ? 'bg-success' : ''}>
                          {selectedCrypto.change7d > 0 ? '+' : ''}{selectedCrypto.change7d.toFixed(2)}%
                        </Badge>
                      </div>
                    )}
                    {selectedCrypto.change30d !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Изменение 30д</span>
                        <Badge variant={selectedCrypto.change30d > 0 ? 'default' : 'destructive'}
                               className={selectedCrypto.change30d > 0 ? 'bg-success' : ''}>
                          {selectedCrypto.change30d > 0 ? '+' : ''}{selectedCrypto.change30d.toFixed(2)}%
                        </Badge>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Market Cap</span>
                      <span className="font-mono font-medium">{formatVolume(selectedCrypto.marketCap)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Объём 24ч</span>
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
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Рейтинг</span>
                      <Badge variant="outline">#{selectedCrypto.rank}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
