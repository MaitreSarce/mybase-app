import { useState, useEffect } from 'react';
import { linksApi, searchApi } from '../services/api';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  Link2, 
  Plus, 
  X, 
  Search,
  Loader2,
  Package,
  Heart,
  FolderKanban,
  BookOpen,
  TrendingUp,
  Layers,
  CheckSquare
} from 'lucide-react';

const ITEM_TYPES = [
  { value: 'inventory', label: 'Inventaire', icon: Package },
  { value: 'wishlist', label: 'Liste de souhaits', icon: Heart },
  { value: 'project', label: 'Projet', icon: FolderKanban },
  { value: 'task', label: 'Tâche', icon: CheckSquare },
  { value: 'content', label: 'Contenu', icon: BookOpen },
  { value: 'portfolio', label: 'Portefeuille', icon: TrendingUp },
  { value: 'collection', label: 'Collection', icon: Layers },
];

const ItemLinksManager = ({ itemType, itemId, itemName, onUpdate }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedType, setSelectedType] = useState('inventory');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (itemId) {
      fetchLinks();
    }
  }, [itemId]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const response = await linksApi.getForItem(itemType, itemId);
      setLinks(response.data);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await searchApi.search(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const handleLink = async (targetType, targetId, targetName) => {
    setLinking(true);
    try {
      await linksApi.create({
        source_type: itemType,
        source_id: itemId,
        target_type: targetType,
        target_id: targetId,
        label: null
      });
      toast.success(`Lié à "${targetName}"`);
      setDialogOpen(false);
      setSearchQuery('');
      setSearchResults(null);
      fetchLinks();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Erreur lors de la création du lien');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (link) => {
    if (!window.confirm(`Supprimer le lien avec "${link.item_name}" ?`)) return;
    
    try {
      await linksApi.delete(itemType, itemId, link.item_type, link.item_id);
      toast.success('Lien supprimé');
      fetchLinks();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getTypeIcon = (type) => {
    const typeInfo = ITEM_TYPES.find(t => t.value === type);
    return typeInfo ? typeInfo.icon : Link2;
  };

  const getTypeLabel = (type) => {
    const typeInfo = ITEM_TYPES.find(t => t.value === type);
    return typeInfo ? typeInfo.label : type;
  };

  const getResultsForType = (type) => {
    if (!searchResults) return [];
    
    const typeMap = {
      inventory: searchResults.inventory || [],
      wishlist: searchResults.wishlist || [],
      project: searchResults.projects || [],
      task: searchResults.tasks || [],
      content: searchResults.content || [],
      portfolio: searchResults.portfolio || [],
      collection: searchResults.collections || [],
    };
    
    return typeMap[type] || [];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Liens ({links.length})
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          data-testid="add-link-btn"
        >
          <Plus className="h-4 w-4 mr-1" />
          Lier
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : links.length > 0 ? (
        <div className="space-y-2">
          {links.map((link, index) => {
            const Icon = getTypeIcon(link.item_type);
            return (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md bg-secondary/30 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{link.item_name}</p>
                    <p className="text-xs text-muted-foreground">{getTypeLabel(link.item_type)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleUnlink(link)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun lien</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Créer un lien</DialogTitle>
            <DialogDescription>
              Liez "{itemName}" à un autre élément
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher un élément..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="link-search-input"
                />
              </div>
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchResults && (
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {ITEM_TYPES.map((type) => {
                  const results = getResultsForType(type.value);
                  if (results.length === 0) return null;
                  
                  return (
                    <div key={type.value}>
                      <div className="flex items-center gap-2 mb-2">
                        <type.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                      <div className="space-y-1">
                        {results.map((item) => (
                          <button
                            key={item.id}
                            className="w-full flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors text-left"
                            onClick={() => handleLink(type.value, item.id, item.name || item.title)}
                            disabled={linking || item.id === itemId}
                          >
                            <span className="text-sm truncate">
                              {item.name || item.title}
                            </span>
                            {linking ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ItemLinksManager;
