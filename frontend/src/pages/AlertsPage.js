import { useState, useEffect } from 'react';
import { alertsApi, portfolioApi, wishlistApi, inventoryApi } from '../services/api';
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
  RefreshCw
} from 'lucide-react';

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
  const [items, setItems] = useState({ portfolio: [], wishlist: [], inventory: [] });
  const [formData, setFormData] = useState({
    item_type: 'portfolio',
    item_id: '',
    alert_type: 'target_price',
    target_value: '',
    is_percentage: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, portfolioRes, wishlistRes, inventoryRes] = await Promise.all([
        alertsApi.getAll(),
        portfolioApi.getAll(),
        wishlistApi.getAll(),
        inventoryApi.getAll()
      ]);
      setAlerts(alertsRes.data);
      setItems({
        portfolio: portfolioRes.data,
        wishlist: wishlistRes.data,
        inventory: inventoryRes.data
      });
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
      await alertsApi.create({
        ...formData,
        target_value: parseFloat(formData.target_value)
      });
      toast.success('Alerte créée');
      setDialogOpen(false);
      setFormData({
        item_type: 'portfolio',
        item_id: '',
        alert_type: 'target_price',
        target_value: '',
        is_percentage: false
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
      toast.success('Alerte supprimée');
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
        toast.success(`${response.data.triggered} alerte(s) déclenchée(s) !`);
      } else {
        toast.info('Aucune alerte déclenchée');
      }
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la vérification');
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

  const activeAlerts = alerts.filter(a => !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

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
          <p className="text-muted-foreground mt-1">Soyez notifié quand un prix atteint votre cible</p>
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
            Vérifier
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
                  <DialogTitle>Nouvelle alerte</DialogTitle>
                  <DialogDescription>
                    Configurez une alerte de prix pour un de vos items
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
                        <SelectValue placeholder="Sélectionner un item..." />
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
                        ? 'Prix cible (€)' 
                        : formData.is_percentage 
                          ? 'Variation (%)' 
                          : 'Variation (€)'}
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
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving || !formData.item_id} data-testid="alert-submit-btn">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Créer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" data-testid="active-alerts-tab">
            <Clock className="h-4 w-4 mr-2" />
            En attente ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="triggered" data-testid="triggered-alerts-tab">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Déclenchées ({triggeredAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeAlerts.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune alerte active</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Créez une alerte pour être notifié des changements de prix
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
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(alert)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                <h3 className="text-lg font-medium mb-2">Aucune alerte déclenchée</h3>
                <p className="text-sm text-muted-foreground">
                  Les alertes apparaîtront ici quand elles seront déclenchées
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
                              <Badge variant="outline" className="badge-finance-up">Déclenchée</Badge>
                              <span className="text-sm text-muted-foreground">
                                {typeInfo.label}: {formatCurrency(alert.current_value)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(alert)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlertsPage;
