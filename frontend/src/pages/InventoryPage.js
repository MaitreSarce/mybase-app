import { useState, useEffect, useRef } from 'react';
import { inventoryApi, collectionsApi, tagsApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Plus, MoreVertical, Pencil, Trash2, Package, Loader2, Search, Tag, X } from 'lucide-react';
import { MultiSelect } from '../components/MultiSelect';
import { ViewToggle } from '../components/ViewToggle';
import ItemLinksManager from '../components/ItemLinksManager';

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCollections, setFilterCollections] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [view, setView] = useState('card');
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    name: '', description: '', collection_id: '', tags: [], metadata: [],
    purchase_price: '', current_value: '', purchase_date: '', location: '', condition: '', quantity: 1
  });
  const dropdownActionRef = useRef(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, colRes, tagsRes] = await Promise.all([
        inventoryApi.getAll(), collectionsApi.getAll(), tagsApi.getAll()
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
        name: item.name, description: item.description || '',
        collection_id: item.collection_id || '', tags: item.tags || [],
        metadata: item.metadata || [], purchase_price: item.purchase_price || '',
        current_value: item.current_value || '', purchase_date: item.purchase_date || '',
        location: item.location || '', condition: item.condition || '', quantity: item.quantity || 1
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', description: '', collection_id: '', tags: [], metadata: [],
        purchase_price: '', current_value: '', purchase_date: '', location: '', condition: '', quantity: 1 });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...formData,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      current_value: formData.current_value ? parseFloat(formData.current_value) : null,
      collection_id: formData.collection_id || null,
      quantity: parseInt(formData.quantity) || 1
    };
    try {
      if (editingItem) {
        await inventoryApi.update(editingItem.id, data);
        toast.success('Item mis à jour');
      } else {
        await inventoryApi.create(data);
        toast.success('Item créé');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    try {
      await inventoryApi.delete(item.id);
      toast.success(`"${item.name}" supprimé`);
      fetchData();
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };
  const removeTag = (t) => setFormData({ ...formData, tags: formData.tags.filter(x => x !== t) });
  const fmt = (v) => v ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v) : '-';

  const filteredItems = items.filter(item => {
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCollections.length && !filterCollections.includes(item.collection_id)) return false;
    if (filterTags.length && !filterTags.some(t => item.tags?.includes(t))) return false;
    return true;
  });

  const tagOptions = allTags.map(t => ({ value: t.name, label: t.name }));
  const colOptions = collections.map(c => ({ value: c.id, label: c.name }));

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div></div>;

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventaire</h1>
          <p className="text-muted-foreground mt-1">{filteredItems.length} items</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="add-item-btn">
          <Plus className="h-4 w-4 mr-2" />Nouvel item
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Rechercher..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="pl-10" data-testid="inventory-search" />
        </div>
        {colOptions.length > 0 && <MultiSelect options={colOptions} selected={filterCollections} onChange={setFilterCollections} placeholder="Collections" testId="filter-collections" />}
        {tagOptions.length > 0 && <MultiSelect options={tagOptions} selected={filterTags} onChange={setFilterTags} placeholder="Tags" testId="filter-tags" />}
        <ViewToggle view={view} onChange={setView} />
      </div>

      {filteredItems.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun item</h3>
          </CardContent>
        </Card>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <Card key={item.id} className="bg-card border-border card-hover group" data-testid={`inventory-card-${item.id}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenDialog(item)}>
                  <CardTitle className="text-lg truncate">{item.name}</CardTitle>
                  {item.quantity > 1 && <Badge variant="outline" className="mt-1 font-mono">x{item.quantity}</Badge>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuItem onSelect={() => handleOpenDialog(item)}>
                      <Pencil className="h-4 w-4 mr-2" />Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleDelete(item)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="cursor-pointer" onClick={() => handleOpenDialog(item)}>
                {item.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valeur</span>
                  <span className="font-mono font-medium">{fmt(item.current_value || item.purchase_price)}</span>
                </div>
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.slice(0, 3).map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                    {item.tags.length > 3 && <Badge variant="secondary" className="text-xs">+{item.tags.length - 3}</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nom</TableHead><TableHead>Valeur</TableHead><TableHead>État</TableHead><TableHead>Tags</TableHead><TableHead className="w-10"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map(item => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => { if (!dropdownActionRef.current) handleOpenDialog(item); }} data-testid={`inventory-row-${item.id}`}>
                  <TableCell className="font-medium">{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''}</TableCell>
                  <TableCell className="font-mono">{fmt(item.current_value || item.purchase_price)}</TableCell>
                  <TableCell>{item.condition && <Badge variant="outline" className="capitalize text-xs">{item.condition}</Badge>}</TableCell>
                  <TableCell>{item.tags?.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-xs mr-1">{t}</Badge>)}</TableCell>
                  <TableCell>
                    <DropdownMenu onOpenChange={(open) => {
                      if (!open) { dropdownActionRef.current = true; setTimeout(() => { dropdownActionRef.current = false; }, 300); }
                    }}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                        <DropdownMenuItem onSelect={() => handleDelete(item)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Modifier l'item" : 'Nouvel item'}</DialogTitle>
              <DialogDescription>Gérez votre item d'inventaire</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nom *</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Rolex Submariner" required data-testid="item-name-input" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description..." />
                </div>
                <div className="space-y-2">
                  <Label>Collection</Label>
                  <Select value={formData.collection_id || "none"} onValueChange={v => setFormData({...formData, collection_id: v === "none" ? "" : v})}>
                    <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {collections.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantité</Label>
                  <Input type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Prix d'achat</Label>
                  <Input type="number" step="0.01" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Valeur actuelle</Label>
                  <Input type="number" step="0.01" value={formData.current_value} onChange={e => setFormData({...formData, current_value: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Date d'achat</Label>
                  <Input type="date" value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>État</Label>
                  <Select value={formData.condition || "none"} onValueChange={v => setFormData({...formData, condition: v === "none" ? "" : v})}>
                    <SelectTrigger><SelectValue placeholder="Non spécifié" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non spécifié</SelectItem>
                      <SelectItem value="neuf">Neuf</SelectItem><SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="bon">Bon</SelectItem><SelectItem value="correct">Correct</SelectItem><SelectItem value="usage">Usagé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Emplacement</Label>
                  <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ex: Coffre-fort, Garage..." />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Ajouter un tag..." />
                    <Button type="button" variant="secondary" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map(tag => <Badge key={tag} variant="secondary" className="gap-1">{tag}<X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} /></Badge>)}
                    </div>
                  )}
                </div>
              </div>
              {editingItem && <ItemLinksManager itemType="inventory" itemId={editingItem.id} itemName={editingItem.name} onUpdate={fetchData} />}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="item-submit-btn">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
