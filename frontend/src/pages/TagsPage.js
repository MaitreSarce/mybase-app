import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tagsApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { MultiSelect } from '../components/MultiSelect';
import {
  Hash, ArrowLeft, Package, Heart, BookOpen, FolderKanban,
  CheckSquare, TrendingUp
} from 'lucide-react';

const SOURCE_LABELS = {
  inventory: { label: 'Inventaire', icon: Package },
  wishlist: { label: 'Souhaits', icon: Heart },
  content: { label: 'Contenu', icon: BookOpen },
  portfolio: { label: 'Portefeuille', icon: TrendingUp },
  projects: { label: 'Projets', icon: FolderKanban },
  tasks: { label: 'Taches', icon: CheckSquare },
};

const TagsPage = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSources, setFilterSources] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagItems, setTagItems] = useState(null);
  const [tagItemsLoading, setTagItemsLoading] = useState(false);

  useEffect(() => { fetchTags(); }, []);

  const fetchTags = async () => {
    try {
      const res = await tagsApi.getAll();
      setTags(res.data);
    } catch { toast.error('Erreur lors du chargement des tags'); }
    finally { setLoading(false); }
  };

  const handleSelectTag = async (tag) => {
    setSelectedTag(tag);
    setTagItemsLoading(true);
    try {
      const res = await tagsApi.getItemsByTag(tag.name);
      setTagItems(res.data);
    } catch { toast.error('Erreur lors du chargement des items'); }
    finally { setTagItemsLoading(false); }
  };

  const handleOpenItemEditPage = (item, sourceType) => {
    if (!item?.id) return;
    if (sourceType === 'inventory') {
      navigate(`/inventory?editId=${encodeURIComponent(item.id)}`);
      return;
    }
    if (sourceType === 'wishlist') {
      navigate(`/wishlist?editId=${encodeURIComponent(item.id)}`);
      return;
    }
    if (sourceType === 'content') {
      navigate(`/content?editId=${encodeURIComponent(item.id)}`);
      return;
    }
    if (sourceType === 'projects' || sourceType === 'tasks') {
      navigate(`/projects?editType=${encodeURIComponent(sourceType)}&editId=${encodeURIComponent(item.id)}`);
      return;
    }
    if (sourceType === 'portfolio') {
      navigate('/portfolio');
      toast.info('Ouverture du portefeuille. L’édition directe depuis Tags n’est pas encore disponible pour ce type.');
      return;
    }
    toast.info('Type d’item non pris en charge pour l’ouverture directe.');
  };

  const filtered = filterSources.length === 0
    ? tags
    : tags.filter(t => t.sources?.some(s => filterSources.includes(s)));

  const sourceOpts = Object.entries(SOURCE_LABELS).map(([k, v]) => ({ value: k, label: v.label }));

  const getItemName = (item) => item.name || item.title || 'Sans nom';

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

  if (selectedTag) {
    return (
      <div className="space-y-6" data-testid="tag-detail">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedTag(null); setTagItems(null); }} data-testid="tag-back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Hash className="h-7 w-7" /> {selectedTag.name}
            </h1>
            <p className="text-muted-foreground mt-1">{selectedTag.count} elements</p>
          </div>
        </div>

        {tagItemsLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : tagItems && Object.keys(tagItems).length === 0 ? (
          <Card className="bg-card border-border border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Hash className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Aucun element avec ce tag</h3>
            </CardContent>
          </Card>
        ) : (
          Object.entries(tagItems || {}).map(([sourceType, items]) => {
            const info = SOURCE_LABELS[sourceType] || { label: sourceType, icon: Hash };
            const Icon = info.icon;
            return (
              <div key={sourceType}>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                  <Icon className="h-5 w-5" /> {info.label} ({items.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(item => (
                    <Card key={item.id}
                      className="bg-card border-border card-hover cursor-pointer"
                      onClick={() => handleOpenItemEditPage(item, sourceType)}
                      data-testid={`tag-item-${item.id}`}>
                      <CardContent className="py-3">
                        <p className="font-medium">{getItemName(item)}</p>
                        {item.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{item.description}</p>}
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="secondary" className="text-xs"><Icon className="h-3 w-3 mr-1" />{info.label}</Badge>
                          {item.tags?.filter(t => t !== selectedTag.name).slice(0, 2).map(t => (
                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}

      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tags-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground mt-1">
            {tags.length} tags utilises dans vos elements
          </p>
        </div>
        {sourceOpts.length > 0 && <MultiSelect options={sourceOpts} selected={filterSources} onChange={setFilterSources} placeholder="Sources" testId="tags-filter-source" />}
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Hash className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun tag</h3>
            <p className="text-sm text-muted-foreground">
              Ajoutez des tags a vos elements pour les voir ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(tag => (
            <Card key={tag.name}
              className="bg-card border-border card-hover cursor-pointer"
              onClick={() => handleSelectTag(tag)}
              data-testid={`tag-card-${tag.name}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{tag.name}</p>
                  <Badge variant="secondary" className="font-mono text-xs">{tag.count}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {tag.sources?.map(s => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {SOURCE_LABELS[s]?.label || s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagsPage;
