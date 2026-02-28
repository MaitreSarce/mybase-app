import { useState, useEffect } from 'react';
import { searchApi, linksApi } from '../services/api';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Link2, Plus, Search, X, Loader2, Package, Heart,
  FolderKanban, CheckSquare, BookOpen, TrendingUp, Layers
} from 'lucide-react';

const ITEM_TYPES = [
  { value: 'inventory', label: 'Inventaire', icon: Package },
  { value: 'wishlist', label: 'Souhaits', icon: Heart },
  { value: 'project', label: 'Projets', icon: FolderKanban },
  { value: 'task', label: 'Tâches', icon: CheckSquare },
  { value: 'content', label: 'Contenu', icon: BookOpen },
  { value: 'portfolio', label: 'Portefeuille', icon: TrendingUp },
  { value: 'collection', label: 'Collections', icon: Layers },
];

const ItemLinksManager = ({ itemType, itemId, itemName, onUpdate }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => { if (itemId) fetchLinks(); }, [itemType, itemId]);

  const fetchLinks = async () => {
    try {
      const res = await linksApi.getForItem(itemType, itemId);
      setLinks(res.data);
    } catch { /* no links yet */ }
    finally { setLoading(false); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchApi.search(searchQuery);
      setSearchResults(res.data);
    } catch { toast.error('Erreur de recherche'); }
    finally { setSearching(false); }
  };

  const handleLink = async (targetType, targetId, targetName) => {
    setLinking(true);
    try {
      await linksApi.create({
        source_type: itemType, source_id: itemId,
        target_type: targetType, target_id: targetId, label: null
      });
      toast.success(`Lié à "${targetName}"`);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults(null);
      fetchLinks();
      if (onUpdate) onUpdate();
    } catch { toast.error('Erreur lors de la création du lien'); }
    finally { setLinking(false); }
  };

  const handleUnlink = async (link) => {
    try {
      await linksApi.delete(itemType, itemId, link.item_type, link.item_id);
      toast.success('Lien supprimé');
      fetchLinks();
      if (onUpdate) onUpdate();
    } catch { toast.error('Erreur'); }
  };

  const getTypeInfo = (type) => ITEM_TYPES.find(t => t.value === type) || { label: type, icon: Link2 };

  const getResultsForType = (type) => {
    if (!searchResults) return [];
    const map = {
      inventory: searchResults.inventory || [],
      wishlist: searchResults.wishlist || [],
      project: searchResults.projects || [],
      task: searchResults.tasks || [],
      content: searchResults.content || [],
      portfolio: searchResults.portfolio || [],
      collection: searchResults.collections || [],
    };
    return map[type] || [];
  };

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Liens ({links.length})
        </Label>
        <Button variant="outline" size="sm" onClick={() => setShowSearch(!showSearch)} data-testid="add-link-btn">
          {showSearch ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showSearch ? 'Fermer' : 'Lier'}
        </Button>
      </div>

      {/* Existing links */}
      {loading ? <p className="text-xs text-muted-foreground">Chargement...</p> : links.length > 0 ? (
        <div className="space-y-1">
          {links.map((link, i) => {
            const info = getTypeInfo(link.item_type);
            const Icon = info.icon;
            return (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/30 group">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{link.item_name}</span>
                  <Badge variant="outline" className="text-[10px]">{info.label}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => handleUnlink(link)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : <p className="text-xs text-muted-foreground">Aucun lien</p>}

      {/* Inline search */}
      {showSearch && (
        <div className="space-y-3 border border-border rounded-lg p-3 bg-background">
          <div className="flex gap-2">
            <Input placeholder="Rechercher un élément..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              data-testid="link-search-input" className="flex-1" />
            <Button onClick={handleSearch} disabled={searching} size="icon">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {searchResults && (
            <div className="max-h-48 overflow-y-auto space-y-2">
              {ITEM_TYPES.map(type => {
                const results = getResultsForType(type.value);
                if (!results.length) return null;
                return (
                  <div key={type.value}>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <type.icon className="h-3 w-3" /> {type.label}
                    </p>
                    {results.map(item => (
                      <button key={item.id} disabled={linking || item.id === itemId}
                        className="w-full flex items-center justify-between p-1.5 rounded hover:bg-secondary/50 text-left text-sm disabled:opacity-30"
                        onClick={() => handleLink(type.value, item.id, item.name || item.title)}>
                        <span className="truncate">{item.name || item.title}</span>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemLinksManager;
