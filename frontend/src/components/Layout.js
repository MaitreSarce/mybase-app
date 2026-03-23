import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, mediaApi, storageApi, uiPrefsApi } from '../services/api';
import {
  LayoutDashboard,
  Layers,
  Package,
  Heart,
  FolderKanban,
  BookOpen,
  TrendingUp,
  LineChart,
  Search,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Bell,
  Hash,
  Network,
  CalendarDays,
  Settings,
  Trash2,
  FileImage,
  FileVideo,
  Link2,
  File,
  House,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  RotateCcw,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { id: 'dashboard', path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'collections', path: '/collections', label: 'Collections', icon: Layers },
  { id: 'inventory', path: '/inventory', label: 'Inventaire', icon: Package },
  { id: 'wishlist', path: '/wishlist', label: 'Liste de souhaits', icon: Heart },
  { id: 'projects', path: '/projects', label: 'Projets', icon: FolderKanban },
  { id: 'content', path: '/content', label: 'Contenu', icon: BookOpen },
  { id: 'notes', path: '/notes', label: 'Notes', icon: StickyNote },
  { id: 'portfolio', path: '/portfolio', label: 'Portefeuille', icon: TrendingUp },
  { id: 'asset-watchlist', path: '/asset-watchlist', label: 'Actif WatchList', icon: LineChart },
  { id: 'alerts', path: '/alerts', label: 'Alertes', icon: Bell },
  { id: 'tags', path: '/tags', label: 'Tags', icon: Hash },
  { id: 'mindmap', path: '/mindmap', label: 'Carte Mentale', icon: Network },
  { id: 'calendar', path: '/calendar', label: 'Calendrier', icon: CalendarDays },
  { id: 'home-assistant', path: '/home-assistant', label: 'Home Assistant', icon: House },
];

const NAV_BY_ID = Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item]));
const NAV_STORAGE_KEY = 'mybase_nav_groups_v1';
const NAV_COLLAPSE_KEY = 'mybase_nav_group_collapse_v1';

const buildDefaultNavGroups = () => [
  {
    id: 'main',
    name: 'Navigation',
    itemIds: NAV_ITEMS.map((item) => item.id),
  },
];

const sanitizeNavGroups = (incoming) => {
  if (!Array.isArray(incoming) || incoming.length === 0) return buildDefaultNavGroups();

  const allowed = new Set(NAV_ITEMS.map((item) => item.id));
  const seen = new Set();
  const cleaned = [];

  incoming.forEach((group, index) => {
    if (!group || !Array.isArray(group.itemIds)) return;
    const itemIds = [];
    group.itemIds.forEach((id) => {
      if (!allowed.has(id) || seen.has(id)) return;
      seen.add(id);
      itemIds.push(id);
    });

    cleaned.push({
      id: String(group.id || `group_${index + 1}`),
      name: String(group.name || `Groupe ${index + 1}`),
      itemIds,
    });
  });

  if (cleaned.length === 0) return buildDefaultNavGroups();

  const missing = NAV_ITEMS.map((item) => item.id).filter((id) => !seen.has(id));
  if (missing.length > 0) cleaned[0].itemIds = [...cleaned[0].itemIds, ...missing];

  return cleaned;
};

const toMb = (bytes) => `${(Number(bytes || 0) / (1024 * 1024)).toFixed(2)} Mo`;
const baseUrl = process.env.REACT_APP_BACKEND_URL || '';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [menuConfigOpen, setMenuConfigOpen] = useState(false);
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false);
  const [savingPath, setSavingPath] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);
  const [storagePath, setStoragePath] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState(null);
  const [mediaKindFilter, setMediaKindFilter] = useState('all');
  const [accountEmail, setAccountEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const [navGroups, setNavGroups] = useState(() => {
    try {
      const stored = localStorage.getItem(NAV_STORAGE_KEY);
      return stored ? sanitizeNavGroups(JSON.parse(stored)) : buildDefaultNavGroups();
    } catch {
      return buildDefaultNavGroups();
    }
  });
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const stored = localStorage.getItem(NAV_COLLAPSE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [newGroupName, setNewGroupName] = useState('');
  const [sidebarPrefsReady, setSidebarPrefsReady] = useState(false);

  const importInputRef = useRef(null);
  const pendingSidebarPrefsRef = useRef({});
  const sidebarSaveTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadSidebarPreferences = async () => {
      try {
        const res = await uiPrefsApi.getSidebar();
        if (cancelled) return;
        const data = res?.data || {};

        if (Array.isArray(data.nav_groups)) {
          const nextGroups = sanitizeNavGroups(data.nav_groups);
          setNavGroups(nextGroups);
          localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(nextGroups));
        }
        if (data.collapsed_groups && typeof data.collapsed_groups === 'object') {
          setCollapsedGroups(data.collapsed_groups);
          localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(data.collapsed_groups));
        }
        if (typeof data.collapsed === 'boolean') {
          setCollapsed(data.collapsed);
        }
      } catch {
        // Keep local fallback only if API preferences are unavailable.
      } finally {
        if (!cancelled) setSidebarPrefsReady(true);
      }
    };
    loadSidebarPreferences();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (sidebarSaveTimeoutRef.current) clearTimeout(sidebarSaveTimeoutRef.current);
  }, []);

  const queueSidebarSave = useCallback((partial) => {
    if (!sidebarPrefsReady) return;
    pendingSidebarPrefsRef.current = { ...pendingSidebarPrefsRef.current, ...partial };
    if (sidebarSaveTimeoutRef.current) clearTimeout(sidebarSaveTimeoutRef.current);
    sidebarSaveTimeoutRef.current = setTimeout(async () => {
      const payload = pendingSidebarPrefsRef.current;
      pendingSidebarPrefsRef.current = {};
      try {
        await uiPrefsApi.saveSidebar(payload);
      } catch {
        // Keep local fallback only if remote save fails.
      }
    }, 400);
  }, [sidebarPrefsReady]);

  useEffect(() => {
    try {
      localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(navGroups));
    } catch {
      // ignore localStorage failures (private mode/quota)
    }
    queueSidebarSave({ nav_groups: navGroups });
  }, [navGroups, queueSidebarSave]);

  useEffect(() => {
    try {
      localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(collapsedGroups));
    } catch {
      // ignore localStorage failures (private mode/quota)
    }
    queueSidebarSave({ collapsed_groups: collapsedGroups });
  }, [collapsedGroups, queueSidebarSave]);

  useEffect(() => {
    queueSidebarSave({ collapsed });
  }, [collapsed, queueSidebarSave]);

  const findItemGroupContext = (itemId, groups = navGroups) => {
    for (let gIndex = 0; gIndex < groups.length; gIndex += 1) {
      const index = groups[gIndex].itemIds.indexOf(itemId);
      if (index >= 0) return { groupIndex: gIndex, itemIndex: index };
    }
    return null;
  };

  const moveItemWithinGroup = (itemId, direction) => {
    setNavGroups((prev) => {
      const groups = prev.map((g) => ({ ...g, itemIds: [...g.itemIds] }));
      const context = findItemGroupContext(itemId, groups);
      if (!context) return prev;

      const { groupIndex, itemIndex } = context;
      const group = groups[groupIndex];
      const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
      if (targetIndex < 0 || targetIndex >= group.itemIds.length) return prev;

      const tmp = group.itemIds[itemIndex];
      group.itemIds[itemIndex] = group.itemIds[targetIndex];
      group.itemIds[targetIndex] = tmp;
      return groups;
    });
  };

  const moveItemToGroup = (itemId, targetGroupId) => {
    setNavGroups((prev) => {
      const groups = prev.map((g) => ({ ...g, itemIds: [...g.itemIds] }));
      const context = findItemGroupContext(itemId, groups);
      if (!context) return prev;

      const source = groups[context.groupIndex];
      source.itemIds.splice(context.itemIndex, 1);
      const target = groups.find((g) => g.id === targetGroupId);
      if (!target) return prev;
      target.itemIds.push(itemId);
      return groups;
    });
  };

  const renameGroup = (groupId, name) => {
    setNavGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name: name || 'Groupe' } : g)));
  };

  const addGroup = () => {
    const title = newGroupName.trim() || `Groupe ${navGroups.length + 1}`;
    setNavGroups((prev) => [...prev, { id: `group_${Date.now()}`, name: title, itemIds: [] }]);
    setNewGroupName('');
  };

  const deleteGroup = (groupId) => {
    setNavGroups((prev) => {
      if (prev.length <= 1) return prev;
      const groups = prev.map((g) => ({ ...g, itemIds: [...g.itemIds] }));
      const idx = groups.findIndex((g) => g.id === groupId);
      if (idx < 0) return prev;

      const removed = groups[idx];
      const fallback = groups.find((g, index) => index !== idx);
      if (fallback) fallback.itemIds.push(...removed.itemIds);
      return groups.filter((g) => g.id !== groupId);
    });
  };

  const resetMenu = () => {
    const defaults = buildDefaultNavGroups();
    setNavGroups(defaults);
    setCollapsedGroups({});
    toast.success('Menu reinitialise');
  };

  const toggleGroupCollapsed = (groupId) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await storageApi.getSettings();
      setStorageInfo(res.data);
      setStoragePath(res.data?.storage_root || '');
    } catch {
      toast.error('Erreur chargement parametres stockage');
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadMediaItems = async () => {
    setMediaLoading(true);
    try {
      const res = await mediaApi.list();
      setMediaItems(res.data || []);
    } catch {
      toast.error('Erreur chargement medias');
    } finally {
      setMediaLoading(false);
    }
  };

  const toMediaUrl = (media) => {
    if (media?.kind === 'link') return media?.url || null;
    if (!media?.access_url) return null;
    return `${baseUrl}${media.access_url}`;
  };

  const isImageMedia = (media) => {
    const mime = String(media?.mime_type || '');
    if (mime.startsWith('image/')) return true;
    const url = String(media?.url || '').toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some((ext) => url.endsWith(ext));
  };

  const isVideoMedia = (media) => {
    const mime = String(media?.mime_type || '');
    if (mime.startsWith('video/')) return true;
    const url = String(media?.url || '').toLowerCase();
    return ['.mp4', '.webm', '.mov', '.m4v', '.avi'].some((ext) => url.endsWith(ext));
  };

  const getMediaIcon = (media) => {
    if (media?.kind === 'link') return Link2;
    if (isImageMedia(media)) return FileImage;
    if (isVideoMedia(media)) return FileVideo;
    return File;
  };

  const handleDeleteMedia = async (media) => {
    const target = media?.title || media?.original_name || media?.url || 'ce media';
    if (!window.confirm(`Supprimer "${target}" ?`)) return;
    setDeletingMediaId(media.id);
    try {
      await mediaApi.delete(media.id);
      await loadMediaItems();
      await loadSettings();
      toast.success('Media supprime');
    } catch {
      toast.error('Erreur suppression media');
    } finally {
      setDeletingMediaId(null);
    }
  };

  const openSettings = async () => {
    setAccountEmail(user?.email || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSettingsOpen(true);
    await Promise.all([loadSettings(), loadMediaItems()]);
  };

  const handleSaveAccount = async () => {
    const emailTrimmed = (accountEmail || '').trim().toLowerCase();
    const wantsEmail = emailTrimmed && emailTrimmed !== (user?.email || '').toLowerCase();
    const wantsPassword = !!(newPassword || '').trim();

    if (!wantsEmail && !wantsPassword) {
      toast.info('Aucun changement a enregistrer');
      return;
    }

    if (wantsPassword && newPassword !== confirmPassword) {
      toast.error('Confirmation du nouveau mot de passe invalide');
      return;
    }

    if (!currentPassword) {
      toast.error('Mot de passe actuel requis');
      return;
    }

    setSavingAccount(true);
    try {
      const payload = {
        email: wantsEmail ? emailTrimmed : undefined,
        current_password: currentPassword,
        new_password: wantsPassword ? newPassword : undefined,
      };
      const res = await authApi.updateAccount(payload);
      if (res?.data?.email) setAccountEmail(res.data.email);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Compte mis a jour');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur mise a jour du compte');
    } finally {
      setSavingAccount(false);
    }
  };
  const handleSavePath = async () => {
    if (!storagePath.trim()) return;
    setSavingPath(true);
    try {
      const res = await storageApi.setStoragePath(storagePath.trim());
      toast.success(res.data?.restart_required ? 'Chemin enregistre (redemarrage backend requis)' : 'Chemin mis a jour');
      await loadSettings();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur mise a jour chemin');
    } finally {
      setSavingPath(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await storageApi.exportAll();
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mybase_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export termine');
    } catch {
      toast.error('Erreur export');
    } finally {
      setExporting(false);
    }
  };

  const triggerImport = () => importInputRef.current?.click();

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Importer va remplacer les donnees actuelles du compte. Continuer ?')) {
      e.target.value = '';
      return;
    }

    setImporting(true);
    try {
      await storageApi.importAll(file);
      toast.success('Import termine');
      await loadSettings();
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur import');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) console.log('Search:', searchQuery);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const flatNavItemIds = navGroups.flatMap((g) => g.itemIds);
  const filteredMediaItems = mediaItems.filter((m) => (mediaKindFilter === 'all' ? true : m?.kind === mediaKindFilter));

  return (
    <div className="min-h-screen bg-background flex">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-toggle"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card/50 backdrop-blur-xl transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        data-testid="sidebar"
      >
        <div className={cn('flex items-center h-16 px-4 border-b border-border', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && <h1 className="font-bold text-xl tracking-tight">MyBase</h1>}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}
            data-testid="sidebar-collapse-btn"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-3">
            {collapsed
              ? flatNavItemIds.map((id) => {
                  const item = NAV_BY_ID[id];
                  if (!item) return null;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center justify-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                          isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )
                      }
                      data-testid={`nav-${item.id}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
                    </NavLink>
                  );
                })
              : navGroups.map((group) => (
                  <div key={group.id} className="space-y-1">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground"
                      onClick={() => toggleGroupCollapsed(group.id)}
                    >
                      <span className="truncate">{group.name}</span>
                      {collapsedGroups[group.id] ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3 rotate-[-90deg]" />}
                    </button>
                    {!collapsedGroups[group.id] &&
                      group.itemIds.map((id) => {
                        const item = NAV_BY_ID[id];
                        if (!item) return null;
                        return (
                          <NavLink
                            key={item.id}
                            to={item.path}
                            end={item.path === '/'}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                              )
                            }
                            data-testid={`nav-${item.id}`}
                          >
                            <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
                            <span>{item.label}</span>
                          </NavLink>
                        );
                      })}
                  </div>
                ))}
          </nav>
        </ScrollArea>

        {!collapsed && (
          <div className="px-4 py-2 border-t border-border space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setMenuConfigOpen(true)}>
              <FolderPlus className="h-4 w-4" />
              Personnaliser menu
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={openSettings}>
              <Settings className="h-4 w-4" />
              Parametres
            </Button>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn('w-full justify-start gap-3', collapsed && 'justify-center px-0')} data-testid="user-menu-btn">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                {!collapsed && (
                  <div className="flex flex-col items-start text-left overflow-hidden">
                    <span className="text-sm font-medium truncate w-full">{user?.name}</span>
                    <span className="text-xs text-muted-foreground truncate w-full">{user?.email}</span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} data-testid="logout-btn">
                <LogOut className="mr-2 h-4 w-4" />
                Deconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />}

      <main className={cn('flex-1 min-h-screen transition-all duration-300', collapsed ? 'md:ml-16' : 'md:ml-64')}>
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8">
          <div className="flex-1 max-w-md ml-12 md:ml-0">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
                data-testid="global-search-input"
              />
            </form>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      <Dialog open={menuConfigOpen} onOpenChange={setMenuConfigOpen}>
        <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Personnalisation du menu</DialogTitle>
            <DialogDescription>Cree tes groupes et organise l'ordre des pages dans le menu de gauche.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Groupes</Label>
                <Button variant="outline" size="sm" onClick={resetMenu}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reinitialiser
                </Button>
              </div>

              <div className="space-y-2">
                {navGroups.map((group) => (
                  <div key={group.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                    <Input value={group.name} onChange={(e) => renameGroup(group.id, e.target.value)} />
                    <Button variant="outline" size="sm" onClick={() => deleteGroup(group.id)} disabled={navGroups.length <= 1}>
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Input placeholder="Nouveau groupe" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
                <Button onClick={addGroup}>Ajouter</Button>
              </div>
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <Label>Ordre des pages</Label>
              <div className="space-y-2">
                {flatNavItemIds.map((itemId) => {
                  const item = NAV_BY_ID[itemId];
                  const context = findItemGroupContext(itemId);
                  if (!item || !context) return null;
                  const group = navGroups[context.groupIndex];
                  return (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_160px_auto] items-center gap-2 border border-border/60 rounded-md p-2">
                      <span className="text-sm truncate">{item.label}</span>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={group.id}
                        onChange={(e) => moveItemToGroup(item.id, e.target.value)}
                      >
                        {navGroups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-1 justify-end">
                        <Button type="button" variant="outline" size="icon" onClick={() => moveItemWithinGroup(item.id, 'up')}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" onClick={() => moveItemWithinGroup(item.id, 'down')}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMenuConfigOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Parametres stockage & donnees</DialogTitle>
            <DialogDescription>Gestion du stockage, export et import complet du compte.</DialogDescription>
          </DialogHeader>

          {settingsLoading ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-border p-3 bg-muted/20 space-y-1 text-sm">
                <p><span className="font-medium">Stockage utilise:</span> {toMb(storageInfo?.total_disk_bytes)} / {toMb(storageInfo?.capacity_total_bytes)}</p>
                <p><span className="font-medium">Fichiers medias:</span> {storageInfo?.total_disk_files || 0}</p>
                <p><span className="font-medium">Espace libre:</span> {toMb(storageInfo?.capacity_free_bytes)}</p>
              </div>

              <div className="space-y-3 rounded-md border border-border p-3 bg-muted/10">
                <p className="text-sm font-medium">Compte connecte</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Identifiant (email)</Label>
                    <Input value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} placeholder="email@exemple.com" />
                  </div>
                  <div className="space-y-1">
                    <Label>Mot de passe actuel</Label>
                    <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Obligatoire pour modifier" />
                  </div>
                  <div className="space-y-1">
                    <Label>Nouveau mot de passe</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" />
                  </div>
                  <div className="space-y-1">
                    <Label>Confirmer nouveau mot de passe</Label>
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmer" />
                  </div>
                </div>
                <div>
                  <Button type="button" onClick={handleSaveAccount} disabled={savingAccount}>
                    {savingAccount ? 'Enregistrement...' : 'Mettre a jour le compte'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Chemin de stockage des fichiers/media</Label>
                <div className="flex gap-2">
                  <Input value={storagePath} onChange={(e) => setStoragePath(e.target.value)} placeholder="/mnt/ssd/mybase_data" />
                  <Button type="button" onClick={handleSavePath} disabled={savingPath || !storagePath.trim()}>
                    {savingPath ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Si tu changes le chemin, redemarre le backend pour appliquer partout.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button type="button" variant="outline" onClick={handleExport} disabled={exporting}>
                  {exporting ? 'Export...' : 'Exporter toutes les donnees'}
                </Button>
                <Button type="button" variant="outline" onClick={triggerImport} disabled={importing}>
                  {importing ? 'Import...' : 'Importer un export complet'}
                </Button>
                <input ref={importInputRef} type="file" accept=".zip" className="hidden" onChange={handleImport} />
              </div>

              <div className="space-y-2">
                <Label>Gestion des media/fichiers</Label>
                <Button type="button" variant="outline" className="w-full md:w-auto" onClick={() => setMediaManagerOpen(true)}>
                  Ouvrir la gestion des medias ({mediaItems.length})
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mediaManagerOpen} onOpenChange={setMediaManagerOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Gestion des media/fichiers</DialogTitle>
            <DialogDescription>Supprime les medias et fichiers depuis cette fenetre.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={mediaKindFilter === 'all' ? 'default' : 'outline'} onClick={() => setMediaKindFilter('all')}>Tous</Button>
              <Button type="button" size="sm" variant={mediaKindFilter === 'link' ? 'default' : 'outline'} onClick={() => setMediaKindFilter('link')}>Liens</Button>
              <Button type="button" size="sm" variant={mediaKindFilter === 'file' ? 'default' : 'outline'} onClick={() => setMediaKindFilter('file')}>Fichiers</Button>
            </div>
            {mediaLoading ? (
              <div className="text-sm text-muted-foreground">Chargement des medias...</div>
            ) : filteredMediaItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucun media trouve.</div>
            ) : (
              <div className="rounded-md border border-border bg-muted/10">
                <div className="max-h-[52vh] overflow-y-auto overflow-x-hidden">
                  {filteredMediaItems.map((media) => {
                    const label = media?.title || media?.original_name || media?.url || media?.id;
                    const meta = media?.kind === 'link' ? 'Lien' : 'Fichier';
                    const mediaUrl = toMediaUrl(media);
                    const imagePreview = mediaUrl && isImageMedia(media);
                    const videoPreview = mediaUrl && isVideoMedia(media);
                    const Icon = getMediaIcon(media);
                    return (
                      <div
                        key={media.id}
                        className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)_auto] items-start sm:items-center gap-2 p-3 border-b border-border last:border-b-0"
                      >
                        {imagePreview ? (
                          <img src={mediaUrl} alt={label} className="h-12 w-12 sm:h-14 sm:w-14 rounded object-cover border border-border/50" />
                        ) : videoPreview ? (
                          <video
                            src={mediaUrl}
                            className="h-12 w-12 sm:h-14 sm:w-14 rounded object-cover border border-border/50"
                            muted
                            preload="metadata"
                          />
                        ) : (
                          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded bg-secondary flex items-center justify-center border border-border/50">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-sm font-medium break-all">{label}</p>
                          <p className="text-xs text-muted-foreground break-all">
                            {meta} {media?.item_type ? `- ${media.item_type}` : '- flottant'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMedia(media)}
                          disabled={deletingMediaId === media.id}
                          className="w-full sm:w-auto"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deletingMediaId === media.id ? 'Suppression...' : 'Supprimer'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMediaManagerOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Layout;


