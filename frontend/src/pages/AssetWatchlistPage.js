import { useEffect, useMemo, useRef, useState } from 'react';
import { assetWatchlistApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
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
import { Plus, MoreVertical, Pencil, Trash2, ExternalLink, Eye, EyeOff } from 'lucide-react';

const AssetWatchlistPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterOwnedOnly, setFilterOwnedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownActionRef = useRef(false);

  const [formData, setFormData] = useState({
    ticker: '',
    buy_target: '',
    sell_target: '',
    owned: false,
    link: '',
  });

  const fetchItems = async () => {
    try {
      const res = await assetWatchlistApi.getAll();
      setItems(res.data || []);
    } catch {
      toast.error('Erreur chargement WatchList');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      ticker: '',
      buy_target: '',
      sell_target: '',
      owned: false,
      link: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ticker: item.ticker || '',
      buy_target: item.buy_target ?? '',
      sell_target: item.sell_target ?? '',
      owned: !!item.owned,
      link: item.link || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ticker: String(formData.ticker || '').trim().toUpperCase(),
      buy_target: formData.buy_target === '' ? null : Number(formData.buy_target),
      sell_target: formData.sell_target === '' ? null : Number(formData.sell_target),
      owned: !!formData.owned,
      link: String(formData.link || '').trim() || null,
    };

    try {
      if (!payload.ticker) {
        toast.error('Ticker requis');
        return;
      }
      if (editingItem) {
        await assetWatchlistApi.update(editingItem.id, payload);
        toast.success('Actif modifie');
      } else {
        await assetWatchlistApi.create(payload);
        toast.success('Actif ajoute');
      }
      setDialogOpen(false);
      await fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Supprimer ${item.ticker} de la WatchList ?`)) return;
    try {
      await assetWatchlistApi.delete(item.id);
      toast.success('Actif supprime');
      await fetchItems();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const formatPrice = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '-' : Number(v).toFixed(2));

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filterOwnedOnly && !item.owned) return false;
      if (!q) return true;
      const ticker = String(item.ticker || '').toLowerCase();
      const link = String(item.link || '').toLowerCase();
      return ticker.includes(q) || link.includes(q);
    });
  }, [items, filterOwnedOnly, search]);

  if (loading) return <Skeleton className="h-10 w-64" />;

  return (
    <div className="space-y-6" data-testid="asset-watchlist-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Actif WatchList</h1>
          <p className="text-muted-foreground mt-1">{filteredItems.length} actif(s)</p>
        </div>
        <Button onClick={openCreate} data-testid="add-asset-watchlist-btn">
          <Plus className="h-4 w-4 mr-2" />
          Nouvel actif
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder="Rechercher ticker ou lien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <Checkbox id="owned-only" checked={filterOwnedOnly} onCheckedChange={setFilterOwnedOnly} />
            <Label htmlFor="owned-only" className="cursor-pointer">Possede uniquement</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Objectif achat</TableHead>
                  <TableHead>Objectif vente</TableHead>
                  <TableHead>Possede</TableHead>
                  <TableHead>Lien</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Aucun actif dans la WatchList.
                    </TableCell>
                  </TableRow>
                ) : filteredItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-secondary/30"
                    onClick={() => {
                      if (!dropdownActionRef.current) openEdit(item);
                    }}
                  >
                    <TableCell className="font-medium">{item.ticker}</TableCell>
                    <TableCell>{formatPrice(item.buy_target)}</TableCell>
                    <TableCell>{formatPrice(item.sell_target)}</TableCell>
                    <TableCell>{item.owned ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</TableCell>
                    <TableCell>
                      {item.link ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.link, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ouvrir
                        </Button>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu onOpenChange={(open) => {
                        if (!open) {
                          dropdownActionRef.current = true;
                          setTimeout(() => { dropdownActionRef.current = false; }, 250);
                        }
                      }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                          <DropdownMenuItem onSelect={() => openEdit(item)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleDelete(item)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Modifier actif' : 'Nouvel actif'}</DialogTitle>
              <DialogDescription>Suivez vos actifs a surveiller.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Ticker *</Label>
                <Input
                  value={formData.ticker}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                  placeholder="BTC, AAPL, ETH..."
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Objectif achat</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={formData.buy_target}
                    onChange={(e) => setFormData((prev) => ({ ...prev, buy_target: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Objectif vente</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={formData.sell_target}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sell_target: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lien (libre)</Label>
                <Input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData((prev) => ({ ...prev, link: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="owned"
                  checked={!!formData.owned}
                  onCheckedChange={(v) => setFormData((prev) => ({ ...prev, owned: !!v }))}
                />
                <Label htmlFor="owned" className="cursor-pointer">Possede</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Sauvegarde...' : (editingItem ? 'Mettre a jour' : 'Creer')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetWatchlistPage;
