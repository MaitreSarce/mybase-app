import { useState, useEffect } from 'react';
import { managedTagsApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Plus, Trash2, Pencil, Tag, Loader2, Hash } from 'lucide-react';

const TAG_COLORS = [
  { value: 'zinc', label: 'Gris', class: 'bg-zinc-500' },
  { value: 'red', label: 'Rouge', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'amber', label: 'Ambre', class: 'bg-amber-500' },
  { value: 'emerald', label: 'Vert', class: 'bg-emerald-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'blue', label: 'Bleu', class: 'bg-blue-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'pink', label: 'Rose', class: 'bg-pink-500' },
];

const TAG_CATEGORIES = [
  { value: '', label: 'Aucune' },
  { value: 'lieu', label: 'Lieu' },
  { value: 'statut', label: 'Statut' },
  { value: 'priorite', label: 'Priorité' },
  { value: 'personne', label: 'Personne' },
  { value: 'theme', label: 'Thème' },
  { value: 'autre', label: 'Autre' },
];

const TagsPage = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({ name: '', color: 'zinc', category: '' });

  useEffect(() => { fetchTags(); }, []);

  const fetchTags = async () => {
    try {
      const res = await managedTagsApi.getAll();
      setTags(res.data);
    } catch { toast.error('Erreur lors du chargement des tags'); }
    finally { setLoading(false); }
  };

  const handleOpenDialog = (tag = null) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({ name: tag.name, color: tag.color || 'zinc', category: tag.category || '' });
    } else {
      setEditingTag(null);
      setFormData({ name: '', color: 'zinc', category: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTag) {
        await managedTagsApi.update(editingTag.id, formData);
        toast.success('Tag mis à jour');
      } else {
        await managedTagsApi.create(formData);
        toast.success('Tag créé');
      }
      setDialogOpen(false);
      fetchTags();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleDelete = async (tag) => {
    if (!window.confirm(`Supprimer le tag "${tag.name}" ? Il sera retiré de tous les éléments.`)) return;
    try {
      await managedTagsApi.delete(tag.id);
      toast.success('Tag supprimé');
      fetchTags();
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const getColorClass = (color) => TAG_COLORS.find(c => c.value === color)?.class || 'bg-zinc-500';

  const filtered = filterCategory === 'all' ? tags : tags.filter(t => (t.category || '') === filterCategory);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tags-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground mt-1">Gérez vos tags pour mieux organiser vos données</p>
        </div>
        <div className="flex gap-2 items-start">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]" data-testid="tags-filter-category">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {TAG_CATEGORIES.filter(c => c.value).map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpenDialog()} data-testid="add-tag-btn">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau tag
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Hash className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun tag</h3>
            <p className="text-sm text-muted-foreground mb-4">Créez des tags pour organiser vos éléments</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />Créer un tag
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(tag => (
            <Card key={tag.id} className="bg-card border-border card-hover group" data-testid={`tag-card-${tag.id}`}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getColorClass(tag.color)}`} />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{tag.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground font-mono">{tag.usage_count} utilisations</span>
                      {tag.category && <Badge variant="outline" className="text-xs">{tag.category}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(tag)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(tag)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingTag ? 'Modifier le tag' : 'Nouveau tag'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Nom *</Label>
                <Input id="tag-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: maison" required data-testid="tag-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map(c => (
                    <button key={c.value} type="button"
                      className={`w-8 h-8 rounded-full ${c.class} transition-all ${formData.color === c.value ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : 'opacity-60 hover:opacity-100'}`}
                      onClick={() => setFormData({...formData, color: c.value})}
                      data-testid={`tag-color-${c.value}`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={formData.category || "none"} onValueChange={v => setFormData({...formData, category: v === 'none' ? '' : v})}>
                  <SelectTrigger data-testid="tag-category-select"><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {TAG_CATEGORIES.filter(c => c.value).map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="tag-submit-btn">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTag ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TagsPage;
