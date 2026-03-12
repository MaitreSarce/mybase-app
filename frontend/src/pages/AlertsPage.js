import { useState, useEffect } from 'react';
import { alertsApi, portfolioApi, wishlistApi, inventoryApi, collectionsApi, projectsApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Switch } from '../components/ui/switch';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Bell, 
  Plus, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import ItemLinksManager from '../components/ItemLinksManager';

const ALERT_TYPES = [
  { value: 'target_price', label: 'Prix cible atteint', icon: Target },
  { value: 'price_change_up', label: 'Hausse de prix', icon: TrendingUp },
  { value: 'price_change_down', label: 'Baisse de prix', icon: TrendingDown },
];

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [editingAlertId, setEditingAlertId] = useState(null);
  const [collections, setCollections] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTag, setSelectedTag] = useState('__all');
  const [selectedCollection, setSelectedCollection] = useState('__all');
  const [selectedProject, setSelectedProject] = useState('__all');
  const [items, setItems] = useState({ portfolio: [], wishlist: [], inventory: [] });
  const [formData, setFormData] = useState({
    item_type: 'portfolio',
    item_id: '',
    alert_type: 'target_price',
    target_value: '',
    is_percentage: false,
    idealo_url: '',
    denicheur_url: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, portfolioRes, wishlistRes, inventoryRes, collectionsRes, projectsRes] = await Promise.all([
        alertsApi.getAll(),
        portfolioApi.getAll(),
        wishlistApi.getAll(),
        inventoryApi.getAll(),
        collectionsApi.getAll(),
        projectsApi.getAll()
      ]);
      setAlerts(alertsRes.data);
      setItems({
        portfolio: portfolioRes.data,
        wishlist: wishlistRes.data,
        inventory: inventoryRes.data
      });
      setCollections(Array.isArray(collectionsRes.data) ? collectionsRes.data : []);
      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const payload = {
        ...formData,
        target_value: parseFloat(formData.target_value),
        idealo_url: formData.idealo_url?.trim() || null,
        denicheur_url: formData.denicheur_url?.trim() || null,
      };

      if (editingAlertId) {
        await alertsApi.update(editingAlertId, {
          alert_type: payload.alert_type,
          target_value: payload.target_value,
          is_percentage: payload.is_percentage,
          idealo_url: payload.idealo_url,
          denicheur_url: payload.denicheur_url,
        });
        toast.success('Alerte mise a jour');
      } else {
        await alertsApi.create(payload);
        toast.success('Alerte creee');
      }

      setDialogOpen(false);
      setEditingAlertId(null);
      setFormData({
        item_type: 'portfolio',
        item_id: '',
        alert_type: 'target_price',
        target_value: '',
        is_percentage: false,
        idealo_url: '',
        denicheur_url: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (alert) => {
    if (!window.confirm(`Supprimer l'alerte pour "${alert.item_name}" ?`)) return;
    
    try {
      await alertsApi.delete(alert.id);
      toast.success('Alerte supprimee');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCheckAlerts = async () => {
    setChecking(true);
    try {
      const response = await alertsApi.check();
      if (response.data.triggered > 0) {
        toast.success(`${response.data.triggered} alerte(s) declenchee(s) !`);
      } else {
        toast.info('Aucune alerte declenchee');
      }
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la verification');
    } finally {
      setChecking(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getAlertTypeInfo = (type) => {
    return ALERT_TYPES.find(t => t.value === type) || ALERT_TYPES[0];
  };

  const getItemTypeLabel = (type) => {
    const labels = {
      portfolio: 'Portefeuille',
      wishlist: 'Liste de souhaits',
      inventory: 'Inventaire'
    };
    return labels[type] || type;
  };

  const renderStoreOffers = (alert) => {
    const offers = Array.isArray(alert?.store_offers) ? alert.store_offers : [];
    if (!offers.length) return null;

    return (
      <div className="mt-3 rounded-md border border-border/60 overflow-hidden">
        <div className="grid grid-cols-4 gap-2 px-2 py-1 text-xs font-medium bg-secondary/30">
          <span>Magasin</span>
          <span className="text-right">Prix</span>
          <span className="text-right">Frais port</span>
          <span className="text-right">Total</span>
        </div>
        {offers.map((offer, idx) => {
          const priceRaw = Number(offer?.price ?? offer?.item_price ?? offer?.amount);
          const shippingRaw = Number(offer?.shipping ?? offer?.shipping_cost ?? offer?.delivery_fee ?? 0);
          const hasPrice = Number.isFinite(priceRaw);
          const hasShipping = Number.isFinite(shippingRaw);
          const total = hasPrice ? (priceRaw + (hasShipping ? shippingRaw : 0)) : null;
          const storeName = offer?.store_name || offer?.store || `Magasin ${idx + 1}`;

          return (
            <div key={`${storeName}-${idx}`} className="grid grid-cols-4 gap-2 px-2 py-1 text-xs border-t border-border/40">
              <span className="truncate" title={storeName}>{storeName}</span>
              <span className="text-right">{hasPrice ? formatCurrency(priceRaw) : '-'}</span>
              <span className="text-right">{hasShipping ? formatCurrency(shippingRaw) : '-'}</span>
              <span className="text-right font-medium">{total !== null ? formatCurrency(total) : '-'}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const getOffersWithTotals = (alert) => {
    const offers = Array.isArray(alert?.store_offers) ? alert.store_offers : [];
    return offers
      .map((offer, index) => {
        const price = toNumber(offer?.price ?? offer?.item_price ?? offer?.amount);
        const shipping = toNumber(offer?.shipping ?? offer?.shipping_cost ?? offer?.delivery_fee ?? 0);
        const total = price !== null ? price + (shipping ?? 0) : null;
        return {
          id: `${offer?.store_name || offer?.store || 'store'}-${index}`,
          store: offer?.store_name || offer?.store || `Magasin ${index + 1}`,
          price,
          shipping,
          total,
        };
      })
      .filter((offer) => offer.total !== null)
      .sort((a, b) => a.total - b.total);
  };

  const getMinPriceTotal = (alert) => {
    const backendMin = toNumber(alert?.min_price_total);
    if (backendMin !== null) return backendMin;

    const totals = getOffersWithTotals(alert).map((offer) => offer.total).filter((v) => v !== null);
    if (totals.length) return Math.min(...totals);

    return toNumber(alert?.current_value);
  };

  const getHistoryData = (alert) => {
    const history = Array.isArray(alert?.min_price_history) ? alert.min_price_history : [];
    return history
      .map((entry, index) => {
        const value = toNumber(entry?.value);
        if (value === null) return null;
        const date = entry?.at ? new Date(entry.at) : null;
        const label = date && !Number.isNaN(date.getTime())
          ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          : `Point ${index + 1}`;
        return {
          label,
          value,
          fullDate: date && !Number.isNaN(date.getTime()) ? date.toLocaleString('fr-FR') : label,
        };
      })
      .filter(Boolean);
  };

  const openAlertDetail = (alert) => {
    setSelectedAlert(alert);
    setDetailOpen(true);
  };

  const openEditAlert = (alert) => {
    setEditingAlertId(alert.id);
    setFormData({
      item_type: alert.item_type || 'portfolio',
      item_id: alert.item_id || '',
      alert_type: alert.alert_type || 'target_price',
      target_value: String(alert.target_value ?? ''),
      is_percentage: !!alert.is_percentage,
      idealo_url: alert.idealo_url || '',
      denicheur_url: alert.denicheur_url || '',
    });
    setDialogOpen(true);
  };
  const getAlertItem = (alert) => {
    if (!alert?.item_type || !alert?.item_id) return null;
    const list = items?.[alert.item_type] || [];
    return list.find((item) => item.id === alert.item_id) || null;
  };

  const getItemTags = (item) => {
    if (!item || !Array.isArray(item.tags)) return [];
    return item.tags.filter(Boolean).map((tag) => String(tag).trim()).filter(Boolean);
  };

  const getItemCollectionId = (item) => {
    if (!item) return null;
    const id = item.collection_id || item.collectionId;
    return id ? String(id) : null;
  };

  const getItemProjectIds = (item) => {
    if (!item) return [];
    const ids = new Set();
    if (item.project_id) ids.add(String(item.project_id));
    if (Array.isArray(item.project_ids)) item.project_ids.forEach((id) => id && ids.add(String(id)));
    if (Array.isArray(item.links)) {
      item.links.forEach((link) => {
        if (link?.item_type === 'project' && link?.item_id) ids.add(String(link.item_id));
      });
    }
    return [...ids];
  };

  const collectionNameById = collections.reduce((acc, col) => {
    if (col?.id) acc[String(col.id)] = col.name || col.title || String(col.id);
    return acc;
  }, {});

  const projectNameById = projects.reduce((acc, project) => {
    if (project?.id) acc[String(project.id)] = project.name || project.title || String(project.id);
    return acc;
  }, {});

  const availableTags = [...new Set(alerts.flatMap((alert) => getItemTags(getAlertItem(alert))))]
    .sort((a, b) => a.localeCompare(b, 'fr'));

  const availableCollectionIds = [...new Set(
    alerts.map((alert) => getItemCollectionId(getAlertItem(alert))).filter(Boolean)
  )];

  const availableProjectIds = [...new Set(
    alerts.flatMap((alert) => getItemProjectIds(getAlertItem(alert)))
  )];

  const filteredAlerts = alerts.filter((alert) => {
    const item = getAlertItem(alert);
    const tags = getItemTags(item);
    const collectionId = getItemCollectionId(item);
    const projectIds = getItemProjectIds(item);

    if (selectedTag !== '__all' && !tags.includes(selectedTag)) return false;
    if (selectedCollection !== '__all' && collectionId !== selectedCollection) return false;
    if (selectedProject !== '__all' && !projectIds.includes(selectedProject)) return false;
    return true;
  });

  const buildPriceSearchUrls = (query) => {
    const raw = String(query || '').trim();
    if (!raw) return null;

    const q = encodeURIComponent(raw);

    return {
      // Endpoints adjusted to improve hit rate on FR comparators
      idealo: `https://www.idealo.fr/resultats.html?q=${q}`,
      denicheur: `https://ledenicheur.fr/recherche?search=${q}`,
      denicheurAlt: `https://ledenicheur.fr/search?search=${q}`,
      web: `https://www.google.com/search?tbm=shop&q=${q}`,
    };
  };

  const activeAlerts = filteredAlerts.filter(a => !a.triggered);
  const triggeredAlerts = filteredAlerts.filter(a => a.triggered);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="py-4">
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="alerts-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertes de prix</h1>
          <p className="text-muted-foreground mt-1">Soyez notifie quand un prix atteint votre cible</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCheckAlerts}
            disabled={checking}
            data-testid="check-alerts-btn"
          >
            {checking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Verifier
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-alert-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle alerte
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingAlertId ? 'Modifier alerte' : 'Nouvelle alerte'}</DialogTitle>
                  <DialogDescription>
                    {editingAlertId ? 'Modifiez cette alerte existante' : 'Configurez une alerte de prix pour un de vos items'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Type d'item</Label>
                    <Select
                      value={formData.item_type}
                      onValueChange={(value) => setFormData({ ...formData, item_type: value, item_id: '' })}
                    >
                      <SelectTrigger data-testid="alert-item-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portfolio">Portefeuille</SelectItem>
                        <SelectItem value="wishlist">Liste de souhaits</SelectItem>
                        <SelectItem value="inventory">Inventaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Select
                      value={formData.item_id}
                      onValueChange={(value) => setFormData({ ...formData, item_id: value })}
                    >
                      <SelectTrigger data-testid="alert-item-select">
                        <SelectValue placeholder="Selectionner un item..." />
                      </SelectTrigger>
                      <SelectContent>
                        {items[formData.item_type]?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name || item.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Type d'alerte</Label>
                    <Select
                      value={formData.alert_type}
                      onValueChange={(value) => setFormData({ ...formData, alert_type: value })}
                    >
                      <SelectTrigger data-testid="alert-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALERT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_value">
                      {formData.alert_type === 'target_price' 
                        ? 'Prix cible (EUR)' 
                        : formData.is_percentage 
                          ? 'Variation (%)' 
                          : 'Variation (EUR)'}
                    </Label>
                    <Input
                      id="target_value"
                      type="number"
                      step="0.01"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      placeholder="0.00"
                      required
                      data-testid="alert-target-value-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idealo_url">Lien produit Idealo (optionnel)</Label>
                    <Input
                      id="idealo_url"
                      type="url"
                      value={formData.idealo_url}
                      onChange={(e) => setFormData({ ...formData, idealo_url: e.target.value })}
                      placeholder="https://www.idealo.fr/prix/..."
                      data-testid="alert-idealo-url-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="denicheur_url">Lien produit LeDenicheur (optionnel)</Label>
                    <Input
                      id="denicheur_url"
                      type="url"
                      value={formData.denicheur_url}
                      onChange={(e) => setFormData({ ...formData, denicheur_url: e.target.value })}
                      placeholder="https://ledenicheur.fr/product.php?p=..."
                      data-testid="alert-denicheur-url-input"
                    />
                  </div>

                  {formData.alert_type !== 'target_price' && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_percentage"
                        checked={formData.is_percentage}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_percentage: checked })}
                      />
                      <Label htmlFor="is_percentage" className="cursor-pointer">
                        En pourcentage
                      </Label>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingAlertId(null); }}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving || !formData.item_id} data-testid="alert-submit-btn">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingAlertId ? 'Mettre a jour' : 'Creer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Tag</Label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger><SelectValue placeholder="Tous les tags" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Tous les tags</SelectItem>
                  {availableTags.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Collection</Label>
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger><SelectValue placeholder="Toutes les collections" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Toutes les collections</SelectItem>
                  {availableCollectionIds.map((id) => <SelectItem key={id} value={id}>{collectionNameById[id] || id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Projet</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger><SelectValue placeholder="Tous les projets" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Tous les projets</SelectItem>
                  {availableProjectIds.map((id) => <SelectItem key={id} value={id}>{projectNameById[id] || id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={() => { setSelectedTag('__all'); setSelectedCollection('__all'); setSelectedProject('__all'); }}>
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" data-testid="active-alerts-tab">
            <Clock className="h-4 w-4 mr-2" />
            En attente ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="triggered" data-testid="triggered-alerts-tab">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Declenchees ({triggeredAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeAlerts.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune alerte active</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Creez une alerte pour etre notifie des changements de prix
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => {
                const typeInfo = getAlertTypeInfo(alert.alert_type);
                return (
                  <Card key={alert.id} className="bg-card border-border" data-testid={`alert-card-${alert.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-md bg-amber-500/20">
                            <typeInfo.icon className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium">{alert.item_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{getItemTypeLabel(alert.item_type)}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {typeInfo.label}: {alert.is_percentage ? `${alert.target_value}%` : formatCurrency(alert.target_value)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Prix mini (fdp inclus): <span className="font-medium text-foreground">{formatCurrency(getMinPriceTotal(alert))}</span>
                            </div>
                            {(alert.idealo_url || alert.denicheur_url || buildPriceSearchUrls(alert.search_query || alert.item_name)) && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => window.open(alert.idealo_url || buildPriceSearchUrls(alert.search_query || alert.item_name).idealo, '_blank')}>
                                  <ExternalLink className="h-3 w-3 mr-1" /> Idealo
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => window.open(alert.denicheur_url || buildPriceSearchUrls(alert.search_query || alert.item_name).denicheur, '_blank')}>
                                  <ExternalLink className="h-3 w-3 mr-1" /> LeDenicheur
                                </Button>
                                {alert.source_url && (
                                  <Button type="button" size="sm" variant="outline" onClick={() => window.open(alert.source_url, '_blank')}>
                                    <ExternalLink className="h-3 w-3 mr-1" /> Produit
                                  </Button>
                                )}
                              </div>
                            )}
                            {renderStoreOffers(alert)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openAlertDetail(alert)}
                          >
                            Details
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditAlert(alert)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(alert)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="triggered">
          {triggeredAlerts.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune alerte declenchee</h3>
                <p className="text-sm text-muted-foreground">
                  Les alertes apparaitront ici quand elles seront declenchees
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {triggeredAlerts.map((alert) => {
                const typeInfo = getAlertTypeInfo(alert.alert_type);
                return (
                  <Card key={alert.id} className="bg-card border-border bg-emerald-500/5" data-testid={`triggered-alert-${alert.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-md bg-emerald-500/20">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-medium">{alert.item_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="badge-finance-up">Declenchee</Badge>
                              <span className="text-sm text-muted-foreground">
                                {typeInfo.label}: {formatCurrency(alert.current_value)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Prix mini (fdp inclus): <span className="font-medium text-foreground">{formatCurrency(getMinPriceTotal(alert))}</span>
                            </div>
                            {(alert.idealo_url || alert.denicheur_url || buildPriceSearchUrls(alert.search_query || alert.item_name)) && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => window.open(alert.idealo_url || buildPriceSearchUrls(alert.search_query || alert.item_name).idealo, '_blank')}>
                                  <ExternalLink className="h-3 w-3 mr-1" /> Idealo
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => window.open(alert.denicheur_url || buildPriceSearchUrls(alert.search_query || alert.item_name).denicheur, '_blank')}>
                                  <ExternalLink className="h-3 w-3 mr-1" /> LeDenicheur
                                </Button>
                                {alert.source_url && (
                                  <Button type="button" size="sm" variant="outline" onClick={() => window.open(alert.source_url, '_blank')}>
                                    <ExternalLink className="h-3 w-3 mr-1" /> Produit
                                  </Button>
                                )}
                              </div>
                            )}
                            {renderStoreOffers(alert)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openAlertDetail(alert)}
                          >
                            Details
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditAlert(alert)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(alert)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Details alerte</DialogTitle>
            <DialogDescription>
              {selectedAlert ? `Prix pour ${selectedAlert.item_name}` : 'Details'}
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-card border-border">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Prix mini (fdp inclus)</p>
                    <p className="text-lg font-semibold">{formatCurrency(getMinPriceTotal(selectedAlert))}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Valeur actuelle</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedAlert.current_value)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-lg font-semibold">{getItemTypeLabel(selectedAlert.item_type)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">Evolution du prix mini</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getHistoryData(selectedAlert)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="value" name="Prix mini" stroke="#22c55e" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">Liens</CardTitle>
                </CardHeader>
                <CardContent>
                  <ItemLinksManager
                    itemType="alert"
                    itemId={selectedAlert.id}
                    itemName={selectedAlert.item_name}
                    onUpdate={fetchData}
                  />
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">Offres marchands</CardTitle>
                </CardHeader>
                <CardContent>
                  {getOffersWithTotals(selectedAlert).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune offre disponible pour le moment.</p>
                  ) : (
                    <div className="rounded-md border border-border/60 overflow-hidden">
                      <div className="grid grid-cols-4 gap-2 px-2 py-2 text-xs font-medium bg-secondary/30">
                        <span>Marchand</span>
                        <span className="text-right">Prix</span>
                        <span className="text-right">Frais port</span>
                        <span className="text-right">Total</span>
                      </div>
                      {getOffersWithTotals(selectedAlert).map((offer) => (
                        <div key={offer.id} className="grid grid-cols-4 gap-2 px-2 py-2 text-xs border-t border-border/40">
                          <span className="truncate" title={offer.store}>{offer.store}</span>
                          <span className="text-right">{formatCurrency(offer.price)}</span>
                          <span className="text-right">{formatCurrency(offer.shipping ?? 0)}</span>
                          <span className="text-right font-medium">{formatCurrency(offer.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlertsPage;
























