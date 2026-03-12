import { useEffect, useMemo, useState } from 'react';
import { portfolioV2Api } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import ItemLinksManager from '../components/ItemLinksManager';
import FileUploader from '../components/FileUploader';

const TYPES = [
  { value: 'crypto', label: 'Crypto', color: '#22c55e' },
  { value: 'etf_action', label: 'ETF-Action', color: '#3b82f6' },
  { value: 'immo', label: 'Immo', color: '#f59e0b' },
  { value: 'other', label: 'Autres', color: '#a855f7' },
];
const SALE_TYPES = ['Immo', 'Crypto', 'Action', 'Autres'];
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'];

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const euro = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n(v));
const pct = (v) => `${n(v).toFixed(2)}%`;

const statusInitial = { name: '', status: 'active', updated_date: '', account_type: 'crypto', invested: '', sold: '', real: '' };
const depositInitial = { account_name: '', date: '', invested: '', sold: '', total: '', comment: '' };
const saleInitial = { date: '', amount: '', source: '', received_on: '', comment: '', sale_type: 'Autres' };
const physicalInitial = { purchase_date: '', category: '', brand: '', name: '', purchase_shop: '', purchase_price: '', valuation: '', sale_price: '', sale_date: '', sale_shop: '' };
const snapInitial = { date: '', total_invested: '', total_sold: '', total_real: '', total_gain: '', total_perf_pct: '' };

const emptyTypeInputs = () => TYPES.reduce((acc, t) => ({ ...acc, [t.value]: { invested: '', sold: '', real: '' } }), {});

const PortfolioPage = () => {
  const [loading, setLoading] = useState(true);
  const [statusRows, setStatusRows] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [sales, setSales] = useState([]);
  const [physical, setPhysical] = useState([]);
  const [snaps, setSnaps] = useState([]);

  const [statusForm, setStatusForm] = useState(statusInitial);
  const [depositForm, setDepositForm] = useState(depositInitial);
  const [saleForm, setSaleForm] = useState(saleInitial);
  const [phyForm, setPhyForm] = useState(physicalInitial);
  const [snapForm, setSnapForm] = useState(snapInitial);
  const [snapTypeInputs, setSnapTypeInputs] = useState(emptyTypeInputs());

  const [editStatusId, setEditStatusId] = useState(null);
  const [editDepositId, setEditDepositId] = useState(null);
  const [editSaleId, setEditSaleId] = useState(null);
  const [editPhysicalId, setEditPhysicalId] = useState(null);
  const [editSnapId, setEditSnapId] = useState(null);

  const [statusSearch, setStatusSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [depositAccountFilter, setDepositAccountFilter] = useState('all');

  const load = async () => {
    try {
      const [s, d, v, p, w] = await Promise.all([
        portfolioV2Api.getStatus(),
        portfolioV2Api.getDeposits(),
        portfolioV2Api.getSales(),
        portfolioV2Api.getPhysicalAssets(),
        portfolioV2Api.getSnapshots(),
      ]);
      setStatusRows(s.data || []);
      setDeposits(d.data || []);
      setSales(v.data || []);
      setPhysical(p.data || []);
      setSnaps((w.data || []).sort((a, b) => String(a.date).localeCompare(String(b.date))));
    } catch {
      toast.error('Chargement portefeuille impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const accountOptions = useMemo(() => {
    const names = new Set();
    statusRows.forEach((r) => names.add((r.name || '').trim()));
    deposits.forEach((d) => names.add((d.account_name || '').trim()));
    return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [statusRows, deposits]);

  const depositTotalsByAccount = useMemo(() => {
    const map = {};
    deposits.forEach((d) => {
      const key = (d.account_name || '').trim();
      if (!key) return;
      if (!map[key]) map[key] = { invested: 0, sold: 0, total: 0 };
      map[key].invested += n(d.invested);
      map[key].sold += n(d.sold);
      map[key].total += n(d.total);
    });
    return map;
  }, [deposits]);

  const enrichedStatusRows = useMemo(() => statusRows.map((r) => {
    const account = (r.name || '').trim();
    const dep = depositTotalsByAccount[account] || { invested: 0, sold: 0 };
    const real = n(r.real);
    const invested = n(dep.invested);
    const sold = n(dep.sold);
    const gain = real - invested + sold;
    const perf = invested !== 0 && real !== 0 ? (gain / invested) * 100 : 0;
    return { ...r, account, invested, sold, gain, perf };
  }), [statusRows, depositTotalsByAccount]);

  const filteredStatusRows = useMemo(() => enrichedStatusRows.filter((r) => {
    const q = statusSearch.trim().toLowerCase();
    const okSearch = !q || r.account.toLowerCase().includes(q);
    const okStatus = statusFilter === 'all' || r.status === statusFilter;
    const okType = typeFilter === 'all' || r.account_type === typeFilter;
    return okSearch && okStatus && okType;
  }), [enrichedStatusRows, statusSearch, statusFilter, typeFilter]);

  const recap = useMemo(() => {
    const map = {};
    let ti = 0; let ts = 0; let tr = 0;
    enrichedStatusRows.forEach((r) => {
      const t = r.account_type || 'other';
      if (!map[t]) map[t] = { type: t, invested: 0, sold: 0, real: 0 };
      map[t].invested += n(r.invested);
      map[t].sold += n(r.sold);
      map[t].real += n(r.real);
      ti += n(r.invested); ts += n(r.sold); tr += n(r.real);
    });
    const rows = Object.values(map).map((x) => {
      const gain = x.real - x.invested + x.sold;
      return { ...x, gain, perf: x.invested !== 0 && x.real !== 0 ? (gain / x.invested) * 100 : 0 };
    });
    const gain = tr - ti + ts;
    const total = { type: 'TOTAL', invested: ti, sold: ts, real: tr, gain, perf: ti !== 0 && tr !== 0 ? (gain / ti) * 100 : 0 };
    const prop = rows.map((x) => ({ type: x.type, invested: ti ? (x.invested / ti) * 100 : 0, sold: ts ? (x.sold / ts) * 100 : 0, real: tr ? (x.real / tr) * 100 : 0, gain: gain ? (x.gain / gain) * 100 : 0 }));
    prop.push({ type: 'TOTAL', invested: ti ? 100 : 0, sold: ts ? 100 : 0, real: tr ? 100 : 0, gain: gain ? 100 : 0 });
    return { rows, total, prop };
  }, [enrichedStatusRows]);

  const statusBarData = useMemo(() => recap.rows.map((r) => ({
    type: TYPES.find((x) => x.value === r.type)?.label || r.type,
    invested: r.invested,
    real: r.real,
  })), [recap]);

  const filteredDeposits = useMemo(() => deposits.filter((d) => {
    if (depositAccountFilter === 'all') return true;
    return d.account_name === depositAccountFilter;
  }), [deposits, depositAccountFilter]);

  const depositsByAccount = useMemo(() => {
    const map = {};
    filteredDeposits.forEach((d) => {
      const key = d.account_name || 'Sans compte';
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return Object.entries(map)
      .map(([k, rows]) => ({ k, rows: rows.sort((a, b) => String(b.date).localeCompare(String(a.date))) }))
      .sort((a, b) => a.k.localeCompare(b.k));
  }, [filteredDeposits]);

  const snapSeries = useMemo(() => snaps.map((s) => {
    const gain = s.total_gain != null ? n(s.total_gain) : n(s.total_real) - n(s.total_invested) + n(s.total_sold);
    const perf = s.total_perf_pct != null ? n(s.total_perf_pct) : (n(s.total_invested) !== 0 && n(s.total_real) !== 0 ? (gain / n(s.total_invested)) * 100 : 0);
    return { ...s, total_net_invest: n(s.total_invested) - n(s.total_sold), total_gain_calc: gain, total_perf_calc: perf };
  }), [snaps]);

  const typeSeries = useMemo(() => {
    const all = new Set();
    snaps.forEach((s) => Object.keys(s.by_type || {}).forEach((t) => all.add(t)));
    return [...all].sort().map((t) => ({
      type: t,
      data: snaps.map((s) => ({ date: s.date, invested: n(s.by_type?.[t]?.invested), real: n(s.by_type?.[t]?.real) })),
    }));
  }, [snaps]);

  const clearStatusEdit = () => { setEditStatusId(null); setStatusForm(statusInitial); };
  const clearDepositEdit = () => { setEditDepositId(null); setDepositForm(depositInitial); };
  const clearSaleEdit = () => { setEditSaleId(null); setSaleForm(saleInitial); };
  const clearPhysicalEdit = () => { setEditPhysicalId(null); setPhyForm(physicalInitial); };
  const clearSnapEdit = () => { setEditSnapId(null); setSnapForm(snapInitial); setSnapTypeInputs(emptyTypeInputs()); };

  const fillStatusEdit = (r) => { setEditStatusId(r.id); setStatusForm({ name: r.name || '', status: r.status || 'active', updated_date: r.updated_date || '', account_type: r.account_type || 'crypto', invested: String(n(r.invested)), sold: String(n(r.sold)), real: String(n(r.real)) }); };
  const fillDepositEdit = (r) => { setEditDepositId(r.id); setDepositForm({ account_name: r.account_name || '', date: r.date || '', invested: String(n(r.invested)), sold: String(n(r.sold)), total: String(n(r.total)), comment: r.comment || '' }); };
  const fillSaleEdit = (r) => { setEditSaleId(r.id); setSaleForm({ date: r.date || '', amount: String(n(r.amount)), source: r.source || '', received_on: r.received_on || '', comment: r.comment || '', sale_type: r.sale_type || 'Autres' }); };
  const fillPhysicalEdit = (r) => { setEditPhysicalId(r.id); setPhyForm({ purchase_date: r.purchase_date || '', category: r.category || '', brand: r.brand || '', name: r.name || '', purchase_shop: r.purchase_shop || '', purchase_price: String(n(r.purchase_price)), valuation: String(n(r.valuation)), sale_price: String(n(r.sale_price)), sale_date: r.sale_date || '', sale_shop: r.sale_shop || '' }); };
  const fillSnapEdit = (r) => {
    setEditSnapId(r.id);
    setSnapForm({ date: r.date || '', total_invested: String(n(r.total_invested)), total_sold: String(n(r.total_sold)), total_real: String(n(r.total_real)), total_gain: String(n(r.total_gain)), total_perf_pct: String(n(r.total_perf_pct)) });
    const typed = emptyTypeInputs();
    TYPES.forEach((t) => {
      typed[t.value] = {
        invested: String(n(r.by_type?.[t.value]?.invested)),
        sold: String(n(r.by_type?.[t.value]?.sold)),
        real: String(n(r.by_type?.[t.value]?.real)),
      };
    });
    setSnapTypeInputs(typed);
  };

  const upsertStatus = async (e) => {
    e.preventDefault();
    const account = (statusForm.name || '').trim();
    const dep = depositTotalsByAccount[account] || { invested: 0, sold: 0 };
    const payload = { ...statusForm, name: account, invested: statusForm.invested === '' ? n(dep.invested) : n(statusForm.invested), sold: statusForm.sold === '' ? n(dep.sold) : n(statusForm.sold), real: n(statusForm.real) };
    try {
      if (editStatusId) await portfolioV2Api.updateStatus(editStatusId, payload); else await portfolioV2Api.createStatus(payload);
      clearStatusEdit();
      load();
    } catch { toast.error('Enregistrement status impossible'); }
  };

  const upsertDeposit = async (e) => {
    e.preventDefault();
    const payload = { ...depositForm, invested: n(depositForm.invested), sold: n(depositForm.sold), total: depositForm.total === '' ? null : n(depositForm.total), comment: depositForm.comment || null };
    try {
      if (editDepositId) await portfolioV2Api.updateDeposit(editDepositId, payload); else await portfolioV2Api.createDeposit(payload);
      clearDepositEdit();
      load();
    } catch { toast.error('Enregistrement dépôt impossible'); }
  };

  const upsertSale = async (e) => {
    e.preventDefault();
    const payload = { ...saleForm, amount: n(saleForm.amount) };
    try {
      if (editSaleId) await portfolioV2Api.updateSale(editSaleId, payload); else await portfolioV2Api.createSale(payload);
      clearSaleEdit();
      load();
    } catch { toast.error('Enregistrement vente impossible'); }
  };

  const upsertPhysical = async (e) => {
    e.preventDefault();
    const payload = { ...phyForm, purchase_price: n(phyForm.purchase_price), valuation: n(phyForm.valuation), sale_price: n(phyForm.sale_price) };
    try {
      if (editPhysicalId) await portfolioV2Api.updatePhysicalAsset(editPhysicalId, payload); else await portfolioV2Api.createPhysicalAsset(payload);
      clearPhysicalEdit();
      load();
    } catch { toast.error('Enregistrement actif physique impossible'); }
  };

  const upsertSnap = async (e) => {
    e.preventDefault();
    const byType = {};
    TYPES.forEach((t) => {
      const values = snapTypeInputs[t.value] || {};
      const invested = n(values.invested);
      const sold = n(values.sold);
      const real = n(values.real);
      if (invested !== 0 || sold !== 0 || real !== 0) {
        const gain = real - invested + sold;
        byType[t.value] = { invested, sold, real, gain, perf_pct: invested !== 0 && real !== 0 ? (gain / invested) * 100 : 0 };
      }
    });

    const sumInvested = Object.values(byType).reduce((a, x) => a + n(x.invested), 0);
    const sumSold = Object.values(byType).reduce((a, x) => a + n(x.sold), 0);
    const sumReal = Object.values(byType).reduce((a, x) => a + n(x.real), 0);
    const sumGain = sumReal - sumInvested + sumSold;

    const payload = {
      ...snapForm,
      total_invested: snapForm.total_invested === '' ? (Object.keys(byType).length ? sumInvested : null) : n(snapForm.total_invested),
      total_sold: snapForm.total_sold === '' ? (Object.keys(byType).length ? sumSold : null) : n(snapForm.total_sold),
      total_real: snapForm.total_real === '' ? (Object.keys(byType).length ? sumReal : null) : n(snapForm.total_real),
      total_gain: snapForm.total_gain === '' ? (Object.keys(byType).length ? sumGain : null) : n(snapForm.total_gain),
      total_perf_pct: snapForm.total_perf_pct === '' ? null : n(snapForm.total_perf_pct),
      by_type: Object.keys(byType).length ? byType : null,
    };

    try {
      if (editSnapId) await portfolioV2Api.updateSnapshot(editSnapId, payload); else await portfolioV2Api.createSnapshot(payload);
      clearSnapEdit();
      load();
    } catch { toast.error('Enregistrement snapshot impossible'); }
  };

  const del = async (fn, id) => {
    if (!window.confirm('Supprimer ?')) return;
    try { await fn(id); load(); } catch { toast.error('Suppression impossible'); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-60" /><Skeleton className="h-80 w-full" /></div>;

  const investDonut = recap.rows.filter((r) => n(r.invested) > 0).map((r, i) => ({ name: TYPES.find((x) => x.value === r.type)?.label || r.type, value: n(r.invested), color: PIE_COLORS[i % PIE_COLORS.length] }));
  const realDonut = recap.rows.filter((r) => n(r.real) > 0).map((r, i) => ({ name: TYPES.find((x) => x.value === r.type)?.label || r.type, value: n(r.real), color: PIE_COLORS[i % PIE_COLORS.length] }));

  return (
    <div className="space-y-6" data-testid="portfolio-v2-page">
      <div><h1 className="text-3xl font-bold">Portefeuille</h1><p className="text-muted-foreground">Comptes, recap par type, dépôts, ventes, actifs physiques et snapshots</p></div>
      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-1 h-auto">
          <TabsTrigger value="status">Status</TabsTrigger><TabsTrigger value="recap">Recap</TabsTrigger><TabsTrigger value="depot">Dépôt</TabsTrigger><TabsTrigger value="vente">Vente</TabsTrigger><TabsTrigger value="physique">Actif physique</TabsTrigger><TabsTrigger value="suivi">Suivi Hebdo</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card><CardHeader><CardTitle>Filtres Status</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-4 gap-2"><div><Label>Recherche compte</Label><Input value={statusSearch} onChange={(e) => setStatusSearch(e.target.value)} placeholder="Ex: PEA" /></div><div><Label>Etat</Label><select className="w-full border rounded-md h-10 px-3 bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">Tous</option><option value="active">Actif</option><option value="inactive">Inactif</option></select></div><div><Label>Type</Label><select className="w-full border rounded-md h-10 px-3 bg-background" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">Tous</option>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Investi vs Réel par type d'actif</CardTitle></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={statusBarData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" /><YAxis /><Tooltip formatter={(v) => euro(v)} /><Legend /><Bar dataKey="invested" name="Investi" fill="#ef4444" /><Bar dataKey="real" name="Réel" fill="#22c55e" /></BarChart></ResponsiveContainer></div></CardContent></Card>
          <Card><CardHeader><CardTitle>{editStatusId ? 'Modifier compte Status' : 'Ajouter compte Status'}</CardTitle></CardHeader><CardContent><form onSubmit={upsertStatus} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-end"><div><Label>Compte</Label><Input list="status-account-options" value={statusForm.name} onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })} required /><datalist id="status-account-options">{accountOptions.map((a) => <option key={a} value={a} />)}</datalist></div><div><Label>Etat</Label><select className="w-full border rounded-md h-10 px-3 bg-background" value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}><option value="active">Actif</option><option value="inactive">Inactif</option></select></div><div><Label>Date maj</Label><Input type="date" value={statusForm.updated_date} onChange={(e) => setStatusForm({ ...statusForm, updated_date: e.target.value })} /></div><div><Label>Type</Label><select className="w-full border rounded-md h-10 px-3 bg-background" value={statusForm.account_type} onChange={(e) => setStatusForm({ ...statusForm, account_type: e.target.value })}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div><div><Label>Montant investi</Label><Input type="number" step="0.01" value={statusForm.invested} onChange={(e) => setStatusForm({ ...statusForm, invested: e.target.value })} /></div><div><Label>Montant vendu</Label><Input type="number" step="0.01" value={statusForm.sold} onChange={(e) => setStatusForm({ ...statusForm, sold: e.target.value })} /></div><div><Label>Montant réel</Label><Input type="number" step="0.01" value={statusForm.real} onChange={(e) => setStatusForm({ ...statusForm, real: e.target.value })} /></div><div className="flex gap-2"><Button type="submit"><Plus className="h-4 w-4 mr-1" />{editStatusId ? 'Maj' : 'Ajouter'}</Button>{editStatusId && <Button type="button" variant="outline" onClick={clearStatusEdit}><X className="h-4 w-4" /></Button>}</div></form></CardContent></Card>
          <Card className="overflow-hidden"><CardContent className="pt-0 overflow-auto"><table className="w-full text-sm min-w-[1150px]"><thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Compte</th><th className="p-3">Etat</th><th className="p-3">Date maj</th><th className="p-3">Type</th><th className="p-3">Montant Invest</th><th className="p-3">Montant vendu</th><th className="p-3">Montant réel</th><th className="p-3">Perte/Gain</th><th className="p-3">%</th><th className="p-3"></th></tr></thead><tbody>{filteredStatusRows.map((r, idx) => <tr key={r.id} className={idx % 2 ? 'bg-muted/20' : ''}><td className="p-3 font-medium">{r.account}</td><td className="p-3">{r.status === 'active' ? 'Actif' : 'Inactif'}</td><td className="p-3">{r.updated_date || '-'}</td><td className="p-3">{TYPES.find((x) => x.value === r.account_type)?.label || r.account_type}</td><td className="p-3 font-mono">{euro(r.invested)}</td><td className="p-3 font-mono">{euro(r.sold)}</td><td className="p-3 font-mono">{euro(r.real)}</td><td className="p-3 font-mono">{euro(r.gain)}</td><td className="p-3 font-mono">{pct(r.perf)}</td><td className="p-3 space-x-1"><Button size="icon" variant="ghost" onClick={() => fillStatusEdit(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => del(portfolioV2Api.deleteStatus, r.id)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}<tr className="font-semibold border-t"><td className="p-3">TOTAL</td><td className="p-3"></td><td className="p-3"></td><td className="p-3"></td><td className="p-3">{euro(recap.total.invested)}</td><td className="p-3">{euro(recap.total.sold)}</td><td className="p-3">{euro(recap.total.real)}</td><td className="p-3">{euro(recap.total.gain)}</td><td className="p-3">{pct(recap.total.perf)}</td><td className="p-3"></td></tr></tbody></table></CardContent></Card>
        </TabsContent>

        <TabsContent value="recap" className="space-y-4">
          <Card><CardHeader><CardTitle>Investi vs Réel par type d'actif</CardTitle></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={statusBarData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" /><YAxis /><Tooltip formatter={(v) => euro(v)} /><Legend /><Bar dataKey="invested" name="Investi" fill="#ef4444" /><Bar dataKey="real" name="Réel" fill="#22c55e" /></BarChart></ResponsiveContainer></div></CardContent></Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Proportion investi par type</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={investDonut} dataKey="value" nameKey="name" outerRadius={90} label>{investDonut.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip formatter={(v) => euro(v)} /><Legend /></PieChart></ResponsiveContainer></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Proportion réel par type</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={realDonut} dataKey="value" nameKey="name" outerRadius={90} label>{realDonut.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip formatter={(v) => euro(v)} /><Legend /></PieChart></ResponsiveContainer></div></CardContent></Card>
          </div>
          <Card className="overflow-hidden"><CardContent className="pt-0 overflow-auto"><table className="w-full text-sm min-w-[700px]"><thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Type</th><th className="p-3">Investi</th><th className="p-3">Vente</th><th className="p-3">Réel</th><th className="p-3">Gain</th><th className="p-3">%</th></tr></thead><tbody>{recap.rows.map((r, idx) => <tr key={r.type} className={idx % 2 ? 'bg-muted/20' : ''}><td className="p-3">{TYPES.find((x) => x.value === r.type)?.label || r.type}</td><td className="p-3">{euro(r.invested)}</td><td className="p-3">{euro(r.sold)}</td><td className="p-3">{euro(r.real)}</td><td className="p-3">{euro(r.gain)}</td><td className="p-3">{pct(r.perf)}</td></tr>)}<tr className="font-semibold border-t"><td className="p-3">TOTAL</td><td className="p-3">{euro(recap.total.invested)}</td><td className="p-3">{euro(recap.total.sold)}</td><td className="p-3">{euro(recap.total.real)}</td><td className="p-3">{euro(recap.total.gain)}</td><td className="p-3">{pct(recap.total.perf)}</td></tr></tbody></table></CardContent></Card>
        </TabsContent>

        <TabsContent value="depot" className="space-y-4">
          <Card><CardHeader><CardTitle>{editDepositId ? 'Modifier dépôt' : 'Ajouter dépôt'}</CardTitle></CardHeader><CardContent><form onSubmit={upsertDeposit} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-end"><div><Label>Compte</Label><Input list="deposit-account-options" value={depositForm.account_name} onChange={(e) => setDepositForm({ ...depositForm, account_name: e.target.value })} required /><datalist id="deposit-account-options">{accountOptions.map((a) => <option key={a} value={a} />)}</datalist></div><div><Label>Date</Label><Input type="date" value={depositForm.date} onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })} required /></div><div><Label>Investi</Label><Input type="number" step="0.01" value={depositForm.invested} onChange={(e) => setDepositForm({ ...depositForm, invested: e.target.value })} /></div><div><Label>Vente</Label><Input type="number" step="0.01" value={depositForm.sold} onChange={(e) => setDepositForm({ ...depositForm, sold: e.target.value })} /></div><div><Label>Total</Label><Input type="number" step="0.01" value={depositForm.total} onChange={(e) => setDepositForm({ ...depositForm, total: e.target.value })} /></div><div><Label>Commentaire</Label><Input value={depositForm.comment} onChange={(e) => setDepositForm({ ...depositForm, comment: e.target.value })} /></div><div className="flex gap-2"><Button type="submit"><Plus className="h-4 w-4 mr-1" />{editDepositId ? 'Maj' : 'Ajouter'}</Button>{editDepositId && <Button type="button" variant="outline" onClick={clearDepositEdit}><X className="h-4 w-4" /></Button>}</div></form></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex gap-2 items-center"><Label>Filtre compte</Label><select className="border rounded-md h-10 px-3 bg-background" value={depositAccountFilter} onChange={(e) => setDepositAccountFilter(e.target.value)}><option value="all">Tous</option>{accountOptions.map((a) => <option key={a} value={a}>{a}</option>)}</select></div></CardContent></Card>
          {depositsByAccount.map((g) => { const t = g.rows.reduce((a, r) => ({ i: a.i + n(r.invested), s: a.s + n(r.sold), t: a.t + n(r.total) }), { i: 0, s: 0, t: 0 }); return <Card key={g.k} className="overflow-hidden"><CardHeader><CardTitle>{g.k}</CardTitle></CardHeader><CardContent className="pt-0 overflow-auto"><table className="w-full text-sm min-w-[900px]"><thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Date</th><th className="p-3">Investi</th><th className="p-3">Vente</th><th className="p-3">Total</th><th className="p-3">Commentaire</th><th className="p-3"></th></tr></thead><tbody>{g.rows.map((r, idx) => <tr key={r.id} className={idx % 2 ? 'bg-muted/20' : ''}><td className="p-3">{r.date}</td><td className="p-3">{euro(r.invested)}</td><td className="p-3">{euro(r.sold)}</td><td className="p-3">{euro(r.total)}</td><td className="p-3">{r.comment || '-'}</td><td className="p-3 space-x-1"><Button size="icon" variant="ghost" onClick={() => fillDepositEdit(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => del(portfolioV2Api.deleteDeposit, r.id)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}<tr className="font-semibold border-t"><td className="p-3">TOTAL</td><td className="p-3">{euro(t.i)}</td><td className="p-3">{euro(t.s)}</td><td className="p-3">{euro(t.t)}</td><td className="p-3"></td><td className="p-3"></td></tr></tbody></table></CardContent></Card>; })}
        </TabsContent>

        <TabsContent value="vente" className="space-y-4">
          <Card><CardHeader><CardTitle>{editSaleId ? 'Modifier vente' : 'Ajouter vente'}</CardTitle></CardHeader><CardContent><form onSubmit={upsertSale} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-end"><div><Label>Date</Label><Input type="date" value={saleForm.date} onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })} required /></div><div><Label>Montant</Label><Input type="number" step="0.01" value={saleForm.amount} onChange={(e) => setSaleForm({ ...saleForm, amount: e.target.value })} required /></div><div><Label>Provenance</Label><Input value={saleForm.source} onChange={(e) => setSaleForm({ ...saleForm, source: e.target.value })} required /></div><div><Label>Reçu sur</Label><Input value={saleForm.received_on} onChange={(e) => setSaleForm({ ...saleForm, received_on: e.target.value })} required /></div><div><Label>Type</Label><select className="w-full border rounded-md h-10 px-3 bg-background" value={saleForm.sale_type} onChange={(e) => setSaleForm({ ...saleForm, sale_type: e.target.value })}>{SALE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-2"><Button type="submit"><Plus className="h-4 w-4 mr-1" />{editSaleId ? 'Maj' : 'Ajouter'}</Button>{editSaleId && <Button type="button" variant="outline" onClick={clearSaleEdit}><X className="h-4 w-4" /></Button>}</div><div className="md:col-span-7"><Label>Commentaire</Label><Textarea value={saleForm.comment} onChange={(e) => setSaleForm({ ...saleForm, comment: e.target.value })} /></div></form></CardContent></Card>
          <Card className="overflow-hidden"><CardContent className="pt-0 overflow-auto"><table className="w-full text-sm min-w-[930px]"><thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Date</th><th className="p-3">Montant</th><th className="p-3">Provenance</th><th className="p-3">Reçu sur</th><th className="p-3">Commentaire</th><th className="p-3">Type</th><th className="p-3"></th></tr></thead><tbody>{sales.map((r, idx) => <tr key={r.id} className={idx % 2 ? 'bg-muted/20' : ''}><td className="p-3">{r.date}</td><td className="p-3">{euro(r.amount)}</td><td className="p-3">{r.source}</td><td className="p-3">{r.received_on}</td><td className="p-3">{r.comment || '-'}</td><td className="p-3">{r.sale_type}</td><td className="p-3 space-x-1"><Button size="icon" variant="ghost" onClick={() => fillSaleEdit(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => del(portfolioV2Api.deleteSale, r.id)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></CardContent></Card>
        </TabsContent>

        <TabsContent value="physique" className="space-y-4">
          <Card><CardHeader><CardTitle>{editPhysicalId ? 'Modifier actif physique' : 'Ajouter actif physique'}</CardTitle></CardHeader><CardContent><form onSubmit={upsertPhysical} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-end"><div><Label>Date Achat</Label><Input type="date" value={phyForm.purchase_date} onChange={(e) => setPhyForm({ ...phyForm, purchase_date: e.target.value })} /></div><div><Label>Catégorie</Label><Input value={phyForm.category} onChange={(e) => setPhyForm({ ...phyForm, category: e.target.value })} /></div><div><Label>Marque</Label><Input value={phyForm.brand} onChange={(e) => setPhyForm({ ...phyForm, brand: e.target.value })} /></div><div><Label>Nom</Label><Input value={phyForm.name} onChange={(e) => setPhyForm({ ...phyForm, name: e.target.value })} required /></div><div><Label>Boutique achat</Label><Input value={phyForm.purchase_shop} onChange={(e) => setPhyForm({ ...phyForm, purchase_shop: e.target.value })} /></div><div><Label>Prix Achat</Label><Input type="number" step="0.01" value={phyForm.purchase_price} onChange={(e) => setPhyForm({ ...phyForm, purchase_price: e.target.value })} /></div><div><Label>Valorisation</Label><Input type="number" step="0.01" value={phyForm.valuation} onChange={(e) => setPhyForm({ ...phyForm, valuation: e.target.value })} /></div><div><Label>Prix Vente</Label><Input type="number" step="0.01" value={phyForm.sale_price} onChange={(e) => setPhyForm({ ...phyForm, sale_price: e.target.value })} /></div><div><Label>Date Vente</Label><Input type="date" value={phyForm.sale_date} onChange={(e) => setPhyForm({ ...phyForm, sale_date: e.target.value })} /></div><div><Label>Boutique vente</Label><Input value={phyForm.sale_shop} onChange={(e) => setPhyForm({ ...phyForm, sale_shop: e.target.value })} /></div><div className="flex gap-2"><Button type="submit"><Plus className="h-4 w-4 mr-1" />{editPhysicalId ? 'Maj' : 'Ajouter'}</Button>{editPhysicalId && <Button type="button" variant="outline" onClick={clearPhysicalEdit}><X className="h-4 w-4" /></Button>}</div></form>{editPhysicalId && <div className="mt-4 space-y-3"><ItemLinksManager itemType="portfolio_physical" itemId={editPhysicalId} itemName={phyForm.name || 'Actif physique'} onUpdate={load} /><FileUploader itemType="portfolio_physical" itemId={editPhysicalId} onUpdate={load} /></div>}</CardContent></Card>
          <Card className="overflow-hidden"><CardContent className="pt-0 overflow-auto"><table className="w-full text-sm min-w-[1250px]"><thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Date Achat</th><th className="p-3">Catégorie</th><th className="p-3">Marque</th><th className="p-3">Nom</th><th className="p-3">Boutique achat</th><th className="p-3">Prix Achat</th><th className="p-3">Valorisation</th><th className="p-3">Prix Vente</th><th className="p-3">Date Vente</th><th className="p-3">Boutique Vente</th><th className="p-3">Marge</th><th className="p-3"></th></tr></thead><tbody>{physical.map((r, idx) => <tr key={r.id} className={idx % 2 ? 'bg-muted/20' : ''}><td className="p-3">{r.purchase_date || '-'}</td><td className="p-3">{r.category || '-'}</td><td className="p-3">{r.brand || '-'}</td><td className="p-3">{r.name}</td><td className="p-3">{r.purchase_shop || '-'}</td><td className="p-3">{euro(r.purchase_price)}</td><td className="p-3">{euro(r.valuation)}</td><td className="p-3">{euro(r.sale_price)}</td><td className="p-3">{r.sale_date || '-'}</td><td className="p-3">{r.sale_shop || '-'}</td><td className="p-3">{euro(r.margin)}</td><td className="p-3 space-x-1"><Button size="icon" variant="ghost" onClick={() => fillPhysicalEdit(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => del(portfolioV2Api.deletePhysicalAsset, r.id)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></CardContent></Card>
        </TabsContent>

        <TabsContent value="suivi" className="space-y-4">
          <Card><CardHeader><CardTitle>{editSnapId ? 'Modifier snapshot' : 'Créer snapshot manuel'} (avec détail par type)</CardTitle></CardHeader><CardContent><form onSubmit={upsertSnap} className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-8 gap-2 items-end"><div><Label>Date</Label><Input type="date" value={snapForm.date} onChange={(e) => setSnapForm({ ...snapForm, date: e.target.value })} required /></div><div><Label>Total investi</Label><Input type="number" step="0.01" value={snapForm.total_invested} onChange={(e) => setSnapForm({ ...snapForm, total_invested: e.target.value })} /></div><div><Label>Total vente</Label><Input type="number" step="0.01" value={snapForm.total_sold} onChange={(e) => setSnapForm({ ...snapForm, total_sold: e.target.value })} /></div><div><Label>Total réel</Label><Input type="number" step="0.01" value={snapForm.total_real} onChange={(e) => setSnapForm({ ...snapForm, total_real: e.target.value })} /></div><div><Label>Total gain</Label><Input type="number" step="0.01" value={snapForm.total_gain} onChange={(e) => setSnapForm({ ...snapForm, total_gain: e.target.value })} /></div><div><Label>Total perf %</Label><Input type="number" step="0.01" value={snapForm.total_perf_pct} onChange={(e) => setSnapForm({ ...snapForm, total_perf_pct: e.target.value })} /></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">{TYPES.map((t) => <div key={t.value} className="border rounded-md p-2 bg-muted/20"><p className="text-xs font-semibold mb-2">{t.label}</p><div className="space-y-1"><Input type="number" step="0.01" placeholder="Investi" value={snapTypeInputs[t.value]?.invested || ''} onChange={(e) => setSnapTypeInputs((prev) => ({ ...prev, [t.value]: { ...prev[t.value], invested: e.target.value } }))} /><Input type="number" step="0.01" placeholder="Vente" value={snapTypeInputs[t.value]?.sold || ''} onChange={(e) => setSnapTypeInputs((prev) => ({ ...prev, [t.value]: { ...prev[t.value], sold: e.target.value } }))} /><Input type="number" step="0.01" placeholder="Réel" value={snapTypeInputs[t.value]?.real || ''} onChange={(e) => setSnapTypeInputs((prev) => ({ ...prev, [t.value]: { ...prev[t.value], real: e.target.value } }))} /></div></div>)}</div><div className="flex gap-2"><Button type="submit"><Plus className="h-4 w-4 mr-1" />{editSnapId ? 'Maj' : 'Snapshot'}</Button>{editSnapId && <Button type="button" variant="outline" onClick={clearSnapEdit}><X className="h-4 w-4" /></Button>}</div></form></CardContent></Card>
          <Card><CardHeader><CardTitle>Total investi/réel</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={snapSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(v) => euro(v)} /><Legend /><Line dataKey="total_invested" stroke="#ef4444" name="Montant investi" /><Line dataKey="total_real" stroke="#22c55e" name="Valeur actuelle" /></LineChart></ResponsiveContainer></div></CardContent></Card>
          {typeSeries.map((s) => <Card key={s.type}><CardHeader><CardTitle>Evolution {TYPES.find((x) => x.value === s.type)?.label || s.type}</CardTitle></CardHeader><CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={s.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(v) => euro(v)} /><Legend /><Line dataKey="invested" stroke="#ef4444" name="Montant investi" /><Line dataKey="real" stroke="#22c55e" name="Valeur actuelle" /></LineChart></ResponsiveContainer></div></CardContent></Card>)}
          <Card><CardContent className="pt-0 overflow-auto"><table className="w-full text-sm min-w-[1300px]"><thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Date</th><th className="p-3">Total Invest (Investi - Vente)</th><th className="p-3">Total Réel</th><th className="p-3">Total Gain</th><th className="p-3">Total Perf %</th>{TYPES.map((t) => <th key={t.value} className="p-3">{t.label} (Inv/Réel)</th>)}<th className="p-3"></th></tr></thead><tbody>{snapSeries.map((r, idx) => <tr key={r.id} className={idx % 2 ? 'bg-muted/20' : ''}><td className="p-3">{r.date}</td><td className="p-3">{euro(r.total_net_invest)}</td><td className="p-3">{euro(r.total_real)}</td><td className="p-3">{euro(r.total_gain_calc)}</td><td className="p-3">{pct(r.total_perf_calc)}</td>{TYPES.map((t) => <td key={t.value} className="p-3">{euro(r.by_type?.[t.value]?.invested)} / {euro(r.by_type?.[t.value]?.real)}</td>)}<td className="p-3 space-x-1"><Button size="icon" variant="ghost" onClick={() => fillSnapEdit(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => del(portfolioV2Api.deleteSnapshot, r.id)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortfolioPage;


