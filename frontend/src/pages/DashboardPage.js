import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { 
  Layers, 
  Package, 
  Heart, 
  FolderKanban, 
  BookOpen, 
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRecent(5)
      ]);
      setStats(statsRes.data);
      setRecent(recentRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const portfolioData = [
    { name: 'Investi', value: stats?.portfolio_invested || 0 },
    { name: 'Gains', value: Math.max(0, stats?.portfolio_gain || 0) },
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

  const statCards = [
    { label: 'Collections', value: stats?.collections, icon: Layers, href: '/collections', color: 'text-blue-400' },
    { label: 'Inventaire', value: stats?.inventory, icon: Package, href: '/inventory', color: 'text-violet-400' },
    { label: 'Souhaits', value: stats?.wishlist, icon: Heart, href: '/wishlist', color: 'text-pink-400' },
    { label: 'Projets actifs', value: stats?.projects, icon: FolderKanban, href: '/projects', color: 'text-amber-400' },
    { label: 'Tâches en cours', value: stats?.tasks_pending, icon: CheckCircle2, href: '/projects', color: 'text-emerald-400' },
    { label: 'Contenus', value: stats?.content, icon: BookOpen, href: '/content', color: 'text-cyan-400' },
    { label: 'Actifs', value: stats?.portfolio, icon: TrendingUp, href: '/portfolio', color: 'text-orange-400' },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de votre espace personnel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.href}>
            <Card className="bg-card border-border card-hover h-full" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} strokeWidth={1.5} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold font-mono">{stat.value || 0}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Portfolio Summary */}
        <Card className="bg-card border-border col-span-1 lg:col-span-2" data-testid="portfolio-summary-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Portefeuille
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Investi</p>
                <p className="text-xl font-bold font-mono">{formatCurrency(stats?.portfolio_invested)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Valeur actuelle</p>
                <p className="text-xl font-bold font-mono">{formatCurrency(stats?.portfolio_current)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Gain/Perte</p>
                <div className="flex items-center gap-1">
                  {(stats?.portfolio_gain || 0) >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-400" />
                  )}
                  <p className={`text-xl font-bold font-mono ${(stats?.portfolio_gain || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(stats?.portfolio_gain)}
                  </p>
                </div>
              </div>
            </div>
            {stats?.portfolio_invested > 0 && (
              <div className="h-32 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {portfolioData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wishlist & Inventory Value */}
        <Card className="bg-card border-border" data-testid="values-summary-card">
          <CardHeader>
            <CardTitle className="text-lg">Valeurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-violet-400" />
                <span className="text-sm text-muted-foreground">Valeur inventaire</span>
              </div>
              <p className="text-2xl font-bold font-mono">{formatCurrency(stats?.inventory_value)}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-pink-400" />
                <span className="text-sm text-muted-foreground">Total souhaits</span>
              </div>
              <p className="text-2xl font-bold font-mono">{formatCurrency(stats?.wishlist_total)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <Card className="bg-card border-border" data-testid="recent-tasks-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Tâches à faire
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent?.tasks?.length > 0 ? (
              <div className="space-y-3">
                {recent.tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full priority-${task.priority}`} />
                      <span className="text-sm">{task.title}</span>
                    </div>
                    {task.due_date && (
                      <Badge variant="outline" className="text-xs">
                        {formatDate(task.due_date)}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune tâche en cours</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Inventory */}
        <Card className="bg-card border-border" data-testid="recent-inventory-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-violet-400" />
              Derniers ajouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent?.inventory?.length > 0 ? (
              <div className="space-y-3">
                {recent.inventory.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/30 transition-colors">
                    <span className="text-sm">{item.name}</span>
                    {item.current_value && (
                      <span className="text-sm font-mono text-muted-foreground">
                        {formatCurrency(item.current_value)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun item dans l'inventaire</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

