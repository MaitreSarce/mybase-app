import { useState, useEffect, useRef } from 'react';
import { contentApi, tagsApi, mediaApi } from '../services/api';
import { useSearchParams } from 'react-router-dom';
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Plus, MoreVertical, Pencil, Trash2, BookOpen, Loader2,
  Search, X, FileText, ExternalLink, ChevronDown, ChevronRight, CornerDownRight,
  ArrowLeft, ArrowRight, Image as ImageIcon, Expand
} from 'lucide-react';
import { MultiSelect } from '../components/MultiSelect';
import { ViewToggle } from '../components/ViewToggle';
import ItemLinksManager from '../components/ItemLinksManager';
import FileUploader from '../components/FileUploader';
import { isImageUrl, isVideoUrl, isDocumentUrl, getVideoEmbedUrl, getDocumentLabel } from '../lib/mediaPreview';

const ContentPage = () => {
  const [items, setItems] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState([]);
  const [view, setView] = useState('table');
  const [newTag, setNewTag] = useState('');
  const [collapsedHierarchy, setCollapsedHierarchy] = useState({});
  const [hierarchyFilterContents, setHierarchyFilterContents] = useState([]);
  const [contentMedia, setContentMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);
  const [contentTab, setContentTab] = useState('list');
  const [contentNavPath, setContentNavPath] = useState([]);
  const [formData, setFormData] = useState({
    title: '', body: '', url: '', tags: [], parent_id: ''
  });
  const dropdownActionRef = useRef(false);
  const processedEditIdRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, tagsRes] = await Promise.all([contentApi.getAll(), tagsApi.getAll()]);
      setItems(itemsRes.data); setAllTags(tagsRes.data);
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  const handleOpenDialog = (item = null, parentId = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        body: item.body || '',
        url: item.url || '',
        tags: item.tags || [],
        parent_id: item.parent_id || '',
      });
    } else {
      setEditingItem(null);
      setFormData({ title: '', body: '', url: '', tags: [], parent_id: parentId || '' });
    }
    setDialogOpen(true);
  };

  useEffect(() => {
    if (loading) return;
    const editId = searchParams.get('editId');
    if (!editId || processedEditIdRef.current === editId) return;
    const target = items.find((it) => it.id === editId);
    if (!target) return;
    processedEditIdRef.current = editId;
    handleOpenDialog(target);
    const next = new URLSearchParams(searchParams);
    next.delete('editId');
    next.delete('editType');
    setSearchParams(next, { replace: true });
  }, [loading, items, searchParams, setSearchParams]);

  useEffect(() => {
    if (!dialogOpen || !editingItem?.id) {
      setContentMedia([]);
      setActiveMediaIndex(0);
      setCaptionDraft('');
      return;
    }
    loadContentMedia(editingItem.id);
  }, [dialogOpen, editingItem?.id]);

  useEffect(() => {
    const active = contentMedia[activeMediaIndex];
    setCaptionDraft(active?.title || '');
  }, [activeMediaIndex, contentMedia]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const payload = { ...formData, parent_id: formData.parent_id || null };
    try {
      if (editingItem) { await contentApi.update(editingItem.id, payload); toast.success('Contenu mis à jour'); }
      else { await contentApi.create(payload); toast.success('Contenu créé'); }
      setDialogOpen(false); fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); } finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    try { await contentApi.delete(item.id); toast.success(`"${item.title}" supprimé`); fetchData(); }
    catch { toast.error('Erreur'); }
  };

  const handlePrevMedia = () => {
    if (contentMedia.length < 2) return;
    setActiveMediaIndex((prev) => (prev - 1 + contentMedia.length) % contentMedia.length);
  };

  const handleNextMedia = () => {
    if (contentMedia.length < 2) return;
    setActiveMediaIndex((prev) => (prev + 1) % contentMedia.length);
  };

  const handleSaveCaption = async () => {
    const active = contentMedia[activeMediaIndex];
    if (!active) return;
    const nextTitle = captionDraft.trim();
    const currentTitle = String(active.title || '').trim();
    if (nextTitle === currentTitle) return;

    setSavingCaption(true);
    try {
      await mediaApi.update(active.id, { title: nextTitle || null });
      toast.success('Texte média mis à jour');
      if (editingItem?.id) await loadContentMedia(editingItem.id);
      await fetchData();
    } catch {
      toast.error('Erreur mise à jour texte média');
    } finally {
      setSavingCaption(false);
    }
  };

  const addTag = () => { if (newTag.trim() && !formData.tags.includes(newTag.trim())) { setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] }); setNewTag(''); } };
  const removeTag = (t) => setFormData({ ...formData, tags: formData.tags.filter(x => x !== t) });
  const getPreviewAttachment = (item) => (item.attachments || []).find((a) => a?.preview_on_card);
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

  const resolveMediaUrl = (media) => {
    if (!media) return null;
    if (media.kind === 'link') return media.url || null;
    if (media.access_url) return `${(process.env.REACT_APP_BACKEND_URL || '')}${media.access_url}`;
    if (media.url) return media.url;
    if (media.filename) return `${(process.env.REACT_APP_BACKEND_URL || '')}/uploads/${media.filename}`;
    return null;
  };

  const isImageMedia = (media, url) => {
    const mime = String(media?.mime_type || '');
    if (mime.startsWith('image/')) return true;
    return isImageUrl(url || media?.url);
  };

  const isVideoMedia = (media, url) => {
    const mime = String(media?.mime_type || '');
    if (mime.startsWith('video/')) return true;
    return isVideoUrl(url || media?.url) || Boolean(getVideoEmbedUrl(url || media?.url));
  };

  const loadContentMedia = async (contentId) => {
    if (!contentId) {
      setContentMedia([]);
      setActiveMediaIndex(0);
      setCaptionDraft('');
      return;
    }
    setMediaLoading(true);
    try {
      const res = await mediaApi.list({ item_type: 'content', item_id: contentId });
      const medias = res.data || [];
      setContentMedia(medias);
      setActiveMediaIndex(0);
      const first = medias[0];
      setCaptionDraft(first?.title || '');
    } catch {
      toast.error('Erreur chargement medias du contenu');
      setContentMedia([]);
      setActiveMediaIndex(0);
      setCaptionDraft('');
    } finally {
      setMediaLoading(false);
    }
  };

  const getChildren = (parentId) => items.filter((it) => it.parent_id === parentId);
  const rootItems = items.filter((it) => !it.parent_id);
  const currentContentNavParentId = contentNavPath.length ? contentNavPath[contentNavPath.length - 1] : null;
  const currentContentNavNode = currentContentNavParentId
    ? items.find((it) => it.id === currentContentNavParentId) || null
    : null;
  const isContentNavLeaf = !!currentContentNavNode && getChildren(currentContentNavNode.id).length === 0;
  const contentNavItems = items.filter((it) => (currentContentNavParentId ? it.parent_id === currentContentNavParentId : !it.parent_id));
  const contentNavBreadcrumb = contentNavPath
    .map((id) => items.find((it) => it.id === id))
    .filter(Boolean);
  const LEVEL_COLOR_CLASSES = [
    'bg-blue-500/18',
    'bg-orange-500/18',
    'bg-green-500/18',
    'bg-violet-500/18',
    'bg-yellow-500/18',
  ];
  const LEVEL_ACCENT_CLASSES = [
    'border-l-4 border-blue-400/80 bg-blue-500/12',
    'border-l-4 border-orange-400/80 bg-orange-500/12',
    'border-l-4 border-green-400/80 bg-green-500/12',
    'border-l-4 border-violet-400/80 bg-violet-500/12',
    'border-l-4 border-yellow-300/80 bg-yellow-500/12',
  ];
  const getLevelBgClass = (depth) => LEVEL_COLOR_CLASSES[depth % LEVEL_COLOR_CLASSES.length];
  const getLevelAccentClass = (depth) => LEVEL_ACCENT_CLASSES[depth % LEVEL_ACCENT_CLASSES.length];

  useEffect(() => {
    if (!items.length || Object.keys(collapsedHierarchy).length > 0) return;
    const next = {};
    items.forEach((item) => {
      if (items.some((candidate) => candidate.parent_id === item.id)) next[item.id] = true;
    });
    setCollapsedHierarchy(next);
  }, [items, collapsedHierarchy]);

  const getDescendantContentIds = (contentId) => {
    const directChildren = getChildren(contentId);
    const descendantIds = [];
    directChildren.forEach((child) => {
      descendantIds.push(child.id);
      descendantIds.push(...getDescendantContentIds(child.id));
    });
    return descendantIds;
  };

  const getAncestorContentIds = (contentId) => {
    const ancestors = [];
    const seen = new Set();
    let current = items.find((it) => it.id === contentId);
    while (current?.parent_id && !seen.has(current.parent_id)) {
      seen.add(current.parent_id);
      ancestors.push(current.parent_id);
      current = items.find((it) => it.id === current.parent_id);
    }
    return ancestors;
  };

  const buildContentFilterOptions = (parentId = null, seen = new Set()) => {
    const branch = items
      .filter((it) => (parentId ? it.parent_id === parentId : !it.parent_id))
      .map((item) => {
        if (seen.has(item.id)) return null;
        const nextSeen = new Set(seen);
        nextSeen.add(item.id);
        return {
          value: item.id,
          label: item.title,
          children: buildContentFilterOptions(item.id, nextSeen),
        };
      })
      .filter(Boolean);
    return branch;
  };
  const contentFilterOpts = buildContentFilterOptions();

  const selectedHierarchyContentIds = hierarchyFilterContents.length === 0
    ? null
    : new Set(hierarchyFilterContents.flatMap((contentId) => [contentId, ...getDescendantContentIds(contentId)]));

  const filteredItems = items.filter(item => {
    if (searchQuery && !item.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !item.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterTags.length && !filterTags.some(t => item.tags?.includes(t))) return false;
    if (selectedHierarchyContentIds && !selectedHierarchyContentIds.has(item.id)) return false;
    return true;
  });

  const filteredItemIds = new Set(filteredItems.map((item) => item.id));
  const visibleHierarchyIds = (searchQuery || filterTags.length || hierarchyFilterContents.length)
    ? (() => {
        const ids = new Set(filteredItemIds);
        filteredItems.forEach((item) => {
          getAncestorContentIds(item.id).forEach((ancestorId) => ids.add(ancestorId));
        });
        return ids;
      })()
    : null;

  const buildHierarchyRows = () => {
    const rows = [];
    const pushItem = (item, depth = 0) => {
      if (visibleHierarchyIds && !visibleHierarchyIds.has(item.id)) return;
      rows.push({ item, depth });
      if (collapsedHierarchy[item.id]) return;
      getChildren(item.id).forEach((child) => pushItem(child, depth + 1));
    };
    rootItems.forEach((root) => pushItem(root, 0));
    return rows;
  };

  const hierarchyRows = buildHierarchyRows();

  useEffect(() => {
    if (!contentNavPath.length) return;
    const validIds = new Set(items.map((it) => it.id));
    const cleaned = contentNavPath.filter((id) => validIds.has(id));
    if (cleaned.length !== contentNavPath.length) setContentNavPath(cleaned);
  }, [items, contentNavPath]);

  const toggleCollapse = (itemId) => {
    setCollapsedHierarchy((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };
  const expandAllHierarchy = () => {
    setCollapsedHierarchy({});
  };
  const collapseAllHierarchy = () => {
    const next = {};
    items.forEach((item) => {
      if (getChildren(item.id).length > 0) next[item.id] = true;
    });
    setCollapsedHierarchy(next);
  };

  const tagOpts = allTags.map(t => ({ value: t.name, label: t.name }));
  const disallowedParentIds = editingItem
    ? new Set([editingItem.id, ...getDescendantContentIds(editingItem.id)])
    : new Set();
  const pruneContentOptions = (options) => options
    .map((opt) => {
      const children = pruneContentOptions(opt.children || []);
      if (disallowedParentIds.has(opt.value)) return null;
      return { ...opt, children };
    })
    .filter(Boolean);
  const parentContentOpts = pruneContentOptions(contentFilterOpts);
  const activeMedia = contentMedia[activeMediaIndex] || null;
  const activeMediaUrl = resolveMediaUrl(activeMedia);
  const activeMediaIsImage = activeMedia && activeMediaUrl ? isImageMedia(activeMedia, activeMediaUrl) : false;
  const activeMediaIsVideo = activeMedia && activeMediaUrl ? isVideoMedia(activeMedia, activeMediaUrl) : false;
  const activeMediaEmbedUrl = activeMedia?.kind === 'link' && activeMediaUrl ? getVideoEmbedUrl(activeMediaUrl) : null;

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="space-y-6" data-testid="content-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Contenu</h1><p className="text-muted-foreground mt-1">Recettes, tutoriels, DIY et plus</p></div>
        <Button onClick={() => handleOpenDialog()} data-testid="add-content-btn"><Plus className="h-4 w-4 mr-2" />Nouveau contenu</Button>
      </div>

      <Tabs value={contentTab} onValueChange={setContentTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Liste</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            {tagOpts.length > 0 && <MultiSelect options={tagOpts} selected={filterTags} onChange={setFilterTags} placeholder="Tags" testId="filter-tags" />}
            <MultiSelect
              options={contentFilterOpts}
              selected={hierarchyFilterContents}
              onChange={setHierarchyFilterContents}
              placeholder="Contenus"
              testId="content-hierarchy-filter"
              hierarchical
            />
            {hierarchyFilterContents.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setHierarchyFilterContents([])}>
                Réinitialiser
              </Button>
            )}
            {view === 'table' && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={expandAllHierarchy}>
                  Tout déplier
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={collapseAllHierarchy}>
                  Tout replier
                </Button>
              </>
            )}
            <ViewToggle view={view} onChange={setView} />
          </div>

          {filteredItems.length === 0 ? (
            <Card className="bg-card border-border border-dashed"><CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-medium">Aucun contenu</h3></CardContent></Card>
          ) : view === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                return (
                  <Card key={item.id} className="bg-card border-border card-hover group" data-testid={`content-card-${item.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenDialog(item)}>
                        <div className="flex-1 min-w-0"><CardTitle className="text-lg truncate">{item.title}</CardTitle></div>
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
                      {(() => {
                        const preview = getPreviewAttachment(item);
                        const url = previewUrl(preview);
                        if (!url) return null;
                        if (isImagePreview(preview)) {
                          return <img src={url} alt={item.title} className="w-full h-32 object-cover rounded-md mb-2 border border-border/40" />;
                        }
                        if (isVideoPreview(preview)) {
                          const embedUrl = getVideoEmbedUrl(url);
                          return embedUrl ? (
                            <iframe src={embedUrl} title={item.title} className="w-full h-32 rounded-md mb-2 border border-border/40" allow="autoplay; encrypted-media; picture-in-picture" />
                          ) : (
                            <video src={url} className="w-full h-32 object-cover rounded-md mb-2 border border-border/40" controls preload="metadata" />
                          );
                        }
                        if (isDocumentPreview(preview)) {
                          return (
                            <div className="w-full h-32 rounded-md mb-2 border border-border/40 bg-secondary/20 flex items-center gap-3 px-3">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{getDocumentLabel(preview)}</p>
                                <p className="text-xs text-muted-foreground truncate">{preview?.title || preview?.original_name || preview?.url}</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {item.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>}
                      {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-primary hover:underline flex items-center gap-1 mb-2"><ExternalLink className="h-3 w-3" />{item.url.replace(/^https?:\/\//, '').substring(0, 40)}</a>}
                      {item.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{item.tags.slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table><TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Tags</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                <TableBody>{hierarchyRows.map(({ item, depth }) => {
                  const children = getChildren(item.id);
                  const hasChildren = children.length > 0;
                  const isCollapsed = !!collapsedHierarchy[item.id];
                  const isDirectMatch = filteredItemIds.has(item.id);
                  return (<TableRow key={item.id} className={`cursor-pointer hover:bg-secondary/30 ${getLevelBgClass(depth)}`} onClick={() => { if (!dropdownActionRef.current) handleOpenDialog(item); }}>
                    <TableCell className="font-medium">
                      <div className={`flex items-center gap-2 rounded-md px-2 py-1 ${getLevelAccentClass(depth)}`} style={{ paddingLeft: `${depth * 20}px` }}>
                        {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        {hasChildren ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); toggleCollapse(item.id); }}
                            title={isCollapsed ? 'Déplier' : 'Replier'}
                          >
                            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        ) : (
                          <span className="w-6" />
                        )}
                        <span className={isDirectMatch || !visibleHierarchyIds ? '' : 'text-muted-foreground'}>
                          {item.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{item.tags?.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-xs mr-1">{t}</Badge>)}</TableCell>
                    <TableCell><DropdownMenu onOpenChange={(open) => { if (!open) { dropdownActionRef.current = true; setTimeout(() => { dropdownActionRef.current = false; }, 300); } }}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                        <DropdownMenuItem onSelect={() => handleOpenDialog(item)}><Pencil className="h-4 w-4 mr-2" />Modifier</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenDialog(null, item.id)}><Plus className="h-4 w-4 mr-2" />Sous-contenu</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDelete(item)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>);
                })}</TableBody></Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="navigation" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={contentNavPath.length === 0}
              onClick={() => setContentNavPath((prev) => prev.slice(0, -1))}
            >
              Retour
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={contentNavPath.length === 0}
              onClick={() => setContentNavPath([])}
            >
              Niveau 1
            </Button>
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>Racine</span>
              {contentNavBreadcrumb.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => setContentNavPath(contentNavPath.slice(0, idx + 1))}
                >
                  <ChevronRight className="h-3 w-3" />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          {isContentNavLeaf && currentContentNavNode ? (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{currentContentNavNode.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Vue détaillée du dernier niveau</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleOpenDialog(currentContentNavNode)}>
                    Modifier
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const preview = getPreviewAttachment(currentContentNavNode);
                  const url = previewUrl(preview);
                  if (!url) return null;
                  if (isImagePreview(preview)) {
                    return <img src={url} alt={currentContentNavNode.title} className="w-full max-h-72 rounded-md object-cover border border-border/40" />;
                  }
                  if (isVideoPreview(preview)) {
                    const embedUrl = getVideoEmbedUrl(url);
                    return embedUrl ? (
                      <iframe src={embedUrl} title={currentContentNavNode.title} className="w-full h-72 rounded-md border border-border/40" allow="autoplay; encrypted-media; picture-in-picture" />
                    ) : (
                      <video src={url} className="w-full max-h-72 rounded-md border border-border/40" controls preload="metadata" />
                    );
                  }
                  if (isDocumentPreview(preview)) {
                    return (
                      <div className="w-full rounded-md border border-border/40 bg-secondary/20 p-3 flex items-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{getDocumentLabel(preview)}</p>
                          <p className="text-xs text-muted-foreground truncate">{preview?.title || preview?.original_name || preview?.url}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                {currentContentNavNode.body && (
                  <div className="rounded-md border border-border/40 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Contenu</p>
                    <p className="text-sm whitespace-pre-wrap">{currentContentNavNode.body}</p>
                  </div>
                )}
                {currentContentNavNode.url && (
                  <a
                    href={currentContentNavNode.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir la source
                  </a>
                )}
                {currentContentNavNode.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {currentContentNavNode.tags.map((tag) => (
                      <Badge key={`${currentContentNavNode.id}-${tag}`} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
                {(currentContentNavNode.attachments || []).length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Médias liés</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {(currentContentNavNode.attachments || []).map((att, idx) => {
                        const src = previewUrl(att);
                        if (!src || !isImagePreview(att)) return null;
                        return <img key={`${currentContentNavNode.id}-att-${idx}`} src={src} alt={att?.title || currentContentNavNode.title} className="h-24 w-full rounded-md object-cover border border-border/40" />;
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : contentNavItems.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun sous-contenu</h3>
                <p className="text-sm text-muted-foreground">Ce niveau ne contient pas encore de carte enfant.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {contentNavItems.map((item) => {
                const childCount = getChildren(item.id).length;
                const preview = getPreviewAttachment(item);
                const url = previewUrl(preview);
                return (
                  <Card key={`nav-content-${item.id}`} className="bg-card border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base truncate">{item.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {childCount} sous-contenu{childCount > 1 ? 's' : ''}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {url && isImagePreview(preview) && (
                        <img src={url} alt={item.title} className="h-28 w-full rounded-md object-cover border border-border/40" />
                      )}
                      {item.body && <p className="text-sm text-muted-foreground line-clamp-3">{item.body}</p>}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {item.url.replace(/^https?:\/\//, '').slice(0, 45)}
                        </a>
                      )}
                      {item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 4).map((tag) => (
                            <Badge key={`${item.id}-${tag}`} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setContentNavPath((prev) => [...prev, item.id])}
                        >
                          Ouvrir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <form onSubmit={handleSubmit} className="min-w-0">
            <DialogHeader><DialogTitle>{editingItem ? 'Modifier le contenu' : 'Nouveau contenu'}</DialogTitle><DialogDescription>Gérez votre contenu</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Titre *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required data-testid="content-title-input" /></div>
              <div className="space-y-2"><Label>Contenu</Label><Textarea value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})} rows={6} placeholder="Contenu complet..." /></div>
              <div className="space-y-2"><Label>Lien / URL source</Label><Input type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." data-testid="content-url-input" /></div>
              <div className="space-y-2">
                <Label>Contenu parent</Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <MultiSelect
                      options={parentContentOpts}
                      selected={formData.parent_id ? [formData.parent_id] : []}
                      onChange={(values) => {
                        const next = values.length ? values[values.length - 1] : '';
                        setFormData({ ...formData, parent_id: next });
                      }}
                      placeholder="Contenu parent"
                      testId="content-parent-select"
                      hierarchical
                    />
                  </div>
                  {formData.parent_id && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({ ...formData, parent_id: '' })}>
                      Racine
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2"><Label>Tags</Label>
                <div className="flex flex-col sm:flex-row gap-2 min-w-0"><Input value={newTag} list="content-tag-suggestions" onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Tag..." /><Button type="button" variant="secondary" onClick={addTag}><Plus className="h-4 w-4" /></Button></div>
                <datalist id="content-tag-suggestions">{allTags.map(t => <option key={t.name} value={t.name} />)}</datalist>
                {formData.tags.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{formData.tags.map(t => <Badge key={t} variant="secondary" className="gap-1">{t}<X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(t)} /></Badge>)}</div>}
              </div>
              {editingItem && (
                <div className="space-y-3 rounded-lg border border-border/60 p-3 bg-muted/10">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Médias du contenu
                    </Label>
                    {mediaLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>

                  {!mediaLoading && contentMedia.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun média lié à ce contenu.</p>
                  ) : (
                    <>
                      {activeMedia && (
                        <div className="space-y-3">
                          <div className="relative rounded-md border border-border/40 bg-secondary/20 p-2">
                            {contentMedia.length > 1 && (
                              <>
                                <Button type="button" variant="secondary" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 z-10" onClick={handlePrevMedia}>
                                  <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 z-10" onClick={handleNextMedia}>
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {activeMediaIsImage && (
                              <button
                                type="button"
                                className="w-full"
                                onClick={() => setMediaPreviewOpen(true)}
                                title="Ouvrir en grand"
                              >
                                <img src={activeMediaUrl} alt={activeMedia.title || activeMedia.original_name || 'media'} className="w-full h-52 object-contain rounded-md" />
                              </button>
                            )}
                            {!activeMediaIsImage && activeMediaIsVideo && (
                              activeMediaEmbedUrl ? (
                                <button
                                  type="button"
                                  className="w-full"
                                  onClick={() => setMediaPreviewOpen(true)}
                                  title="Ouvrir en grand"
                                >
                                  <iframe src={activeMediaEmbedUrl} title={activeMedia.title || 'video'} className="w-full h-52 rounded-md border border-border/40" allow="autoplay; encrypted-media; picture-in-picture" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="w-full"
                                  onClick={() => setMediaPreviewOpen(true)}
                                  title="Ouvrir en grand"
                                >
                                  <video src={activeMediaUrl} className="w-full h-52 rounded-md" controls preload="metadata" />
                                </button>
                              )
                            )}
                            {!activeMediaIsImage && !activeMediaIsVideo && (
                              <div className="h-52 rounded-md border border-border/40 bg-secondary/20 flex items-center justify-center text-muted-foreground text-sm">
                                Aperçu indisponible pour ce type de média
                              </div>
                            )}
                            {activeMedia && (
                              <div className="absolute top-3 right-3">
                                <Button type="button" variant="secondary" size="sm" onClick={() => setMediaPreviewOpen(true)}>
                                  <Expand className="h-4 w-4 mr-1" />
                                  Agrandir
                                </Button>
                              </div>
                            )}
                          </div>

                          {contentMedia.length > 1 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-1">
                                {contentMedia.map((m, idx) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    className={`h-2.5 w-2.5 rounded-full ${idx === activeMediaIndex ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                                    aria-label={`Média ${idx + 1}`}
                                    onClick={() => setActiveMediaIndex(idx)}
                                  />
                                ))}
                              </div>
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {contentMedia.map((m, idx) => {
                                  const thumbUrl = resolveMediaUrl(m);
                                  const thumbIsImage = m && thumbUrl ? isImageMedia(m, thumbUrl) : false;
                                  return (
                                    <button
                                      key={`${m.id}-thumb`}
                                      type="button"
                                      onClick={() => setActiveMediaIndex(idx)}
                                      className={`h-14 w-20 shrink-0 rounded border ${idx === activeMediaIndex ? 'border-primary' : 'border-border/40'} bg-secondary/20`}
                                      title={m.title || m.original_name || `Media ${idx + 1}`}
                                    >
                                      {thumbIsImage ? (
                                        <img src={thumbUrl} alt={m.title || 'media'} className="h-full w-full object-cover rounded" />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground px-1">Media {idx + 1}</div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {activeMedia && (
                            <Dialog open={mediaPreviewOpen} onOpenChange={setMediaPreviewOpen}>
                              <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-hidden">
                                <DialogHeader>
                                  <DialogTitle>{activeMedia.title || activeMedia.original_name || 'Média'}</DialogTitle>
                                  <DialogDescription>Aperçu en grand format</DialogDescription>
                                </DialogHeader>
                                {contentMedia.length > 1 && (
                                  <div className="flex items-center justify-between gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={handlePrevMedia}>
                                      <ArrowLeft className="h-4 w-4 mr-1" />
                                      Précédent
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                      Média {Math.min(activeMediaIndex + 1, contentMedia.length)} / {contentMedia.length}
                                    </p>
                                    <Button type="button" variant="outline" size="sm" onClick={handleNextMedia}>
                                      Suivant
                                      <ArrowRight className="h-4 w-4 ml-1" />
                                    </Button>
                                  </div>
                                )}
                                <div className="relative rounded-md border border-border/40 bg-secondary/10 p-2">
                                  {contentMedia.length > 1 && (
                                    <>
                                      <Button type="button" variant="secondary" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 z-10" onClick={handlePrevMedia}>
                                        <ArrowLeft className="h-4 w-4" />
                                      </Button>
                                      <Button type="button" variant="secondary" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 z-10" onClick={handleNextMedia}>
                                        <ArrowRight className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  {activeMediaIsImage && activeMediaUrl && (
                                    <img src={activeMediaUrl} alt={activeMedia.title || 'media'} className="w-full max-h-[70vh] object-contain rounded-md" />
                                  )}
                                  {!activeMediaIsImage && activeMediaIsVideo && activeMediaUrl && (
                                    activeMediaEmbedUrl ? (
                                      <iframe src={activeMediaEmbedUrl} title={activeMedia.title || 'video'} className="w-full h-[70vh] rounded-md border border-border/40" allow="autoplay; encrypted-media; picture-in-picture" />
                                    ) : (
                                      <video src={activeMediaUrl} className="w-full max-h-[70vh] rounded-md" controls preload="metadata" />
                                    )
                                  )}
                                  {!activeMediaIsImage && !activeMediaIsVideo && (
                                    <div className="h-[40vh] rounded-md border border-border/40 bg-secondary/20 flex items-center justify-center text-muted-foreground text-sm">
                                      Aperçu indisponible pour ce type de média
                                    </div>
                                  )}
                                </div>
                                <div className="rounded-md border border-border/40 bg-muted/20 p-3">
                                  <p className="text-xs text-muted-foreground mb-1">Commentaire du média</p>
                                  <p className="text-sm whitespace-pre-wrap">
                                    {captionDraft?.trim() || activeMedia.title || 'Aucun commentaire pour ce média'}
                                  </p>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}

                          <div className="space-y-2">
                            <Label>Texte sous le média (légende)</Label>
                            <Textarea
                              value={captionDraft}
                              onChange={(e) => setCaptionDraft(e.target.value)}
                              placeholder="Ajoutez un texte descriptif pour ce média..."
                              rows={3}
                            />
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                Média {Math.min(activeMediaIndex + 1, contentMedia.length)} / {contentMedia.length}
                              </p>
                              <Button type="button" size="sm" onClick={handleSaveCaption} disabled={savingCaption}>
                                {savingCaption && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Enregistrer le texte
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {editingItem && <ItemLinksManager itemType="content" itemId={editingItem.id} itemName={editingItem.title} onUpdate={fetchData} />}
              {editingItem && <FileUploader itemType="content" itemId={editingItem.id} onUpdate={async () => { await fetchData(); await loadContentMedia(editingItem.id); }} />}
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





