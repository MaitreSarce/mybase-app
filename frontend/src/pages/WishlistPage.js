import { useState, useEffect } from 'react';
import { wishlistApi, collectionsApi, tagsApi } from '../services/api';
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Plus, MoreVertical, Pencil, Trash2, Heart, Loader2, ExternalLink, Check, X, Tag } from 'lucide-react';
import ItemLinksManager from '../components/ItemLinksManager';

const PRIORITIES = [
  { value: 1, label: 'Urgent', color: 'bg-red-500' },
  { value: 2, label: 'Haute', color: 'bg-orange-500' },
  { value: 3, label: 'Moyenne', color: 'bg-yellow-500' },
  { value: 4, label: 'Basse', color: 'bg-blue-500' },
  { value: 5, label: 'Faible', color: 'bg-zinc-500' },
];

const WishlistPage = () => {
  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPurchased, setShowPurchased] = useState(false);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [filterCollection, setFilterCollection] = useState('all');
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    name: '', description: '', url: '', price: '', currency: 'EUR',
    priority: 3, tags: [], target_date: '', collection_id: ''
  });

  useEffect(() => { fetchData(); }, [showPurchased]);

  const fetchData = async () => {
    try {
      const [itemsRes, colRes, tagsRes] = await Promise.all([
        wishlistApi.getAll({ purchased: showPurchased ? undefined : false }),
        collectionsApi.getAll(),
        tagsApi.getAll()
      ]);
      setItems(itemsRes.data);
      setCollections(colRes.data);
      setAllTags(tagsRes.data);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name, description: item.description || '', url: item.url || '',
        price: item.price || '', currency: item.currency || 'EUR',
        priority: item.priority || 3, tags: item.tags || [],
        target_date: item.target_date || '', collection_id: item.collection_id || ''
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', description: '', url: '', price: '', currency: 'EUR',
        priority: 3, tags: [], target_date: '', collection_id: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...formData,
      price: formData.price ? parseFloat(formData.price) : null,
      collection_id: formData.collection_id || null
    };
    try {
      if (editingItem) {
        await wishlistApi.update(editingItem.id, data);
        toast.success('Souhait mis à jour');
      } else {
        await wishlistApi.create(data);
        toast.success('Souhait ajouté');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer "${item.name}" ?`)) return;
    try {
      await wishlistApi.delete(item.id);
      toast.success('Souhait supprimé');
      fetchData();
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const handleTogglePurchased = async (e, item) => {
    e.stopPropagation();
    try {
      await wishlistApi.update(item.id, { purchased: !item.purchased });
      toast.success(item.purchased ? 'Marqué comme non acheté' : 'Marqué comme acheté');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };
  const removeTag = (t) => setFormData({ ...formData, tags: formData.tags.filter(x => x !== t) });
  const fmt = (v, cur = 'EUR') => v ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur }).format(v) : '-';
  const getPriorityInfo = (p) => PRIORITIES.find(x => x.value === p) || PRIORITIES[2];
  const tagNames = allTags.map(t => t.name);

  const filteredItems = items.filter(item => {
    if (filterPriority !== 'all' && item.priority !== parseInt(filterPriority)) return false;
    if (filterTag !== 'all' && !item.tags?.includes(filterTag)) return false;
    if (filterCollection !== 'all' && item.collection_id !== filterCollection) return false;
    return true;
  });

  const totalValue = filteredItems.filter(i => !i.purchased).reduce((s, i) => s + (i.price || 0), 0);

  if (loading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div></div>);
  }

  return (
    <div className="space-y-6" data-testid="wishlist-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liste de souhaits</h1>
          <p className="text-muted-foreground mt-1">
            {filteredItems.filter(i => !i.purchased).length} souhaits - Total: {fmt(totalValue)}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="add-wishlist-btn">
          <Plus className="h-4 w-4 mr-2" />Ajouter un souhait
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Checkbox id="showPurchased" checked={showPurchased} onCheckedChange={setShowPurchased} data-testid="show-purchased-checkbox" />
          <Label htmlFor="showPurchased" className="text-sm cursor-pointer">Afficher les achats</Label>
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px]" data-testid="wishlist-filter-priority"><SelectValue placeholder="Priorité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {tagNames.length > 0 && (
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[150px]" data-testid="wishlist-filter-tag"><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les tags</SelectItem>
              {tagNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterCollection} onValueChange={setFilterCollection}>
          <SelectTrigger className="w-[180px]" data-testid="wishlist-filter-collection"><SelectValue placeholder="Collection" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes collections</SelectItem>
            {collections.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filteredItems.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun souhait</h3>
            <p className="text-sm text-muted-foreground mb-4">Votre liste est vide</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const priorityInfo = getPriorityInfo(item.priority);
            const col = collections.find(c => c.id === item.collection_id);
            return (
              <Card key={item.id}
                className={`bg-card border-border card-hover group cursor-pointer ${item.purchased ? 'opacity-60' : ''}`}
                onClick={() => handleOpenDialog(item)} data-testid={`wishlist-card-${item.id}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button onClick={(e) => handleTogglePurchased(e, item)}
                      className={`mt-1 h-5 w-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                        item.purchased ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border hover:border-primary'
                      }`} data-testid={`wishlist-toggle-${item.id}`}>
                      {item.purchased && <Check className="h-3 w-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <CardTitle className={`text-lg truncate ${item.purchased ? 'line-through' : ''}`}>{item.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${priorityInfo.color}`} />
                        <span className="text-xs text-muted-foreground">{priorityInfo.label}</span>
                        {col && <Badge variant="outline" className="text-xs">{col.name}</Badge>}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { handleOpenDialog(item); }}>
                        <Pencil className="h-4 w-4 mr-2" />Modifier
                      </DropdownMenuItem>
                      {item.url && (
                        <DropdownMenuItem onClick={() => { window.open(item.url, '_blank'); }}>
                          <ExternalLink className="h-4 w-4 mr-2" />Ouvrir le lien
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {item.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>}
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold font-mono">{fmt(item.price, item.currency)}</span>
                    {item.url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank'); }}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Modifier le souhait' : 'Nouveau souhait'}</DialogTitle>
              <DialogDescription>Gérez votre souhait</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: MacBook Pro M3" required data-testid="wishlist-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Notes..." data-testid="wishlist-description-input" />
              </div>
              <div className="space-y-2">
                <Label>Lien</Label>
                <Input type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})}
                  placeholder="https://..." data-testid="wishlist-url-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix</Label>
                  <Input type="number" step="0.01" value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0.00" data-testid="wishlist-price-input" />
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={String(formData.priority)} onValueChange={v => setFormData({...formData, priority: parseInt(v)})}>
                    <SelectTrigger data-testid="wishlist-priority-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={String(p.value)}>
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${p.color}`} />{p.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date cible</Label>
                  <Input type="date" value={formData.target_date}
                    onChange={e => setFormData({...formData, target_date: e.target.value})} data-testid="wishlist-target-date-input" />
                </div>
                <div className="space-y-2">
                  <Label>Collection</Label>
                  <Select value={formData.collection_id || "none"}
                    onValueChange={v => setFormData({...formData, collection_id: v === "none" ? "" : v})}>
                    <SelectTrigger data-testid="wishlist-collection-select"><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {collections.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Ajouter un tag..." data-testid="wishlist-tag-input" />
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
              {editingItem && (
                <ItemLinksManager itemType="wishlist" itemId={editingItem.id} itemName={editingItem.name} onUpdate={fetchData} />
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="wishlist-submit-btn">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WishlistPage;
