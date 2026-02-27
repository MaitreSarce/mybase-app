import { useState, useEffect } from 'react';
import { wishlistApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Checkbox } from '../components/ui/checkbox';
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
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Heart, 
  Loader2,
  ExternalLink,
  Check,
  X,
  Tag
} from 'lucide-react';

const PRIORITIES = [
  { value: 1, label: 'Urgent', color: 'bg-red-500' },
  { value: 2, label: 'Haute', color: 'bg-orange-500' },
  { value: 3, label: 'Moyenne', color: 'bg-yellow-500' },
  { value: 4, label: 'Basse', color: 'bg-blue-500' },
  { value: 5, label: 'Faible', color: 'bg-zinc-500' },
];

const WishlistPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPurchased, setShowPurchased] = useState(false);
  const [filterPriority, setFilterPriority] = useState('all');
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    price: '',
    currency: 'EUR',
    priority: 3,
    tags: [],
    target_date: ''
  });

  useEffect(() => {
    fetchItems();
  }, [showPurchased]);

  const fetchItems = async () => {
    try {
      const response = await wishlistApi.getAll({ purchased: showPurchased ? undefined : false });
      setItems(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        url: item.url || '',
        price: item.price || '',
        currency: item.currency || 'EUR',
        priority: item.priority || 3,
        tags: item.tags || [],
        target_date: item.target_date || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        url: '',
        price: '',
        currency: 'EUR',
        priority: 3,
        tags: [],
        target_date: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const data = {
      ...formData,
      price: formData.price ? parseFloat(formData.price) : null
    };
    
    try {
      if (editingItem) {
        await wishlistApi.update(editingItem.id, data);
        toast.success('Item mis à jour');
      } else {
        await wishlistApi.create(data);
        toast.success('Item ajouté à la liste');
      }
      setDialogOpen(false);
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer "${item.name}" ?`)) return;
    
    try {
      await wishlistApi.delete(item.id);
      toast.success('Item supprimé');
      fetchItems();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleTogglePurchased = async (item) => {
    try {
      await wishlistApi.update(item.id, { purchased: !item.purchased });
      toast.success(item.purchased ? 'Marqué comme non acheté' : 'Marqué comme acheté');
      fetchItems();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
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
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const getPriorityInfo = (priority) => {
    return PRIORITIES.find(p => p.value === priority) || PRIORITIES[2];
  };

  const filteredItems = items.filter(item => {
    if (filterPriority !== 'all' && item.priority !== parseInt(filterPriority)) {
      return false;
    }
    return true;
  });

  const totalValue = filteredItems
    .filter(item => !item.purchased)
    .reduce((sum, item) => sum + (item.price || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="wishlist-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liste de souhaits</h1>
          <p className="text-muted-foreground mt-1">
            {filteredItems.filter(i => !i.purchased).length} souhaits • Total: {formatCurrency(totalValue)}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} data-testid="add-wishlist-btn">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un souhait
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Modifier le souhait' : 'Nouveau souhait'}</DialogTitle>
                <DialogDescription>
                  Ajoutez un article à votre liste de souhaits
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: MacBook Pro M3"
                    required
                    data-testid="wishlist-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Notes sur cet article..."
                    data-testid="wishlist-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Lien</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://..."
                    data-testid="wishlist-url-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (€)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      data-testid="wishlist-price-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select
                      value={String(formData.priority)}
                      onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}
                    >
                      <SelectTrigger data-testid="wishlist-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={String(p.value)}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${p.color}`} />
                              {p.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_date">Date cible</Label>
                  <Input
                    id="target_date"
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    data-testid="wishlist-target-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Ajouter un tag..."
                      data-testid="wishlist-tag-input"
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saving} data-testid="wishlist-submit-btn">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingItem ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Checkbox
            id="showPurchased"
            checked={showPurchased}
            onCheckedChange={setShowPurchased}
            data-testid="show-purchased-checkbox"
          />
          <Label htmlFor="showPurchased" className="text-sm cursor-pointer">
            Afficher les achats
          </Label>
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px]" data-testid="wishlist-filter-priority">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={String(p.value)}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${p.color}`} />
                  {p.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun souhait</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Votre liste de souhaits est vide
            </p>
            <Button onClick={() => handleOpenDialog()} data-testid="empty-add-wishlist-btn">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un souhait
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const priorityInfo = getPriorityInfo(item.priority);
            return (
              <Card
                key={item.id}
                className={`bg-card border-border card-hover group ${item.purchased ? 'opacity-60' : ''}`}
                data-testid={`wishlist-card-${item.id}`}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleTogglePurchased(item)}
                      className={`mt-1 h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                        item.purchased 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-border hover:border-primary'
                      }`}
                      data-testid={`wishlist-toggle-${item.id}`}
                    >
                      {item.purchased && <Check className="h-3 w-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <CardTitle className={`text-lg truncate ${item.purchased ? 'line-through' : ''}`}>
                        {item.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${priorityInfo.color}`} />
                        <span className="text-xs text-muted-foreground">{priorityInfo.label}</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`wishlist-menu-${item.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      {item.url && (
                        <DropdownMenuItem onClick={() => window.open(item.url, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ouvrir le lien
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(item)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold font-mono">
                      {formatCurrency(item.price, item.currency)}
                    </span>
                    {item.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(item.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
