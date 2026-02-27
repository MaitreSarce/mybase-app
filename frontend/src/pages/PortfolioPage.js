import { useState, useEffect } from 'react';
import { portfolioApi, cryptoApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  TrendingUp, 
  Loader2,
  Bitcoin,
  Building,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  X,
  Tag,
  RefreshCw
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const ASSET_TYPES = [
  { value: 'crypto', label: 'Crypto', icon: Bitcoin, color: 'text-amber-400', bgColor: 'bg-amber-500' },
  { value: 'stock', label: 'Actions', icon: LineChart, color: 'text-blue-400', bgColor: 'bg-blue-500' },
  { value: 'real_estate', label: 'Immobilier', icon: Building, color: 'text-emerald-400', bgColor: 'bg-emerald-500' },
  { value: 'other', label: 'Autre', icon: Wallet, color: 'text-violet-400', bgColor: 'bg-violet-500' },
];

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

const PortfolioPage = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    asset_type: 'crypto',
    symbol: '',
    quantity: '',
    purchase_price: '',
    purchase_date: '',
    currency: 'EUR',
    current_price: '',
    tags: [],
    notes: ''
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await portfolioApi.getAll();
      setAssets(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const response = await cryptoApi.refreshPortfolioPrices();
      toast.success(response.data.message || 'Prix mis à jour');
      fetchAssets();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des prix');
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenDialog = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        name: asset.name,
        asset_type: asset.asset_type,
        symbol: asset.symbol || '',
        quantity: asset.quantity,
        purchase_price: asset.purchase_price,
        purchase_date: asset.purchase_date || '',
        currency: asset.currency || 'EUR',
        current_price: asset.current_price || '',
        tags: asset.tags || [],
        notes: asset.notes || ''
      });
    } else {
      setEditingAsset(null);
      setFormData({
        name: '',
        asset_type: 'crypto',
        symbol: '',
        quantity: '',
        purchase_price: '',
        purchase_date: '',
        currency: 'EUR',
        current_price: '',
        tags: [],
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const data = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      purchase_price: parseFloat(formData.purchase_price),
      current_price: formData.current_price ? parseFloat(formData.current_price) : null
    };
    
    try {
      if (editingAsset) {
        await portfolioApi.update(editingAsset.id, data);
        toast.success('Actif mis à jour');
      } else {
        await portfolioApi.create(data);
        toast.success('Actif ajouté');
      }
      setDialogOpen(false);
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (asset) => {
    if (!window.confirm(`Supprimer "${asset.name}" ?`)) return;
    
    try {
      await portfolioApi.delete(asset.id);
      toast.success('Actif supprimé');
      fetchAssets();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const formatCurrency = (value, currency = 'EUR') => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getTypeInfo = (type) => {
    return ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[3];
  };

  const filteredAssets = assets.filter(asset => {
    return filterType === 'all' || asset.asset_type === filterType;
  });

  // Calculate portfolio stats
  const calculateStats = () => {
    const stats = {
      totalInvested: 0,
      totalCurrent: 0,
      byType: {}
    };

    assets.forEach(asset => {
      const invested = asset.purchase_price * asset.quantity;
      const current = (asset.current_price || asset.purchase_price) * asset.quantity;
      
      stats.totalInvested += invested;
      stats.totalCurrent += current;
      
      if (!stats.byType[asset.asset_type]) {
        stats.byType[asset.asset_type] = { invested: 0, current: 0 };
      }
      stats.byType[asset.asset_type].invested += invested;
      stats.byType[asset.asset_type].current += current;
    });

    stats.totalGain = stats.totalCurrent - stats.totalInvested;
    stats.gainPercent = stats.totalInvested > 0 
      ? ((stats.totalGain / stats.totalInvested) * 100).toFixed(2)
      : 0;

    return stats;
  };

  const stats = calculateStats();

  // Prepare chart data
  const pieData = ASSET_TYPES.map((type, index) => ({
    name: type.label,
    value: stats.byType[type.value]?.current || 0,
    color: CHART_COLORS[index]
  })).filter(d => d.value > 0);

  const barData = ASSET_TYPES.map((type) => ({
    name: type.label,
    investi: stats.byType[type.value]?.invested || 0,
    actuel: stats.byType[type.value]?.current || 0
  })).filter(d => d.investi > 0 || d.actuel > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-24" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="portfolio-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portefeuille</h1>
          <p className="text-muted-foreground mt-1">Suivez vos investissements</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshPrices}
            disabled={refreshing}
            data-testid="refresh-prices-btn"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualiser les prix
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} data-testid="add-asset-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel actif
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingAsset ? 'Modifier l\'actif' : 'Nouvel actif'}</DialogTitle>
                <DialogDescription>
                  Ajoutez un actif à votre portefeuille
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="name">Nom *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Bitcoin, Apple, Appartement Paris"
                      required
                      data-testid="asset-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.asset_type}
                      onValueChange={(value) => setFormData({ ...formData, asset_type: value })}
                    >
                      <SelectTrigger data-testid="asset-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className={`h-4 w-4 ${type.color}`} />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbole</Label>
                    <Input
                      id="symbol"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                      placeholder="Ex: BTC, AAPL"
                      data-testid="asset-symbol-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantité *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="any"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                      required
                      data-testid="asset-quantity-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase_price">Prix d'achat unitaire (€) *</Label>
                    <Input
                      id="purchase_price"
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      placeholder="0.00"
                      required
                      data-testid="asset-purchase-price-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_price">Prix actuel unitaire (€)</Label>
                    <Input
                      id="current_price"
                      type="number"
                      step="0.01"
                      value={formData.current_price}
                      onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                      placeholder="0.00"
                      data-testid="asset-current-price-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase_date">Date d'achat</Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      data-testid="asset-purchase-date-input"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes sur cet actif..."
                      data-testid="asset-notes-input"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Ajouter un tag..."
                        data-testid="asset-tag-input"
                      />
                      <Button type="button" variant="secondary" onClick={addTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saving} data-testid="asset-submit-btn">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingAsset ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border" data-testid="total-invested-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total investi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{formatCurrency(stats.totalInvested)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border" data-testid="total-current-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valeur actuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{formatCurrency(stats.totalCurrent)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border" data-testid="total-gain-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gain/Perte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {stats.totalGain >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-400" />
              )}
              <p className={`text-2xl font-bold font-mono ${stats.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(stats.totalGain)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border" data-testid="gain-percent-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold font-mono ${stats.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.totalGain >= 0 ? '+' : ''}{stats.gainPercent}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {assets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border" data-testid="allocation-chart">
            <CardHeader>
              <CardTitle className="text-lg">Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border" data-testid="comparison-chart">
            <CardHeader>
              <CardTitle className="text-lg">Investi vs Actuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="investi" name="Investi" fill="#6b7280" />
                    <Bar dataKey="actuel" name="Actuel" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]" data-testid="portfolio-filter-type">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {ASSET_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className={`h-4 w-4 ${type.color}`} />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun actif</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ajoutez vos premiers investissements
            </p>
            <Button onClick={() => handleOpenDialog()} data-testid="empty-add-asset-btn">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un actif
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const typeInfo = getTypeInfo(asset.asset_type);
            const invested = asset.purchase_price * asset.quantity;
            const current = (asset.current_price || asset.purchase_price) * asset.quantity;
            const gain = current - invested;
            const gainPercent = invested > 0 ? ((gain / invested) * 100).toFixed(2) : 0;
            
            return (
              <Card
                key={asset.id}
                className="bg-card border-border card-hover group"
                data-testid={`asset-card-${asset.id}`}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-md ${typeInfo.bgColor}/20`}>
                      <typeInfo.icon className={`h-4 w-4 ${typeInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{asset.name}</CardTitle>
                      {asset.symbol && (
                        <Badge variant="outline" className="mt-1 font-mono text-xs">
                          {asset.symbol}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(asset)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(asset)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quantité</span>
                      <span className="font-mono">{asset.quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">PRU</span>
                      <span className="font-mono">{formatCurrency(asset.purchase_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prix actuel</span>
                      <span className="font-mono">
                        {asset.current_price ? formatCurrency(asset.current_price) : '-'}
                      </span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valeur</span>
                        <span className="font-mono font-bold">{formatCurrency(current)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-muted-foreground">P&L</span>
                        <div className="flex items-center gap-1">
                          {gain >= 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-400" />
                          )}
                          <span className={`font-mono font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {gain >= 0 ? '+' : ''}{gainPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
