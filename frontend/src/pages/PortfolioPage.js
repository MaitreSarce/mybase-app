import { useState, useEffect } from 'react';
import { portfolioApi, cryptoApi, transactionsApi, snapshotsApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Plus, MoreVertical, Pencil, Trash2, TrendingUp, Loader2,
  Bitcoin, Building, LineChart, ArrowUpRight, ArrowDownRight,
  Wallet, X, RefreshCw, Camera, ArrowRightLeft
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, AreaChart, Area
} from 'recharts';

const ASSET_TYPES = [
  { value: 'crypto', label: 'Crypto', icon: Bitcoin, color: 'text-amber-400', bgColor: 'bg-amber-500' },
  { value: 'stock', label: 'Actions', icon: LineChart, color: 'text-blue-400', bgColor: 'bg-blue-500' },
  { value: 'real_estate', label: 'Immobilier', icon: Building, color: 'text-emerald-400', bgColor: 'bg-emerald-500' },
  { value: 'other', label: 'Autre', icon: Wallet, color: 'text-violet-400', bgColor: 'bg-violet-500' },
];

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

const PortfolioPage = () => {
  const [assets, setAssets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    name: '', asset_type: 'crypto', symbol: '', quantity: '',
    purchase_price: '', purchase_date: '', currency: 'EUR',
    current_price: '', tags: [], notes: ''
  });
  const [txForm, setTxForm] = useState({
    asset_id: '', transaction_type: 'buy', quantity: '',
    price_per_unit: '', date: '', fees: '', notes: ''
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [assetsRes, txRes, snapRes] = await Promise.all([
        portfolioApi.getAll(),
        transactionsApi.getAll(),
        snapshotsApi.getAll(12)
      ]);
      setAssets(assetsRes.data);
      setTransactions(txRes.data);
      setSnapshots(snapRes.data);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const response = await cryptoApi.refreshPortfolioPrices();
      toast.success(response.data.message || 'Prix mis à jour');
      fetchAll();
    } catch { toast.error('Erreur lors de la mise à jour des prix'); }
    finally { setRefreshing(false); }
  };

  const handleSnapshot = async () => {
    setSnapshotting(true);
    try {
      await snapshotsApi.create();
      toast.success('Snapshot enregistré');
      fetchAll();
    } catch { toast.error('Erreur'); }
    finally { setSnapshotting(false); }
  };

  const handleOpenDialog = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        name: asset.name, asset_type: asset.asset_type, symbol: asset.symbol || '',
        quantity: asset.quantity, purchase_price: asset.purchase_price,
        purchase_date: asset.purchase_date || '', currency: asset.currency || 'EUR',
        current_price: asset.current_price || '', tags: asset.tags || [], notes: asset.notes || ''
      });
    } else {
      setEditingAsset(null);
      setFormData({
        name: '', asset_type: 'crypto', symbol: '', quantity: '',
        purchase_price: '', purchase_date: '', currency: 'EUR',
        current_price: '', tags: [], notes: ''
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
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (asset) => {
    if (!window.confirm(`Supprimer "${asset.name}" ?`)) return;
    try {
      await portfolioApi.delete(asset.id);
      toast.success('Actif supprimé');
      fetchAll();
    } catch { toast.error('Erreur'); }
  };

  const handleSubmitTx = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await transactionsApi.create({
        ...txForm,
        quantity: parseFloat(txForm.quantity),
        price_per_unit: parseFloat(txForm.price_per_unit),
        fees: txForm.fees ? parseFloat(txForm.fees) : 0
      });
      toast.success('Transaction enregistrée');
      setTxDialogOpen(false);
      setTxForm({ asset_id: '', transaction_type: 'buy', quantity: '', price_per_unit: '', date: '', fees: '', notes: '' });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDeleteTx = async (tx) => {
    if (!window.confirm('Supprimer cette transaction ?')) return;
    try {
      await transactionsApi.delete(tx.id);
      toast.success('Transaction supprimée');
      fetchAll();
    } catch { toast.error('Erreur'); }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };
  const removeTag = (t) => setFormData({ ...formData, tags: formData.tags.filter(x => x !== t) });

  const fmt = (value, cur = 'EUR') => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  };

  const getTypeInfo = (type) => ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[3];

  const filteredAssets = assets.filter(a => filterType === 'all' || a.asset_type === filterType);

  const stats = (() => {
    const s = { totalInvested: 0, totalCurrent: 0, byType: {} };
    const target = filterType === 'all' ? assets : filteredAssets;
    target.forEach(a => {
      const inv = a.purchase_price * a.quantity;
      const cur = (a.current_price || a.purchase_price) * a.quantity;
      s.totalInvested += inv;
      s.totalCurrent += cur;
      if (!s.byType[a.asset_type]) s.byType[a.asset_type] = { invested: 0, current: 0 };
      s.byType[a.asset_type].invested += inv;
      s.byType[a.asset_type].current += cur;
    });
    s.totalGain = s.totalCurrent - s.totalInvested;
    s.gainPercent = s.totalInvested > 0 ? ((s.totalGain / s.totalInvested) * 100).toFixed(2) : 0;
    return s;
  })();

  const pieData = ASSET_TYPES.map((type, i) => ({
    name: type.label, value: stats.byType[type.value]?.current || 0, color: CHART_COLORS[i]
  })).filter(d => d.value > 0);

  const barData = ASSET_TYPES.map(type => ({
    name: type.label, investi: stats.byType[type.value]?.invested || 0, actuel: stats.byType[type.value]?.current || 0
  })).filter(d => d.investi > 0 || d.actuel > 0);

  const evolutionData = snapshots.map(s => ({
    date: s.date, total: Math.round(s.total_value),
    ...Object.fromEntries(Object.entries(s.by_type || {}).map(([k, v]) => [k, Math.round(v)]))
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="portfolio-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portefeuille</h1>
          <p className="text-muted-foreground mt-1">Suivez vos investissements</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSnapshot} disabled={snapshotting} data-testid="snapshot-btn">
            {snapshotting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
            Snapshot
          </Button>
          <Button variant="outline" onClick={handleRefreshPrices} disabled={refreshing} data-testid="refresh-prices-btn">
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Actualiser
          </Button>
          <Button variant="outline" onClick={() => setTxDialogOpen(true)} data-testid="add-transaction-btn">
            <ArrowRightLeft className="h-4 w-4 mr-2" />Transaction
          </Button>
          <Button onClick={() => handleOpenDialog()} data-testid="add-asset-btn">
            <Plus className="h-4 w-4 mr-2" />Nouvel actif
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border" data-testid="total-invested-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total investi</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">{fmt(stats.totalInvested)}</p></CardContent>
        </Card>
        <Card className="bg-card border-border" data-testid="total-current-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valeur actuelle</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">{fmt(stats.totalCurrent)}</p></CardContent>
        </Card>
        <Card className="bg-card border-border" data-testid="total-gain-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gain/Perte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {stats.totalGain >= 0 ? <ArrowUpRight className="h-5 w-5 text-emerald-400" /> : <ArrowDownRight className="h-5 w-5 text-red-400" />}
              <p className={`text-2xl font-bold font-mono ${stats.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(stats.totalGain)}</p>
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

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]" data-testid="portfolio-filter-type">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {ASSET_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className={`h-4 w-4 ${type.color}`} />{type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets" data-testid="assets-tab">Actifs ({filteredAssets.length})</TabsTrigger>
          <TabsTrigger value="charts" data-testid="charts-tab">Graphiques</TabsTrigger>
          <TabsTrigger value="evolution" data-testid="evolution-tab">Évolution</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="transactions-tab">Transactions ({transactions.length})</TabsTrigger>
        </TabsList>

        {/* Assets Tab */}
        <TabsContent value="assets">
          {filteredAssets.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun actif</h3>
                <p className="text-sm text-muted-foreground mb-4">Ajoutez vos premiers investissements</p>
                <Button onClick={() => handleOpenDialog()} data-testid="empty-add-asset-btn">
                  <Plus className="h-4 w-4 mr-2" />Ajouter un actif
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map(asset => {
                const typeInfo = getTypeInfo(asset.asset_type);
                const invested = asset.purchase_price * asset.quantity;
                const current = (asset.current_price || asset.purchase_price) * asset.quantity;
                const gain = current - invested;
                const gainPct = invested > 0 ? ((gain / invested) * 100).toFixed(2) : 0;
                return (
                  <Card key={asset.id} className="bg-card border-border card-hover group cursor-pointer"
                    onClick={() => handleOpenDialog(asset)} data-testid={`asset-card-${asset.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-md ${typeInfo.bgColor}/20`}>
                          <typeInfo.icon className={`h-4 w-4 ${typeInfo.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{asset.name}</CardTitle>
                          {asset.symbol && <Badge variant="outline" className="mt-1 font-mono text-xs">{asset.symbol}</Badge>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setTxForm({...txForm, asset_id: asset.id}); setTxDialogOpen(true); }}>
                            <ArrowRightLeft className="h-4 w-4 mr-2" />Transaction
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDialog(asset)}>
                            <Pencil className="h-4 w-4 mr-2" />Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(asset)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />Supprimer
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
                          <span className="font-mono">{fmt(asset.purchase_price)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Prix actuel</span>
                          <span className="font-mono">{asset.current_price ? fmt(asset.current_price) : '-'}</span>
                        </div>
                        <div className="border-t border-border pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Valeur</span>
                            <span className="font-mono font-bold">{fmt(current)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-muted-foreground">P&L</span>
                            <div className="flex items-center gap-1">
                              {gain >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-400" /> : <ArrowDownRight className="h-4 w-4 text-red-400" />}
                              <span className={`font-mono font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {gain >= 0 ? '+' : ''}{gainPct}%
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
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts">
          {assets.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border" data-testid="allocation-chart">
                <CardHeader><CardTitle className="text-lg">Allocation</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={v => fmt(v)} contentStyle={{ backgroundColor: 'hsl(240 6% 10%)', border: '1px solid hsl(240 4% 16%)', borderRadius: '8px', color: '#fafafa' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border" data-testid="comparison-chart">
                <CardHeader><CardTitle className="text-lg">Investi vs Actuel</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <XAxis dataKey="name" tick={{ fill: '#a1a1aa' }} />
                        <YAxis tick={{ fill: '#a1a1aa' }} />
                        <Tooltip formatter={v => fmt(v)} contentStyle={{ backgroundColor: 'hsl(240 6% 10%)', border: '1px solid hsl(240 4% 16%)', borderRadius: '8px', color: '#fafafa' }} />
                        <Legend />
                        <Bar dataKey="investi" name="Investi" fill="#6b7280" />
                        <Bar dataKey="actuel" name="Actuel" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Ajoutez des actifs pour voir les graphiques</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Evolution Tab */}
        <TabsContent value="evolution">
          {evolutionData.length > 1 ? (
            <Card className="bg-card border-border" data-testid="evolution-chart">
              <CardHeader>
                <CardTitle className="text-lg">Évolution de la valeur du portefeuille</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData}>
                      <defs>
                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#a1a1aa' }} />
                      <Tooltip formatter={v => fmt(v)} contentStyle={{ backgroundColor: 'hsl(240 6% 10%)', border: '1px solid hsl(240 4% 16%)', borderRadius: '8px', color: '#fafafa' }} />
                      <Area type="monotone" dataKey="total" name="Total" stroke="#10b981" fill="url(#gradTotal)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Utilisez le bouton "Snapshot" pour enregistrer la valeur actuelle
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Pas assez de données</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Créez des snapshots régulièrement pour voir l'évolution
                </p>
                <Button variant="outline" onClick={handleSnapshot} disabled={snapshotting}>
                  <Camera className="h-4 w-4 mr-2" />Créer un snapshot
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          {transactions.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune transaction</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enregistrez vos achats et ventes pour suivre la plus-value
                </p>
                <Button onClick={() => setTxDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Ajouter une transaction
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <Card key={tx.id} className="bg-card border-border card-hover" data-testid={`tx-card-${tx.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant={tx.transaction_type === 'buy' ? 'default' : 'secondary'}
                          className={tx.transaction_type === 'buy' ? 'bg-emerald-600' : 'bg-red-600'}>
                          {tx.transaction_type === 'buy' ? 'Achat' : 'Vente'}
                        </Badge>
                        <div>
                          <p className="font-medium">{tx.asset_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.quantity} x {fmt(tx.price_per_unit)} = {fmt(tx.total)}
                            {tx.fees > 0 && ` (frais: ${fmt(tx.fees)})`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{tx.date}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTx(tx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Asset Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingAsset ? "Modifier l'actif" : 'Nouvel actif'}</DialogTitle>
              <DialogDescription>Ajoutez un actif à votre portefeuille</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Bitcoin, Apple" required data-testid="asset-name-input" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.asset_type} onValueChange={v => setFormData({...formData, asset_type: v})}>
                    <SelectTrigger data-testid="asset-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2"><t.icon className={`h-4 w-4 ${t.color}`} />{t.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbole</Label>
                  <Input id="symbol" value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                    placeholder="BTC, AAPL" data-testid="asset-symbol-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantité *</Label>
                  <Input id="quantity" type="number" step="any" value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: e.target.value})} required data-testid="asset-quantity-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Prix d'achat unitaire *</Label>
                  <Input id="purchase_price" type="number" step="0.01" value={formData.purchase_price}
                    onChange={e => setFormData({...formData, purchase_price: e.target.value})} required data-testid="asset-purchase-price-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_price">Prix actuel unitaire</Label>
                  <Input id="current_price" type="number" step="0.01" value={formData.current_price}
                    onChange={e => setFormData({...formData, current_price: e.target.value})} data-testid="asset-current-price-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Date d'achat</Label>
                  <Input id="purchase_date" type="date" value={formData.purchase_date}
                    onChange={e => setFormData({...formData, purchase_date: e.target.value})} data-testid="asset-purchase-date-input" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="Notes..." data-testid="asset-notes-input" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input value={newTag} onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Ajouter un tag..." data-testid="asset-tag-input" />
                    <Button type="button" variant="secondary" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}<X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="asset-submit-btn">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingAsset ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmitTx}>
            <DialogHeader>
              <DialogTitle>Nouvelle transaction</DialogTitle>
              <DialogDescription>Enregistrez un achat ou une vente</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Actif *</Label>
                <Select value={txForm.asset_id} onValueChange={v => setTxForm({...txForm, asset_id: v})}>
                  <SelectTrigger data-testid="tx-asset-select"><SelectValue placeholder="Sélectionner un actif" /></SelectTrigger>
                  <SelectContent>
                    {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.symbol || a.asset_type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={txForm.transaction_type} onValueChange={v => setTxForm({...txForm, transaction_type: v})}>
                    <SelectTrigger data-testid="tx-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Achat</SelectItem>
                      <SelectItem value="sell">Vente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantité *</Label>
                  <Input type="number" step="any" value={txForm.quantity}
                    onChange={e => setTxForm({...txForm, quantity: e.target.value})} required data-testid="tx-quantity-input" />
                </div>
                <div className="space-y-2">
                  <Label>Prix unitaire *</Label>
                  <Input type="number" step="0.01" value={txForm.price_per_unit}
                    onChange={e => setTxForm({...txForm, price_per_unit: e.target.value})} required data-testid="tx-price-input" />
                </div>
                <div className="space-y-2">
                  <Label>Frais</Label>
                  <Input type="number" step="0.01" value={txForm.fees}
                    onChange={e => setTxForm({...txForm, fees: e.target.value})} data-testid="tx-fees-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={txForm.date}
                  onChange={e => setTxForm({...txForm, date: e.target.value})} data-testid="tx-date-input" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={txForm.notes} onChange={e => setTxForm({...txForm, notes: e.target.value})}
                  placeholder="Notes..." data-testid="tx-notes-input" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTxDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving || !txForm.asset_id} data-testid="tx-submit-btn">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortfolioPage;
