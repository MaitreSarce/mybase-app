import { useEffect, useMemo, useState } from 'react';
import { notesApi, tagsApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { MultiSelect } from '../components/MultiSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import FileUploader from '../components/FileUploader';
import {
  Plus,
  Search,
  StickyNote,
  ListChecks,
  MoreVertical,
  Pencil,
  Trash2,
  Pin,
  Zap,
  X,
  FolderPlus,
  Folder,
  Loader2,
  Check,
  FileText,
} from 'lucide-react';
import { getDocumentLabel, getVideoEmbedUrl, isDocumentUrl, isImageUrl, isVideoUrl } from '../lib/mediaPreview';

const NOTE_TYPE_OPTIONS = [
  { value: 'note', label: 'Note' },
  { value: 'checklist', label: 'Liste' },
];

const createLocalId = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const DEFAULT_FORM = {
  sheet_id: '',
  title: '',
  body: '',
  note_type: 'note',
  checklist: [],
  tags: [],
  pinned: false,
  is_quick: false,
};

const NotesPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheets, setSheets] = useState([]);
  const [notes, setNotes] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSheet, setSelectedSheet] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [quickOnly, setQuickOnly] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newTag, setNewTag] = useState('');

  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [sheetEdit, setSheetEdit] = useState(null);
  const [sheetName, setSheetName] = useState('');
  const [sheetColor, setSheetColor] = useState('blue');

  const tagOpts = allTags.map((t) => ({ value: t.name, label: t.name }));

  const currentSheetIdForCreate = useMemo(() => {
    if (selectedSheet !== 'all') return selectedSheet;
    return sheets[0]?.id || '';
  }, [selectedSheet, sheets]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sheetsRes, notesRes, tagsRes] = await Promise.all([
        notesApi.getSheets(),
        notesApi.getAll(),
        tagsApi.getAll(),
      ]);
      const fetchedSheets = sheetsRes.data || [];
      const fetchedNotes = notesRes.data || [];
      setSheets(fetchedSheets);
      setNotes(fetchedNotes);
      setAllTags(tagsRes.data || []);
      if (!selectedSheet && fetchedSheets[0]?.id) setSelectedSheet(fetchedSheets[0].id);
    } catch {
      toast.error('Erreur chargement notes');
    } finally {
      setLoading(false);
    }
  };

  const openNoteDialog = (note = null, quick = false) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        sheet_id: note.sheet_id,
        title: note.title || '',
        body: note.body || '',
        note_type: note.note_type || 'note',
        checklist: note.checklist || [],
        tags: note.tags || [],
        pinned: !!note.pinned,
        is_quick: !!note.is_quick,
      });
    } else {
      setEditingNote(null);
      setFormData({
        ...DEFAULT_FORM,
        sheet_id: currentSheetIdForCreate,
        is_quick: quick,
      });
    }
    setNewChecklistText('');
    setNewTag('');
    setDialogOpen(true);
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!formData.sheet_id) {
      toast.error('Selectionnez une feuille');
      return;
    }
    setSaving(true);
    try {
      if (editingNote) {
        await notesApi.update(editingNote.id, formData);
        toast.success('Note mise a jour');
      } else {
        await notesApi.create(formData);
        toast.success('Note creee');
      }
      setDialogOpen(false);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (note) => {
    if (!window.confirm(`Supprimer "${note.title}" ?`)) return;
    try {
      await notesApi.delete(note.id);
      toast.success('Note supprimee');
      await fetchData();
    } catch {
      toast.error('Erreur suppression note');
    }
  };

  const handleTogglePinned = async (note) => {
    try {
      await notesApi.update(note.id, { pinned: !note.pinned });
      await fetchData();
    } catch {
      toast.error('Erreur mise a jour');
    }
  };

  const handleToggleChecklistItem = (itemId) => {
    setFormData((prev) => ({
      ...prev,
      checklist: prev.checklist.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
    }));
  };

  const addChecklistItem = () => {
    const text = newChecklistText.trim();
    if (!text) return;
    setFormData((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { id: createLocalId(), text, done: false }],
    }));
    setNewChecklistText('');
  };

  const removeChecklistItem = (id) => {
    setFormData((prev) => ({ ...prev, checklist: prev.checklist.filter((it) => it.id !== id) }));
  };

  const addTag = () => {
    const value = newTag.trim();
    if (!value || formData.tags.includes(value)) return;
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, value] }));
    setNewTag('');
  };

  const removeTag = (tag) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const openSheetDialog = (sheet = null) => {
    setSheetEdit(sheet);
    setSheetName(sheet?.name || '');
    setSheetColor(sheet?.color || 'blue');
    setSheetDialogOpen(true);
  };

  const saveSheet = async (e) => {
    e.preventDefault();
    if (!sheetName.trim()) return;
    try {
      if (sheetEdit) {
        await notesApi.updateSheet(sheetEdit.id, { name: sheetName.trim(), color: sheetColor });
        toast.success('Feuille mise a jour');
      } else {
        await notesApi.createSheet({ name: sheetName.trim(), color: sheetColor });
        toast.success('Feuille creee');
      }
      setSheetDialogOpen(false);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur feuille');
    }
  };

  const deleteSheet = async (sheet) => {
    if (!window.confirm(`Supprimer la feuille "${sheet.name}" ? Les notes seront deplacees.`)) return;
    try {
      await notesApi.deleteSheet(sheet.id);
      if (selectedSheet === sheet.id) setSelectedSheet('all');
      toast.success('Feuille supprimee');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur suppression feuille');
    }
  };

  const filteredNotes = notes.filter((note) => {
    if (selectedSheet !== 'all' && note.sheet_id !== selectedSheet) return false;
    if (quickOnly && !note.is_quick) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = String(note.title || '').toLowerCase();
      const body = String(note.body || '').toLowerCase();
      if (!title.includes(q) && !body.includes(q)) return false;
    }
    if (selectedTags.length > 0) {
      const tags = note.tags || [];
      if (!selectedTags.some((tag) => tags.includes(tag))) return false;
    }
    return true;
  });

  const getSheetName = (sheetId) => sheets.find((s) => s.id === sheetId)?.name || 'Feuille';

  const getPreviewAttachment = (note) => (note.attachments || []).find((a) => a?.preview_on_card);
  const previewUrl = (attachment) => {
    if (!attachment) return null;
    if (attachment.url) return attachment.url;
    if (attachment.filename) return `${(process.env.REACT_APP_BACKEND_URL || '')}/uploads/${attachment.filename}`;
    return null;
  };
  const isImagePreview = (attachment) => {
    const mime = String(attachment?.mime_type || '');
    if (mime.startsWith('image/')) return true;
    return isImageUrl(attachment?.url);
  };
  const isVideoPreview = (attachment) => {
    const mime = String(attachment?.mime_type || '');
    if (mime.startsWith('video/')) return true;
    return isVideoUrl(attachment?.url) || Boolean(getVideoEmbedUrl(attachment?.url));
  };
  const isDocumentPreview = (attachment) => {
    const mime = String(attachment?.mime_type || '').toLowerCase();
    return mime.includes('pdf') || mime.includes('sheet') || mime.includes('excel') || mime.includes('word') || mime.includes('csv') || isDocumentUrl(attachment?.url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notes-page">
      <div className="flex flex-col md:flex-row justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground mt-1">Feuilles, notes rapides, listes et medias</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => openSheetDialog()}><FolderPlus className="h-4 w-4 mr-2" />Nouvelle feuille</Button>
          <Button variant="secondary" onClick={() => openNoteDialog(null, true)}><Zap className="h-4 w-4 mr-2" />Note rapide</Button>
          <Button onClick={() => openNoteDialog()}><Plus className="h-4 w-4 mr-2" />Nouvelle note</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Folder className="h-4 w-4" />Feuilles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              type="button"
              onClick={() => setSelectedSheet('all')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm border ${selectedSheet === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-secondary/40'}`}
            >
              Toutes les feuilles
            </button>
            {sheets.map((sheet) => (
              <div key={sheet.id} className={`flex items-center gap-1 rounded-md border px-2 py-1 ${selectedSheet === sheet.id ? 'border-primary' : 'border-border'}`}>
                <button type="button" onClick={() => setSelectedSheet(sheet.id)} className="flex-1 text-left px-1 py-1.5 text-sm truncate">
                  {sheet.name}
                  <span className="text-xs text-muted-foreground ml-2">({sheet.note_count || 0})</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuItem onSelect={() => openSheetDialog(sheet)}><Pencil className="h-4 w-4 mr-2" />Modifier</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => deleteSheet(sheet)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher une note..." className="pl-10" />
            </div>
            {tagOpts.length > 0 && (
              <MultiSelect
                options={tagOpts}
                selected={selectedTags}
                onChange={setSelectedTags}
                placeholder="Tags"
                testId="notes-filter-tags"
              />
            )}
            <Button type="button" variant={quickOnly ? 'default' : 'outline'} onClick={() => setQuickOnly((v) => !v)}>
              <Zap className="h-4 w-4 mr-1" />Rapides
            </Button>
          </div>

          {filteredNotes.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <StickyNote className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucune note trouvee</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredNotes.map((note) => {
                const doneCount = (note.checklist || []).filter((i) => i.done).length;
                const totalCount = (note.checklist || []).length;
                return (
                  <Card key={note.id} className="bg-card border-border card-hover">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" className="text-left min-w-0 flex-1" onClick={() => openNoteDialog(note)}>
                          <CardTitle className="text-lg truncate">{note.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{getSheetName(note.sheet_id)}</span>
                            {note.note_type === 'checklist' ? <Badge variant="outline"><ListChecks className="h-3 w-3 mr-1" />Liste</Badge> : <Badge variant="outline"><StickyNote className="h-3 w-3 mr-1" />Note</Badge>}
                            {note.is_quick && <Badge variant="secondary"><Zap className="h-3 w-3 mr-1" />Rapide</Badge>}
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleTogglePinned(note)}>
                            <Pin className={`h-4 w-4 ${note.pinned ? 'text-amber-400 fill-amber-400' : ''}`} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                              <DropdownMenuItem onSelect={() => openNoteDialog(note)}><Pencil className="h-4 w-4 mr-2" />Modifier</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDeleteNote(note)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const preview = getPreviewAttachment(note);
                        const url = previewUrl(preview);
                        if (!url) return null;
                        if (isImagePreview(preview)) {
                          return <img src={url} alt={note.title} className="w-full h-32 object-cover rounded-md border border-border/40" />;
                        }
                        if (isVideoPreview(preview)) {
                          const embedUrl = getVideoEmbedUrl(url);
                          return embedUrl ? (
                            <iframe src={embedUrl} title={note.title} className="w-full h-32 rounded-md border border-border/40" allow="autoplay; encrypted-media; picture-in-picture" />
                          ) : (
                            <video src={url} className="w-full h-32 object-cover rounded-md border border-border/40" controls preload="metadata" />
                          );
                        }
                        if (isDocumentPreview(preview)) {
                          return (
                            <div className="w-full h-24 rounded-md border border-border/40 bg-secondary/20 flex items-center gap-3 px-3">
                              <FileText className="h-7 w-7 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{getDocumentLabel(preview)}</p>
                                <p className="text-xs text-muted-foreground truncate">{preview?.title || preview?.original_name || preview?.url}</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {note.note_type === 'checklist' ? (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{doneCount}/{totalCount} terminees</p>
                          {(note.checklist || []).slice(0, 4).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <span className={`h-1.5 w-1.5 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                              <span className={item.done ? 'line-through text-muted-foreground' : ''}>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground line-clamp-4">{note.body || 'Aucun contenu'}</p>
                      )}
                      {note.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveNote}>
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Modifier la note' : 'Nouvelle note'}</DialogTitle>
              <DialogDescription>Creer des notes, listes et notes rapides avec medias.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Feuille</Label>
                  <Select value={formData.sheet_id} onValueChange={(v) => setFormData((p) => ({ ...p, sheet_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir une feuille" /></SelectTrigger>
                    <SelectContent>
                      {sheets.map((sheet) => <SelectItem key={sheet.id} value={sheet.id}>{sheet.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.note_type} onValueChange={(v) => setFormData((p) => ({ ...p, note_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NOTE_TYPE_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} required />
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={!!formData.pinned} onCheckedChange={(v) => setFormData((p) => ({ ...p, pinned: !!v }))} />
                  Epingler
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={!!formData.is_quick} onCheckedChange={(v) => setFormData((p) => ({ ...p, is_quick: !!v }))} />
                  Note rapide
                </label>
              </div>

              {formData.note_type === 'checklist' ? (
                <div className="space-y-2">
                  <Label>Liste</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      placeholder="Nouvel element"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                    />
                    <Button type="button" variant="secondary" onClick={addChecklistItem}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-2">
                    {formData.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 rounded border border-border px-2 py-1.5">
                        <Checkbox checked={!!item.done} onCheckedChange={() => handleToggleChecklistItem(item.id)} />
                        <Input
                          value={item.text}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            checklist: prev.checklist.map((it) => (it.id === item.id ? { ...it, text: e.target.value } : it)),
                          }))}
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeChecklistItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Contenu</Label>
                  <Textarea rows={8} value={formData.body} onChange={(e) => setFormData((p) => ({ ...p, body: e.target.value }))} placeholder="Votre note..." />
                </div>
              )}

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    list="note-tag-suggestions"
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Ajouter un tag"
                  />
                  <Button type="button" variant="secondary" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                </div>
                <datalist id="note-tag-suggestions">
                  {allTags.map((t) => <option key={t.name} value={t.name} />)}
                </datalist>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">{tag}<X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} /></Badge>
                    ))}
                  </div>
                )}
              </div>

              {editingNote ? (
                <FileUploader itemType="note" itemId={editingNote.id} onUpdate={fetchData} />
              ) : (
                <p className="text-xs text-muted-foreground">Enregistrez d'abord la note pour ajouter des fichiers/photos/videos.</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                {editingNote ? 'Mettre a jour' : 'Creer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={sheetDialogOpen} onOpenChange={setSheetDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={saveSheet}>
            <DialogHeader>
              <DialogTitle>{sheetEdit ? 'Modifier la feuille' : 'Nouvelle feuille'}</DialogTitle>
              <DialogDescription>Organisez vos notes par feuilles.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={sheetName} onChange={(e) => setSheetName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <Select value={sheetColor} onValueChange={setSheetColor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Bleu</SelectItem>
                    <SelectItem value="green">Vert</SelectItem>
                    <SelectItem value="amber">Ambre</SelectItem>
                    <SelectItem value="rose">Rose</SelectItem>
                    <SelectItem value="violet">Violet</SelectItem>
                    <SelectItem value="zinc">Gris</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSheetDialogOpen(false)}>Annuler</Button>
              <Button type="submit">{sheetEdit ? 'Mettre a jour' : 'Creer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotesPage;
