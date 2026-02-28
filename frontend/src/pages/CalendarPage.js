import { useState, useEffect, useMemo } from 'react';
import { calendarApi, tagsApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Calendar } from '../components/ui/calendar';
import { MultiSelect } from '../components/MultiSelect';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  CalendarDays, Package, Heart, BookOpen, FolderKanban,
  CheckSquare, ChevronLeft, ChevronRight,
} from 'lucide-react';

const TYPE_CONFIG = {
  inventory: { label: 'Inventaire', icon: Package, color: 'bg-violet-500' },
  wishlist: { label: 'Souhaits', icon: Heart, color: 'bg-pink-500' },
  content: { label: 'Contenu', icon: BookOpen, color: 'bg-cyan-500' },
  projects: { label: 'Projets', icon: FolderKanban, color: 'bg-amber-500' },
  tasks: { label: 'Taches', icon: CheckSquare, color: 'bg-emerald-500' },
};

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evtRes, tagsRes] = await Promise.all([calendarApi.getEvents(), tagsApi.getAll()]);
        setEvents(evtRes.data);
        setAllTags(tagsRes.data);
      } catch { toast.error('Erreur lors du chargement'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      if (filterTypes.length && !filterTypes.includes(evt.type)) return false;
      if (filterTags.length && !filterTags.some(t => evt.tags?.includes(t))) return false;
      return true;
    });
  }, [events, filterTypes, filterTags]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach(evt => {
      if (!evt.date) return;
      const d = evt.date.substring(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(evt);
    });
    return map;
  }, [filteredEvents]);

  // Get date range based on timeRange
  const dateRange = useMemo(() => {
    const now = currentMonth;
    const y = now.getFullYear();
    const m = now.getMonth();
    if (timeRange === 'week') {
      const day = now.getDay() || 7;
      const start = new Date(y, m, now.getDate() - day + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end };
    } else if (timeRange === 'month') {
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
    } else {
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
    }
  }, [currentMonth, timeRange]);

  // Events in current range
  const rangeEvents = useMemo(() => {
    return filteredEvents.filter(evt => {
      const d = new Date(evt.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [filteredEvents, dateRange]);

  // Dates with events (for highlighting in calendar)
  const eventDates = useMemo(() => {
    return Object.keys(eventsByDate).map(d => new Date(d + 'T00:00:00'));
  }, [eventsByDate]);

  // Selected date events
  const selectedEvents = selectedDate
    ? eventsByDate[selectedDate.toISOString().substring(0, 10)] || []
    : rangeEvents;

  const navigateMonth = (delta) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + delta);
    setCurrentMonth(next);
    setSelectedDate(null);
  };

  const typeOpts = Object.entries(TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }));
  const tagOpts = allTags.map(t => ({ value: t.name, label: t.name }));

  if (loading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-[500px] w-full" /></div>);
  }

  return (
    <div className="space-y-6" data-testid="calendar-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendrier</h1>
          <p className="text-muted-foreground mt-1">{rangeEvents.length} evenements dans la periode</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[160px] text-center capitalize">
            {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        {/* Calendar widget */}
        <div>
          <Card className="bg-card border-border">
            <CardContent className="p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => setSelectedDate(d || null)}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                modifiers={{ hasEvent: eventDates }}
                modifiersStyles={{
                  hasEvent: { fontWeight: 'bold', textDecoration: 'underline', textDecorationColor: 'hsl(262 83% 58%)', textUnderlineOffset: '4px' }
                }}
              />
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="mt-4 space-y-3">
            <MultiSelect options={typeOpts} selected={filterTypes} onChange={setFilterTypes} placeholder="Sections" testId="cal-filter-types" />
            {tagOpts.length > 0 && <MultiSelect options={tagOpts} selected={filterTags} onChange={setFilterTags} placeholder="Tags" testId="cal-filter-tags" />}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger data-testid="cal-time-range"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semaine</SelectItem>
                <SelectItem value="month">Mois</SelectItem>
                <SelectItem value="year">Annee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <Badge key={key} variant="outline" className="gap-1.5 text-xs">
                <div className={`w-2 h-2 rounded-full ${cfg.color}`} />{cfg.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Events list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {selectedDate
                ? selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                : `Tous les evenements (${selectedEvents.length})`
              }
            </h2>
            {selectedDate && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                Voir tout
              </Button>
            )}
          </div>

          {selectedEvents.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun evenement</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDate ? 'Aucun evenement ce jour' : 'Aucun evenement dans cette periode'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(evt => {
                const cfg = TYPE_CONFIG[evt.type] || { label: evt.type, icon: CalendarDays, color: 'bg-zinc-500' };
                const Icon = cfg.icon;
                return (
                  <Card key={`${evt.type}-${evt.id}`} className="bg-card border-border" data-testid={`cal-event-${evt.id}`}>
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className={`w-1 h-10 rounded-full ${cfg.color} flex-shrink-0`} />
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${evt.completed ? 'line-through opacity-60' : ''}`}>
                          {evt.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{evt.date}</span>
                          <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                          {evt.tags?.slice(0, 2).map(t => (
                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
