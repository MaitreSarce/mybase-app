import { useState, useEffect } from 'react';
import { tagsApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Hash } from 'lucide-react';

const SOURCE_LABELS = {
  inventory: 'Inventaire',
  wishlist: 'Souhaits',
  content: 'Contenu',
  portfolio: 'Portefeuille',
  projects: 'Projets',
  tasks: 'Tâches',
};

const TagsPage = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState('all');

  useEffect(() => { fetchTags(); }, []);

  const fetchTags = async () => {
    try {
      const res = await tagsApi.getAll();
      setTags(res.data);
    } catch { toast.error('Erreur lors du chargement des tags'); }
    finally { setLoading(false); }
  };

  const filtered = filterSource === 'all'
    ? tags
    : tags.filter(t => t.sources?.includes(filterSource));

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
          <p className="text-muted-foreground mt-1">
            {tags.length} tags utilisés dans vos éléments
          </p>
        </div>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[180px]" data-testid="tags-filter-source">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sources</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Hash className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun tag</h3>
            <p className="text-sm text-muted-foreground">
              Ajoutez des tags à vos éléments pour les voir ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(tag => (
            <Card key={tag.name} className="bg-card border-border card-hover" data-testid={`tag-card-${tag.name}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{tag.name}</p>
                  <Badge variant="secondary" className="font-mono text-xs">{tag.count}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {tag.sources?.map(s => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {SOURCE_LABELS[s] || s}
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
