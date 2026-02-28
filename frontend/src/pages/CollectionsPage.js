import { useState, useEffect } from 'react';
import { collectionsApi, collectionItemsApi, tagsApi } from '../services/api';
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
  Plus, MoreVertical, Pencil, Trash2, Layers, Loader2,
  Package, Heart, ArrowLeft, X
} from 'lucide-react';

const COLORS = [
  { value: 'blue', label: 'Bleu', class: 'bg-blue-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'pink', label: 'Rose', class: 'bg-pink-500' },
  { value: 'amber', label: 'Ambre', class: 'bg-amber-500' },
  { value: 'emerald', label: 'Émeraude', class: 'bg-emerald-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'red', label: 'Rouge', class: 'bg-red-500' },
];

const CollectionsPage = () => {
  const [collections, setCollections] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterTag, setFilterTag] = useState('all');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionItems, setCollectionItems] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', color: 'blue', metadata_schema: []
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [colRes, tagsRes] = await Promise.all([
        collectionsApi.getAll(),
        tagsApi.getAll()
      ]);
      setCollections(colRes.data);
      setAllTags(tagsRes.data);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleOpenDialog = (collection = null) => {
    if (collection) {
      setEditingCollection(collection);
      setFormData({
        name: collection.name, description: collection.description || '',
        category: collection.category || '', color: collection.color || 'blue',
        metadata_schema: collection.metadata_schema || []
      });
    } else {
      setEditingCollection(null);
      setFormData({ name: '', description: '', category: '', color: 'blue', metadata_schema: [] });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCollection) {
        await collectionsApi.update(editingCollection.id, formData);
        toast.success('Collection mise à jour');
      } else {
        await collectionsApi.create(formData);
        toast.success('Collection créée');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (collection) => {
    if (!window.confirm(`Supprimer la collection "${collection.name}" ?`)) return;
    try {
      await collectionsApi.delete(collection.id);
      toast.success('Collection supprimée');
      fetchData();
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const handleSelectCollection = async (collection) => {
    setSelectedCollection(collection);
    try {
      const res = await collectionItemsApi.getItems(collection.id);
      setCollectionItems(res.data);
    } catch { toast.error('Erreur'); }
  };

  const getColorClass = (color) => COLORS.find(c => c.value === color)?.class || 'bg-blue-500';
  const tagNames = allTags.map(t => t.name);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  // Detail view of a collection
  if (selectedCollection) {
    const invItems = collectionItems?.inventory || [];
    const wishItems = collectionItems?.wishlist || [];
    return (
      <div className="space-y-6" data-testid="collection-detail">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCollection(null)} data-testid="back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getColorClass(selectedCollection.color)}`} />
              <h1 className="text-3xl font-bold tracking-tight">{selectedCollection.name}</h1>
            </div>
            {selectedCollection.description && (
              <p className="text-muted-foreground mt-1">{selectedCollection.description}</p>
            )}
          </div>
        </div>

        {/* Inventory items */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Package className="h-5 w-5" /> Acquis ({invItems.length})
          </h2>
          {invItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun item acquis dans cette collection</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {invItems.map(item => (
                <Card key={item.id} className="bg-card border-border">
                  <CardContent className="py-3">
                    <p className="font-medium">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{item.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs"><Package className="h-3 w-3 mr-1" />Inventaire</Badge>
                      {item.current_value && <span className="text-xs font-mono">{item.current_value} EUR</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Wishlist items */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Heart className="h-5 w-5" /> Souhaits ({wishItems.length})
          </h2>
          {wishItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun souhait dans cette collection</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {wishItems.map(item => (
                <Card key={item.id} className="bg-card border-border">
                  <CardContent className="py-3">
                    <p className="font-medium">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{item.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs"><Heart className="h-3 w-3 mr-1" />Souhait</Badge>
                      {item.price && <span className="text-xs font-mono">{item.price} EUR</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="collections-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-1">Organisez vos items par catégories</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="add-collection-btn">
          <Plus className="h-4 w-4 mr-2" />Nouvelle collection
        </Button>
      </div>

      {/* Tag filter */}
      {tagNames.length > 0 && (
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-[200px]" data-testid="collections-filter-tag">
            <SelectValue placeholder="Filtrer par tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les tags</SelectItem>
            {tagNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {collections.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune collection</h3>
            <p className="text-sm text-muted-foreground mb-4">Créez votre première collection</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />Créer une collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map(collection => (
            <Card key={collection.id}
              className="bg-card border-border card-hover group cursor-pointer"
              onClick={() => handleSelectCollection(collection)}
              data-testid={`collection-card-${collection.id}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getColorClass(collection.color)}`} />
                  <CardTitle className="text-lg">{collection.name}</CardTitle>
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
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(collection); }}>
                      <Pencil className="h-4 w-4 mr-2" />Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleDelete(e, collection)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {collection.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{collection.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono">{collection.item_count} items</Badge>
                  {collection.category && <Badge variant="outline">{collection.category}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Collection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingCollection ? 'Modifier la collection' : 'Nouvelle collection'}</DialogTitle>
              <DialogDescription>Créez une collection pour regrouper vos items</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input id="name" value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Montres de collection" required data-testid="collection-name-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Description..." data-testid="collection-description-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Input value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    placeholder="Ex: Luxe, Vintage..." data-testid="collection-category-input" />
                </div>
                <div className="space-y-2">
                  <Label>Couleur</Label>
                  <Select value={formData.color} onValueChange={v => setFormData({...formData, color: v})}>
                    <SelectTrigger data-testid="collection-color-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLORS.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${c.class}`} />{c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="collection-submit-btn">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCollection ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionsPage;
