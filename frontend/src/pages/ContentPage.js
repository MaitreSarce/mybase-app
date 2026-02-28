import { useState, useEffect, useRef } from 'react';
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Plus, MoreVertical, Pencil, Trash2, BookOpen, Loader2,
  Search, ChefHat, Wrench, GraduationCap, Video, X, FileText, ExternalLink
} from 'lucide-react';
import { MultiSelect } from '../components/MultiSelect';
import { ViewToggle } from '../components/ViewToggle';
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
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [view, setView] = useState('card');
  const [newTag, setNewTag] = useState('');
  const [customType, setCustomType] = useState('');
  const [formData, setFormData] = useState({
    title: '', content_type: 'recipe', description: '', body: '', tags: [], category: ''
  });
  const dropdownActionRef = useRef(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, tagsRes] = await Promise.all([contentApi.getAll(), tagsApi.getAll()]);
      setItems(itemsRes.data); setAllTags(tagsRes.data);
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  const allContentTypes = (() => {
    const builtIn = DEFAULT_TYPES.map(t => t.value);
    const custom = [...new Set(items.map(i => i.content_type).filter(t => t && !builtIn.includes(t)))];
    const types = [...DEFAULT_TYPES, ...custom.map(t => ({ value: t, label: t, icon: FileText, color: 'text-zinc-400' }))];
    if (formData.content_type && !types.find(t => t.value === formData.content_type)) {
      types.push({ value: formData.content_type, label: formData.content_type, icon: FileText, color: 'text-zinc-400' });
    }
    return types;
  })();

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ title: item.title, content_type: item.content_type, description: item.description || '', body: item.body || '', url: item.url || '', tags: item.tags || [], category: item.category || '' });
    } else {
      setEditingItem(null);
      setFormData({ title: '', content_type: 'recipe', description: '', body: '', url: '', tags: [], category: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editingItem) { await contentApi.update(editingItem.id, formData); toast.success('Contenu mis à jour'); }
      else { await contentApi.create(formData); toast.success('Contenu créé'); }
      setDialogOpen(false); fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); } finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    try { await contentApi.delete(item.id); toast.success(`"${item.title}" supprimé`); fetchData(); }
    catch { toast.error('Erreur'); }
  };

  const handleAddCustomType = () => {
    if (customType.trim()) {
      const newType = customType.trim().toLowerCase();
      setFormData({ ...formData, content_type: newType });
      setCustomType('');
      toast.success(`Type "${newType}" sélectionné`);
    }
  };

  const addTag = () => { if (newTag.trim() && !formData.tags.includes(newTag.trim())) { setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] }); setNewTag(''); } };
  const removeTag = (t) => setFormData({ ...formData, tags: formData.tags.filter(x => x !== t) });

  const getTypeInfo = (type) => allContentTypes.find(t => t.value === type) || { label: type, icon: FileText, color: 'text-zinc-400' };

  const filteredItems = items.filter(item => {
    if (searchQuery && !item.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !item.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterTypes.length && !filterTypes.includes(item.content_type)) return false;
    if (filterTags.length && !filterTags.some(t => item.tags?.includes(t))) return false;
    return true;
  });

  const typeOpts = allContentTypes.map(t => ({ value: t.value, label: t.label }));
  const tagOpts = allTags.map(t => ({ value: t.name, label: t.name }));

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="space-y-6" data-testid="content-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Contenu</h1><p className="text-muted-foreground mt-1">Recettes, tutoriels, DIY et plus</p></div>
        <Button onClick={() => handleOpenDialog()} data-testid="add-content-btn"><Plus className="h-4 w-4 mr-2" />Nouveau contenu</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {typeOpts.length > 0 && <MultiSelect options={typeOpts} selected={filterTypes} onChange={setFilterTypes} placeholder="Types" testId="filter-types" />}
        {tagOpts.length > 0 && <MultiSelect options={tagOpts} selected={filterTags} onChange={setFilterTags} placeholder="Tags" testId="filter-tags" />}
        <ViewToggle view={view} onChange={setView} />
      </div>

      {filteredItems.length === 0 ? (
        <Card className="bg-card border-border border-dashed"><CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-medium">Aucun contenu</h3></CardContent></Card>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const ti = getTypeInfo(item.content_type); const TIcon = ti.icon;
            return (
              <Card key={item.id} className="bg-card border-border card-hover group" data-testid={`content-card-${item.id}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenDialog(item)}>
                    <TIcon className={`h-5 w-5 ${ti.color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0"><CardTitle className="text-lg truncate">{item.title}</CardTitle><Badge variant="outline" className="mt-1 text-xs">{ti.label}</Badge></div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                      <DropdownMenuItem onSelect={() => handleOpenDialog(item)}><Pencil className="h-4 w-4 mr-2" />Modifier</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleDelete(item)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="cursor-pointer" onClick={() => handleOpenDialog(item)}>
                  {item.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>}
                  {item.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{item.tags.slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table><TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Type</TableHead><TableHead>Catégorie</TableHead><TableHead>Tags</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
            <TableBody>{filteredItems.map(item => {
              const ti = getTypeInfo(item.content_type);
              return (<TableRow key={item.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => { if (!dropdownActionRef.current) handleOpenDialog(item); }}>
                <TableCell className="font-medium">{item.title}</TableCell><TableCell><Badge variant="outline" className="text-xs">{ti.label}</Badge></TableCell>
                <TableCell>{item.category || '-'}</TableCell><TableCell>{item.tags?.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-xs mr-1">{t}</Badge>)}</TableCell>
                <TableCell><DropdownMenu onOpenChange={(open) => { if (!open) { dropdownActionRef.current = true; setTimeout(() => { dropdownActionRef.current = false; }, 300); } }}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}><DropdownMenuItem onSelect={() => handleDelete(item)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Supprimer</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>);
            })}</TableBody></Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader><DialogTitle>{editingItem ? 'Modifier le contenu' : 'Nouveau contenu'}</DialogTitle><DialogDescription>Gérez votre contenu</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Titre *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required data-testid="content-title-input" /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select key={formData.content_type} value={formData.content_type} onValueChange={v => setFormData({...formData, content_type: v})}>
                  <SelectTrigger data-testid="content-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{allContentTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex gap-2 mt-1">
                  <Input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Nouveau type (ex: podcast, article...)"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddCustomType(); } }} data-testid="content-custom-type-input" className="flex-1" />
                  <Button type="button" variant="secondary" size="sm" onClick={handleAddCustomType} data-testid="add-custom-type-btn"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <div className="space-y-2"><Label>Contenu</Label><Textarea value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})} rows={6} placeholder="Contenu complet..." /></div>
              <div className="space-y-2"><Label>Lien / URL source</Label><Input type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." data-testid="content-url-input" /></div>
              <div className="space-y-2"><Label>Catégorie</Label><Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Ex: Cuisine, Électronique..." /></div>
              <div className="space-y-2"><Label>Tags</Label>
                <div className="flex gap-2"><Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Tag..." /><Button type="button" variant="secondary" onClick={addTag}><Plus className="h-4 w-4" /></Button></div>
                {formData.tags.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{formData.tags.map(t => <Badge key={t} variant="secondary" className="gap-1">{t}<X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(t)} /></Badge>)}</div>}
              </div>
              {editingItem && <ItemLinksManager itemType="content" itemId={editingItem.id} itemName={editingItem.title} onUpdate={fetchData} />}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingItem ? 'Mettre à jour' : 'Créer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentPage;
