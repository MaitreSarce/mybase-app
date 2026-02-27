import { useState, useEffect } from 'react';
import { contentApi } from '../services/api';
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
  BookOpen, 
  Loader2,
  Search,
  ChefHat,
  Wrench,
  GraduationCap,
  Video,
  X,
  Tag
} from 'lucide-react';

const CONTENT_TYPES = [
  { value: 'recipe', label: 'Recette', icon: ChefHat, color: 'text-orange-400' },
  { value: 'diy', label: 'DIY', icon: Wrench, color: 'text-amber-400' },
  { value: 'tutorial', label: 'Tutoriel', icon: Video, color: 'text-blue-400' },
  { value: 'educational', label: 'Éducatif', icon: GraduationCap, color: 'text-violet-400' },
];

const ContentPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content_type: 'recipe',
    description: '',
    body: '',
    tags: [],
    category: ''
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await contentApi.getAll();
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
        title: item.title,
        content_type: item.content_type,
        description: item.description || '',
        body: item.body || '',
        tags: item.tags || [],
        category: item.category || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        content_type: 'recipe',
        description: '',
        body: '',
        tags: [],
        category: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingItem) {
        await contentApi.update(editingItem.id, formData);
        toast.success('Contenu mis à jour');
      } else {
        await contentApi.create(formData);
        toast.success('Contenu créé');
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
    if (!window.confirm(`Supprimer "${item.title}" ?`)) return;
    
    try {
      await contentApi.delete(item.id);
      toast.success('Contenu supprimé');
      fetchItems();
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

  const getTypeInfo = (type) => {
    return CONTENT_TYPES.find(t => t.value === type) || CONTENT_TYPES[0];
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.content_type === filterType;
    return matchesSearch && matchesType;
  });

  const groupedItems = CONTENT_TYPES.reduce((acc, type) => {
    acc[type.value] = filteredItems.filter(item => item.content_type === type.value);
    return acc;
  }, {});

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
    <div className="space-y-6" data-testid="content-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bibliothèque</h1>
          <p className="text-muted-foreground mt-1">Recettes, tutoriels, DIY et contenus éducatifs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} data-testid="add-content-btn">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau contenu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Modifier le contenu' : 'Nouveau contenu'}</DialogTitle>
                <DialogDescription>
                  Ajoutez une recette, un tutoriel ou tout autre contenu
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Tiramisu traditionnel"
                    required
                    data-testid="content-title-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.content_type}
                      onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                    >
                      <SelectTrigger data-testid="content-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((type) => (
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
                    <Label htmlFor="category">Catégorie</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Ex: Desserts italiens"
                      data-testid="content-category-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Courte description..."
                    rows={2}
                    data-testid="content-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Contenu</Label>
                  <Textarea
                    id="body"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Instructions, ingrédients, étapes..."
                    rows={8}
                    className="font-mono text-sm"
                    data-testid="content-body-input"
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
                      data-testid="content-tag-input"
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
                <Button type="submit" disabled={saving} data-testid="content-submit-btn">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingItem ? 'Mettre à jour' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="content-search-input"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]" data-testid="content-filter-type">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {CONTENT_TYPES.map((type) => (
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

      {/* Content Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="content-tab-all">
            Tout ({filteredItems.length})
          </TabsTrigger>
          {CONTENT_TYPES.map((type) => (
            <TabsTrigger key={type.value} value={type.value} data-testid={`content-tab-${type.value}`}>
              <type.icon className={`h-4 w-4 mr-1 ${type.color}`} />
              {type.label} ({groupedItems[type.value]?.length || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <ContentGrid 
            items={filteredItems} 
            onEdit={handleOpenDialog}
            onDelete={handleDelete}
            getTypeInfo={getTypeInfo}
          />
        </TabsContent>

        {CONTENT_TYPES.map((type) => (
          <TabsContent key={type.value} value={type.value}>
            <ContentGrid 
              items={groupedItems[type.value] || []} 
              onEdit={handleOpenDialog}
              onDelete={handleDelete}
              getTypeInfo={getTypeInfo}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const ContentGrid = ({ items, onEdit, onDelete, getTypeInfo }) => {
  if (items.length === 0) {
    return (
      <Card className="bg-card border-border border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucun contenu</h3>
          <p className="text-sm text-muted-foreground">
            Aucun contenu trouvé pour ces critères
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const typeInfo = getTypeInfo(item.content_type);
        return (
          <Card
            key={item.id}
            className="bg-card border-border card-hover group"
            data-testid={`content-card-${item.id}`}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <typeInfo.icon className={`h-5 w-5 flex-shrink-0 ${typeInfo.color}`} />
                <CardTitle className="text-lg truncate">{item.title}</CardTitle>
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
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(item)}
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
              <div className="flex items-center justify-between">
                <Badge variant="outline">{typeInfo.label}</Badge>
                {item.category && (
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
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
  );
};

export default ContentPage;
