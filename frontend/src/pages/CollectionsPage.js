import { useState, useEffect } from 'react';
import { collectionsApi } from '../services/api';
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
import { Plus, MoreVertical, Pencil, Trash2, Layers, Loader2 } from 'lucide-react';

const COLORS = [
  { value: 'blue', label: 'Bleu', class: 'bg-blue-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'pink', label: 'Rose', class: 'bg-pink-500' },
  { value: 'amber', label: 'Ambre', class: 'bg-amber-500' },
  { value: 'emerald', label: 'Émeraude', class: 'bg-emerald-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'red', label: 'Rouge', class: 'bg-red-500' },
];

const ICONS = [
  { value: 'watch', label: 'Montre' },
  { value: 'lego', label: 'LEGO' },
  { value: 'book', label: 'Livre' },
  { value: 'car', label: 'Voiture' },
  { value: 'music', label: 'Musique' },
  { value: 'game', label: 'Jeux' },
  { value: 'art', label: 'Art' },
  { value: 'tech', label: 'Tech' },
];

const CollectionsPage = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    color: 'blue',
    icon: 'watch',
    metadata_schema: []
  });

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await collectionsApi.getAll();
      setCollections(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des collections');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (collection = null) => {
    if (collection) {
      setEditingCollection(collection);
      setFormData({
        name: collection.name,
        description: collection.description || '',
        category: collection.category || '',
        color: collection.color || 'blue',
        icon: collection.icon || 'watch',
        metadata_schema: collection.metadata_schema || []
      });
    } else {
      setEditingCollection(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        color: 'blue',
        icon: 'watch',
        metadata_schema: []
      });
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
      fetchCollections();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (collection) => {
    if (!window.confirm(`Supprimer la collection "${collection.name}" ?`)) return;
    
    try {
      await collectionsApi.delete(collection.id);
      toast.success('Collection supprimée');
      fetchCollections();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getColorClass = (color) => {
    return COLORS.find(c => c.value === color)?.class || 'bg-blue-500';
  };

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
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="collections-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-1">Organisez vos items par catégories</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} data-testid="add-collection-btn">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle collection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingCollection ? 'Modifier la collection' : 'Nouvelle collection'}
                </DialogTitle>
                <DialogDescription>
                  Créez une collection pour regrouper vos items similaires
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Montres de collection"
                    required
                    data-testid="collection-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description de la collection..."
                    data-testid="collection-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Luxe, Vintage..."
                    data-testid="collection-category-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Couleur</Label>
                    <Select
                      value={formData.color}
                      onValueChange={(value) => setFormData({ ...formData, color: value })}
                    >
                      <SelectTrigger data-testid="collection-color-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${color.class}`} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Icône</Label>
                    <Select
                      value={formData.icon}
                      onValueChange={(value) => setFormData({ ...formData, icon: value })}
                    >
                      <SelectTrigger data-testid="collection-icon-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICONS.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            {icon.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saving} data-testid="collection-submit-btn">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingCollection ? 'Mettre à jour' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune collection</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre première collection pour commencer
            </p>
            <Button onClick={() => handleOpenDialog()} data-testid="empty-add-collection-btn">
              <Plus className="h-4 w-4 mr-2" />
              Créer une collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <Card
              key={collection.id}
              className="bg-card border-border card-hover group"
              data-testid={`collection-card-${collection.id}`}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getColorClass(collection.color)}`} />
                  <CardTitle className="text-lg">{collection.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`collection-menu-${collection.id}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(collection)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(collection)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {collection.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {collection.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono">
                    {collection.item_count} items
                  </Badge>
                  {collection.category && (
                    <Badge variant="outline">{collection.category}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionsPage;
