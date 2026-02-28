import { useState, useEffect } from 'react';
import { contentApi, tagsApi } from '../services/api';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Plus, MoreVertical, Pencil, Trash2, BookOpen, Loader2,
  Search, ChefHat, Wrench, GraduationCap, Video, X, Tag, FileText
} from 'lucide-react';
import ItemLinksManager from '../components/ItemLinksManager';

const DEFAULT_TYPES = [
  { value: 'recipe', label: 'Recette', icon: ChefHat, color: 'text-orange-400' },
  { value: 'diy', label: 'DIY', icon: Wrench, color: 'text-amber-400' },
  { value: 'tutorial', label: 'Tutoriel', icon: Video, color: 'text-blue-400' },
  { value: 'educational', label: 'Éducatif', icon: GraduationCap, color: 'text-violet-400' },
];

const ContentPage = () => {
  const [items, setItems] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [newTag, setNewTag] = useState('');
  const [customType, setCustomType] = useState('');
  const [formData, setFormData] = useState({
    title: '', content_type: 'recipe', description: '', body: '', tags: [], category: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, tagsRes] = await Promise.all([contentApi.getAll(), tagsApi.getAll()]);
      setItems(itemsRes.data);
      setAllTags(tagsRes.data);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  // Discover all content types from items (built-in + custom)
  const allContentTypes = (() => {
    const builtIn = DEFAULT_TYPES.map(t => t.value);
    const custom = [...new Set(items.map(i => i.content_type).filter(t => !builtIn.includes(t)))];
    return [
      ...DEFAULT_TYPES,
      ...custom.map(t => ({ value: t, label: t, icon: FileText, color: 'text-zinc-400' }))
    ];
  })();

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title, content_type: item.content_type,
        description: item.description || '', body: item.body || '',
        tags: item.tags || [], category: item.category || ''
      });
    } else {
      setEditingItem(null);
      setFormData({ title: '', content_type: 'recipe', description: '', body: '', tags: [], category: '' });
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
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer "${item.title}" ?`)) return;
    try {
      await contentApi.delete(item.id);
      toast.success('Contenu supprimé');
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
  const tagNames = allTags.map(t => t.name);

  const getTypeInfo = (type) => allContentTypes.find(t => t.value === type) || { label: type, icon: FileText, color: 'text-zinc-400' };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.content_type === filterType;
    const matchesTag = filterTag === 'all' || item.tags?.includes(filterTag);
    return matchesSearch && matchesType && matchesTag;
  });

  const handleAddCustomType = () => {
    if (customType.trim()) {
      const newType = customType.trim().toLowerCase();
      setFormData({ ...formData, content_type: newType });
      setCustomType('');
      toast.success(`Type "${newType}" sélectionné`);
    }
  };

  if (loading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div></div>);
  }

  return (
    <div className="space-y-6" data-testid="content-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contenu</h1>
          <p className="text-muted-foreground mt-1">Recettes, tutoriels, DIY et plus</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="add-content-btn">
          <Plus className="h-4 w-4 mr-2" />Nouveau contenu
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Rechercher..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="pl-10" data-testid="content-search-input" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]" data-testid="content-filter-type"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {allContentTypes.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tagNames.length > 0 && (
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[150px]" data-testid="content-filter-tag"><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les tags</SelectItem>
              {tagNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun contenu</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all' ? 'Aucun résultat' : 'Ajoutez votre premier contenu'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const typeInfo = getTypeInfo(item.content_type);
            const TypeIcon = typeInfo.icon;
            return (
              <Card key={item.id} className="bg-card border-border card-hover group cursor-pointer"
                onClick={() => handleOpenDialog(item)} data-testid={`content-card-${item.id}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TypeIcon className={`h-5 w-5 ${typeInfo.color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{item.title}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">{typeInfo.label}</Badge>
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
                      <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                        <Pencil className="h-4 w-4 mr-2" />Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {item.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>}
                  {item.category && <Badge variant="secondary" className="text-xs mb-2">{item.category}</Badge>}
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Modifier le contenu' : 'Nouveau contenu'}</DialogTitle>
              <DialogDescription>Gérez votre contenu</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Recette de tarte tatin" required data-testid="content-title-input" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.content_type} onValueChange={v => setFormData({...formData, content_type: v})}>
                  <SelectTrigger data-testid="content-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allContentTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2"><t.icon className={`h-4 w-4 ${t.color}`} />{t.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 mt-1">
                  <Input value={customType} onChange={e => setCustomType(e.target.value)}
                    placeholder="Ou créer un nouveau type..."
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomType())}
                    data-testid="content-custom-type-input" />
                  <Button type="button" variant="secondary" size="sm" onClick={handleAddCustomType}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Résumé..." data-testid="content-description-input" />
              </div>
              <div className="space-y-2">
                <Label>Contenu</Label>
                <Textarea value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})}
                  placeholder="Contenu complet (markdown supporté)..." rows={8} data-testid="content-body-input" />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                  placeholder="Ex: Cuisine, Électronique..." data-testid="content-category-input" />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Ajouter un tag..." data-testid="content-tag-input" />
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
                <ItemLinksManager itemType="content" itemId={editingItem.id} itemName={editingItem.title} onUpdate={fetchData} />
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="content-submit-btn">
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

export default ContentPage;
