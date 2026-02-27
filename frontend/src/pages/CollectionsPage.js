import { useState, useEffect } from 'react';
import { collectionsApi, customTypesApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, MoreVertical, Pencil, Trash2, Layers, Loader2, Settings2, X } from 'lucide-react';

const COLORS = [
  { value: 'blue', label: 'Bleu', class: 'bg-blue-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'pink', label: 'Rose', class: 'bg-pink-500' },
  { value: 'amber', label: 'Ambre', class: 'bg-amber-500' },
  { value: 'emerald', label: 'Émeraude', class: 'bg-emerald-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'red', label: 'Rouge', class: 'bg-red-500' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Oui/Non' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Liste' },
];

const CollectionsPage = () => {
  const [collections, setCollections] = useState([]);
  const [customTypes, setCustomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', color: 'blue', metadata_schema: []
  });
  const [typeForm, setTypeForm] = useState({
    name: '', category: 'collection', fields: [], color: ''
  });
  const [newField, setNewField] = useState({ name: '', type: 'text' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [colRes, typesRes] = await Promise.all([
        collectionsApi.getAll(),
        customTypesApi.getAll('collection')
      ]);
      setCollections(colRes.data);
      setCustomTypes(typesRes.data);
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

  const handleOpenTypeDialog = (type = null) => {
    if (type) {
      setEditingType(type);
      setTypeForm({ name: type.name, category: 'collection', fields: type.fields || [], color: type.color || '' });
    } else {
      setEditingType(null);
      setTypeForm({ name: '', category: 'collection', fields: [], color: '' });
    }
    setTypeDialogOpen(true);
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

  const handleSubmitType = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingType) {
        await customTypesApi.update(editingType.id, typeForm);
        toast.success('Type mis à jour');
      } else {
        await customTypesApi.create(typeForm);
        toast.success('Type personnalisé créé');
      }
      setTypeDialogOpen(false);
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

  const handleDeleteType = async (type) => {
    if (!window.confirm(`Supprimer le type "${type.name}" ?`)) return;
    try {
      await customTypesApi.delete(type.id);
      toast.success('Type supprimé');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const addField = () => {
    if (newField.name.trim()) {
      setTypeForm({ ...typeForm, fields: [...typeForm.fields, { ...newField }] });
      setNewField({ name: '', type: 'text' });
    }
  };

  const removeField = (idx) => {
    setTypeForm({ ...typeForm, fields: typeForm.fields.filter((_, i) => i !== idx) });
  };

  const getColorClass = (color) => COLORS.find(c => c.value === color)?.class || 'bg-blue-500';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
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
    <div className="space-y-6" data-testid="collections-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-1">Organisez vos items par catégories</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleOpenTypeDialog()} data-testid="add-custom-type-btn">
            <Settings2 className="h-4 w-4 mr-2" />Types
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} data-testid="add-collection-btn">
                <Plus className="h-4 w-4 mr-2" />Nouvelle collection
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingCollection ? 'Modifier la collection' : 'Nouvelle collection'}</DialogTitle>
                  <DialogDescription>Créez une collection pour regrouper vos items similaires</DialogDescription>
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
                      placeholder="Description de la collection..." data-testid="collection-description-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Catégorie</Label>
                      <Input id="category" value={formData.category}
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
      </div>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune collection</h3>
            <p className="text-sm text-muted-foreground mb-4">Créez votre première collection pour commencer</p>
            <Button onClick={() => handleOpenDialog()} data-testid="empty-add-collection-btn">
              <Plus className="h-4 w-4 mr-2" />Créer une collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map(collection => (
            <Card key={collection.id} className="bg-card border-border card-hover group"
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
                      data-testid={`collection-menu-${collection.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(collection)}>
                      <Pencil className="h-4 w-4 mr-2" />Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(collection)} className="text-destructive">
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

      {/* Custom Types Section */}
      {customTypes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Types personnalisés</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customTypes.map(type => (
              <Card key={type.id} className="bg-card border-border card-hover group" data-testid={`custom-type-${type.id}`}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{type.name}</p>
                    <p className="text-xs text-muted-foreground">{type.fields?.length || 0} champs personnalisés</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenTypeDialog(type)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteType(type)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Custom Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmitType}>
            <DialogHeader>
              <DialogTitle>{editingType ? 'Modifier le type' : 'Nouveau type personnalisé'}</DialogTitle>
              <DialogDescription>Définissez un type avec ses champs personnalisés</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="type-name">Nom du type *</Label>
                <Input id="type-name" value={typeForm.name}
                  onChange={e => setTypeForm({...typeForm, name: e.target.value})}
                  placeholder="Ex: Vinyles, Figurines..." required data-testid="custom-type-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Champs personnalisés</Label>
                <div className="flex gap-2">
                  <Input value={newField.name} onChange={e => setNewField({...newField, name: e.target.value})}
                    placeholder="Nom du champ" className="flex-1" data-testid="custom-field-name-input"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addField())} />
                  <Select value={newField.type} onValueChange={v => setNewField({...newField, type: v})}>
                    <SelectTrigger className="w-[120px]" data-testid="custom-field-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(ft => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" onClick={addField} data-testid="add-field-btn">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {typeForm.fields.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {typeForm.fields.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{f.name}</span>
                          <Badge variant="outline" className="text-xs">{FIELD_TYPES.find(ft => ft.value === f.type)?.label || f.type}</Badge>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeField(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTypeDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="custom-type-submit-btn">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingType ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionsPage;
