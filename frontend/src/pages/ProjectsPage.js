import { useState, useEffect, useRef } from 'react';
import { projectsApi, tasksApi, tagsApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Plus, MoreVertical, Pencil, Trash2, FolderKanban, Loader2,
  CheckCircle2, Circle, Calendar, CornerDownRight, Search, X, ChevronDown, ChevronRight,
} from 'lucide-react';
import ItemLinksManager from '../components/ItemLinksManager';
import FileUploader from '../components/FileUploader';
import { MultiSelect } from '../components/MultiSelect';

const COLORS = [
  { value: 'blue', label: 'Bleu', class: 'bg-blue-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'pink', label: 'Rose', class: 'bg-pink-500' },
  { value: 'amber', label: 'Ambre', class: 'bg-amber-500' },
  { value: 'emerald', label: 'Émeraude', class: 'bg-emerald-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
];

const PRIORITIES = [
  { value: 1, label: 'Urgent', color: 'bg-red-500' },
  { value: 2, label: 'Haute', color: 'bg-orange-500' },
  { value: 3, label: 'Moyenne', color: 'bg-yellow-500' },
  { value: 4, label: 'Basse', color: 'bg-blue-500' },
  { value: 5, label: 'Faible', color: 'bg-zinc-500' },
];

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [newTaskTag, setNewTaskTag] = useState('');
  const [hierarchyFilterProjects, setHierarchyFilterProjects] = useState([]);
  const [collapsedHierarchyProjects, setCollapsedHierarchyProjects] = useState({});
  const dropdownActionRef = useRef(false);
  const LEVEL_COLOR_CLASSES = ['bg-indigo-500/10', 'bg-cyan-500/10', 'bg-emerald-500/10', 'bg-amber-500/10', 'bg-fuchsia-500/10'];
  const getLevelBgClass = (depth) => LEVEL_COLOR_CLASSES[depth % LEVEL_COLOR_CLASSES.length];

  const [projectForm, setProjectForm] = useState({
    name: '', description: '', color: 'blue', parent_id: '', tags: []
  });

  const [taskForm, setTaskForm] = useState({
    title: '', description: '', project_id: '', due_date: '', priority: 3, tags: []
  });

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!projects.length || Object.keys(collapsedHierarchyProjects).length > 0) return;
    const next = {};
    projects.forEach((project) => {
      const hasChildrenProjects = getChildren(project.id).length > 0;
      const hasDirectTasks = tasks.some((t) => t.project_id === project.id);
      if (hasChildrenProjects || hasDirectTasks) next[project.id] = true;
    });
    setCollapsedHierarchyProjects(next);
  }, [projects, tasks, collapsedHierarchyProjects]);

  const fetchData = async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        projectsApi.getAll(), tasksApi.getAll()
      ]);
      let tagsRes;
      try { tagsRes = await tagsApi.getAll(); } catch { tagsRes = { data: [] }; }
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
      setAllTags(tagsRes.data || []);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleOpenProjectDialog = (project = null, parentId = null) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name, description: project.description || '',
        color: project.color || 'blue', parent_id: project.parent_id || '', tags: project.tags || []
      });
    } else {
      setEditingProject(null);
      setProjectForm({ name: '', description: '', color: 'blue', parent_id: parentId || '', tags: [] });
    }
    setProjectDialogOpen(true);
  };

  const handleOpenTaskDialog = (task = null, projectId = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title, description: task.description || '',
        project_id: task.project_id || '', due_date: task.due_date || '',
        priority: task.priority || 3, tags: task.tags || []
      });
    } else {
      setEditingTask(null);
      setTaskForm({ title: '', description: '', project_id: projectId || '', due_date: '', priority: 3, tags: [] });
    }
    setNewTaskTag('');
    setTaskDialogOpen(true);
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...projectForm, parent_id: projectForm.parent_id || null };
    try {
      if (editingProject) {
        await projectsApi.update(editingProject.id, data);
        toast.success('Projet mis à jour');
      } else {
        await projectsApi.create(data);
        toast.success('Projet créé');
      }
      setProjectDialogOpen(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...taskForm, project_id: taskForm.project_id || null };
    try {
      if (editingTask) {
        await tasksApi.update(editingTask.id, data);
        toast.success('Tâche mise à jour');
      } else {
        await tasksApi.create(data);
        toast.success('Tâche créée');
      }
      setTaskDialogOpen(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDeleteProject = async (project) => {
    try {
      await projectsApi.delete(project.id);
      toast.success('Projet supprimé');
      fetchData();
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const handleDeleteTask = async (task) => {
    try {
      await tasksApi.delete(task.id);
      toast.success('Tâche supprimée');
      fetchData();
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const markDropdownAction = () => {
    dropdownActionRef.current = true;
    setTimeout(() => { dropdownActionRef.current = false; }, 250);
  };

  const handleToggleTask = async (task) => {
    try {
      await tasksApi.update(task.id, { completed: !task.completed });
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const getColorClass = (color) => COLORS.find(c => c.value === color)?.class || 'bg-blue-500';
  const getPriorityInfo = (priority) => PRIORITIES.find(p => p.value === priority) || PRIORITIES[2];
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Build project tree
  const rootProjects = projects.filter(p => !p.parent_id);
  const getChildren = (parentId) => projects.filter(p => p.parent_id === parentId);
  const getDescendantProjectIds = (projectId) => {
    const directChildren = getChildren(projectId);
    const descendantIds = [];
    directChildren.forEach((child) => {
      descendantIds.push(child.id);
      descendantIds.push(...getDescendantProjectIds(child.id));
    });
    return descendantIds;
  };

  const getProjectAggregateStats = (projectId) => {
    const projectIds = [projectId, ...getDescendantProjectIds(projectId)];
    const relatedTasks = tasks.filter((task) => projectIds.includes(task.project_id));
    const total = relatedTasks.length;
    const completed = relatedTasks.filter((task) => task.completed).length;
    return { total, completed };
  };

  const getAncestorProjectIds = (projectId) => {
    const ancestors = [];
    const seen = new Set();
    let current = projects.find((p) => p.id === projectId);

    while (current?.parent_id && !seen.has(current.parent_id)) {
      seen.add(current.parent_id);
      ancestors.push(current.parent_id);
      current = projects.find((p) => p.id === current.parent_id);
    }
    return ancestors;
  };

  const selectedProjectIds = hierarchyFilterProjects.length === 0
    ? null
    : [...new Set(hierarchyFilterProjects.flatMap((projectId) => [projectId, ...getDescendantProjectIds(projectId)]))];

  const filteredTasks = tasks.filter(task => {
    if (!showCompleted && task.completed) return false;
    if (selectedProjectIds && !selectedProjectIds.includes(task.project_id)) return false;
    if (filterTags.length && !filterTags.some(t => task.tags?.includes(t))) return false;
    if (searchQuery && !task.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const tagNames = allTags.map(t => t.name);
  const tagOpts = tagNames.map(t => ({ value: t, label: t }));
  const buildProjectFilterOptions = (parentId = null, seen = new Set()) => {
    const branch = projects
      .filter((p) => (parentId ? p.parent_id === parentId : !p.parent_id))
      .map((project) => {
        if (seen.has(project.id)) return null;
        const nextSeen = new Set(seen);
        nextSeen.add(project.id);
        return {
          value: project.id,
          label: project.name,
          children: buildProjectFilterOptions(project.id, nextSeen),
        };
      })
      .filter(Boolean);
    return branch;
  };
  const projectFilterOpts = buildProjectFilterOptions();
  const disallowedParentProjectIds = editingProject
    ? new Set([editingProject.id, ...getDescendantProjectIds(editingProject.id)])
    : new Set();
  const pruneProjectOptions = (options) => options
    .map((opt) => {
      const children = pruneProjectOptions(opt.children || []);
      if (disallowedParentProjectIds.has(opt.value)) {
        return null;
      }
      return { ...opt, children };
    })
    .filter(Boolean);
  const parentProjectOpts = pruneProjectOptions(projectFilterOpts);

  const addTaskTag = () => {
    const tag = newTaskTag.trim();
    if (!tag || taskForm.tags.includes(tag)) return;
    setTaskForm({ ...taskForm, tags: [...taskForm.tags, tag] });
    setNewTaskTag('');
  };
  const removeTaskTag = (tag) => setTaskForm({ ...taskForm, tags: taskForm.tags.filter(t => t !== tag) });

  const buildHierarchyRows = () => {
    const rows = [];

    const pushProject = (project, depth = 0) => {
      rows.push({ kind: 'project', depth, project });

      const projectTasks = tasks.filter((t) => t.project_id === project.id);
      projectTasks.forEach((task) => rows.push({ kind: 'task', depth: depth + 1, task, project }));

      const children = getChildren(project.id);
      children.forEach((child) => pushProject(child, depth + 1));
    };

    rootProjects.forEach((project) => pushProject(project, 0));
    return rows;
  };

  const hierarchyRows = buildHierarchyRows();
  const hasHierarchyFilter = hierarchyFilterProjects.length > 0;
  const selectedHierarchyProjectIds = hasHierarchyFilter
    ? new Set(hierarchyFilterProjects.flatMap((projectId) => [projectId, ...getDescendantProjectIds(projectId)]))
    : null;
  const visibleHierarchyProjectIds = hasHierarchyFilter
    ? (() => {
        const visible = new Set();
        selectedHierarchyProjectIds.forEach((projectId) => {
          visible.add(projectId);
          getAncestorProjectIds(projectId).forEach((ancestorId) => visible.add(ancestorId));
        });
        return visible;
      })()
    : null;

  const filteredHierarchyRows = hierarchyRows.filter((row) => {
    if (!hasHierarchyFilter) return true;
    if (row.kind === 'project') return visibleHierarchyProjectIds.has(row.project.id);
    return selectedHierarchyProjectIds.has(row.task.project_id);
  });
  const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));
  const hasCollapsedAncestor = (projectId) => {
    let current = projectById[projectId];
    while (current?.parent_id) {
      if (collapsedHierarchyProjects[current.parent_id]) return true;
      current = projectById[current.parent_id];
    }
    return false;
  };
  const hierarchyRowsWithCollapse = filteredHierarchyRows.filter((row) => {
    if (row.kind === 'project') {
      return !hasCollapsedAncestor(row.project.id);
    }
    return !collapsedHierarchyProjects[row.task.project_id] && !hasCollapsedAncestor(row.task.project_id);
  });
  const toggleHierarchyProject = (projectId) => {
    setCollapsedHierarchyProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };
  const expandAllHierarchyProjects = () => {
    setCollapsedHierarchyProjects({});
  };
  const collapseAllHierarchyProjects = () => {
    const next = {};
    projects.forEach((project) => {
      const hasChildrenProjects = getChildren(project.id).length > 0;
      const hasDirectTasks = tasks.some((t) => t.project_id === project.id);
      if (hasChildrenProjects || hasDirectTasks) next[project.id] = true;
    });
    setCollapsedHierarchyProjects(next);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="projects-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projets & Tâches</h1>
          <p className="text-muted-foreground mt-1">Organisez vos projets et suivez vos tâches</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleOpenTaskDialog()} data-testid="add-task-btn">
            <Plus className="h-4 w-4 mr-2" />Nouvelle tâche
          </Button>
          <Button onClick={() => handleOpenProjectDialog()} data-testid="add-project-btn">
            <Plus className="h-4 w-4 mr-2" />Nouveau projet
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Rechercher..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
                {tagOpts.length > 0 && <MultiSelect options={tagOpts} selected={filterTags} onChange={setFilterTags} placeholder="Tags" testId="projects-filter-tags" />}
        <MultiSelect
          options={projectFilterOpts}
          selected={hierarchyFilterProjects}
          onChange={setHierarchyFilterProjects}
          placeholder="Projets"
          testId="hierarchy-filter-project"
          hierarchical
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks" data-testid="tasks-tab">Tâches</TabsTrigger>
          <TabsTrigger value="hierarchy" data-testid="hierarchy-tab">Arborescence</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Checkbox id="showCompleted" checked={showCompleted} onCheckedChange={setShowCompleted}
                data-testid="show-completed-checkbox" />
              <Label htmlFor="showCompleted" className="text-sm cursor-pointer">Afficher terminées</Label>
            </div>
            {hierarchyFilterProjects.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setHierarchyFilterProjects([])}>
                Réinitialiser
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Le filtre projet de l'en-tête reste actif entre les onglets et inclut automatiquement les sous-projets.
          </div>

          {filteredTasks.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune tâche</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {showCompleted ? 'Aucune tâche trouvée' : 'Toutes vos tâches sont terminées !'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => {
                const priorityInfo = getPriorityInfo(task.priority);
                const project = projects.find(p => p.id === task.project_id);
                return (
                  <Card key={task.id} className={`bg-card border-border card-hover cursor-pointer ${task.completed ? 'opacity-60' : ''}`}
                    onClick={() => { if (!dropdownActionRef.current) handleOpenTaskDialog(task); }}
                    data-testid={`task-card-${task.id}`}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-4">
                        <button onClick={(e) => { e.stopPropagation(); handleToggleTask(task); }} className="flex-shrink-0"
                          data-testid={`task-toggle-${task.id}`}>
                          {task.completed
                            ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${priorityInfo.color}`} />
                          </div>
                          {project && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className={`w-2 h-2 rounded-full ${getColorClass(project.color)}`} />
                              <span className="text-xs text-muted-foreground">{project.name}</span>
                            </div>
                          )}
                        </div>
                        {task.due_date && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />{formatDate(task.due_date)}
                          </Badge>
                        )}
                        <DropdownMenu onOpenChange={(open) => {
                          if (!open) {
                            dropdownActionRef.current = true;
                            setTimeout(() => { dropdownActionRef.current = false; }, 250);
                          }
                        }}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                            <DropdownMenuItem onSelect={() => { markDropdownAction(); handleOpenTaskDialog(task); }}>
                              <Pencil className="h-4 w-4 mr-2" />Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => { markDropdownAction(); handleDeleteTask(task); }} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={expandAllHierarchyProjects}>
              Tout déplier
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={collapseAllHierarchyProjects}>
              Tout replier
            </Button>
          </div>
          {hierarchyRows.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune donnée</h3>
                <p className="text-sm text-muted-foreground">Créez des projets et des tâches pour voir l'arborescence.</p>
              </CardContent>
            </Card>
          ) : filteredHierarchyRows.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun résultat</h3>
                <p className="text-sm text-muted-foreground">Aucune ligne ne correspond au filtre projet sélectionné.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Structure</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Projet parent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hierarchyRowsWithCollapse.map((row, index) => {
                    const indent = row.depth * 18;

                    if (row.kind === 'project') {
                      const project = row.project;
                      const aggregateStats = getProjectAggregateStats(project.id);
                      const hasChildrenProjects = getChildren(project.id).length > 0;
                      const hasDirectTasks = tasks.some((t) => t.project_id === project.id);
                      const hasChildren = hasChildrenProjects || hasDirectTasks;
                      const isCollapsed = !!collapsedHierarchyProjects[project.id];
                      return (
                        <TableRow key={`h-project-${project.id}-${index}`} className={`hover:bg-secondary/20 ${getLevelBgClass(row.depth)}`}>
                          <TableCell>
                            <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
                              {hasChildren ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleHierarchyProject(project.id);
                                  }}
                                  title={isCollapsed ? 'Développer' : 'Réduire'}
                                >
                                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </Button>
                              ) : (
                                <span className="h-6 w-6" />
                              )}
                              <FolderKanban className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{project.name}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">Projet</Badge></TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {aggregateStats.completed}/{aggregateStats.total} tâches terminées
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {project.parent_id ? (projects.find((p) => p.id === project.parent_id)?.name || '-') : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenProjectDialog(project);
                                }}
                                title="Modifier le projet"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project);
                                }}
                                title="Supprimer le projet"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const task = row.task;
                    return (
                      <TableRow key={`h-task-${task.id}-${index}`} className={`hover:bg-secondary/20 cursor-pointer ${getLevelBgClass(row.depth)}`} onClick={() => handleOpenTaskDialog(task)}>
                        <TableCell>
                          <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
                            <CornerDownRight className="h-4 w-4 text-muted-foreground" />
                            <span className={task.completed ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">Tâche</Badge></TableCell>
                        <TableCell>
                          {task.completed ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">Terminée</Badge>
                          ) : (
                            <Badge variant="outline">À faire</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.project?.name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTaskDialog(task);
                              }}
                              title="Modifier la tâche"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task);
                              }}
                              title="Supprimer la tâche"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmitTask}>
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
              <DialogDescription>Gérez votre tâche</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input value={taskForm.title}
                  onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                  placeholder="Ex: Finaliser le rapport" required data-testid="task-title-input" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={taskForm.description}
                  onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                  placeholder="Détails..." data-testid="task-description-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Projet</Label>
                  <div className="flex items-center gap-2">
                    <MultiSelect
                      options={projectFilterOpts}
                      selected={taskForm.project_id ? [taskForm.project_id] : []}
                      onChange={(values) => {
                        const next = values.length ? values[values.length - 1] : '';
                        setTaskForm({ ...taskForm, project_id: next });
                      }}
                      placeholder="Projet"
                      testId="task-project-select"
                      hierarchical
                    />
                    {taskForm.project_id && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setTaskForm({ ...taskForm, project_id: '' })}>
                        Aucun
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={String(taskForm.priority)}
                    onValueChange={v => setTaskForm({...taskForm, priority: parseInt(v)})}>
                    <SelectTrigger data-testid="task-priority-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={String(p.value)}>
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${p.color}`} />{p.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date d'échéance</Label>
                <Input type="date" value={taskForm.due_date}
                  onChange={e => setTaskForm({...taskForm, due_date: e.target.value})} data-testid="task-due-date-input" />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTaskTag}
                    list="task-tag-suggestions"
                    onChange={e => setNewTaskTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTaskTag())}
                    placeholder="Ajouter un tag..."
                  />
                  <Button type="button" variant="secondary" onClick={addTaskTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <datalist id="task-tag-suggestions">{allTags.map(t => <option key={t.name} value={t.name} />)}</datalist>
                {taskForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {taskForm.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeTaskTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>              {editingTask && (
                <div className="space-y-3">
                  <ItemLinksManager itemType="task" itemId={editingTask.id} itemName={editingTask.title} onUpdate={fetchData} />
                  <FileUploader itemType="task" itemId={editingTask.id} onUpdate={fetchData} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="task-submit-btn">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTask ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmitProject}>
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle>
              <DialogDescription>Gérez votre projet</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={projectForm.name}
                  onChange={e => setProjectForm({...projectForm, name: e.target.value})}
                  placeholder="Ex: Rénovation cuisine" required data-testid="project-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={projectForm.description}
                  onChange={e => setProjectForm({...projectForm, description: e.target.value})}
                  placeholder="Description..." data-testid="project-description-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Couleur</Label>
                  <Select value={projectForm.color}
                    onValueChange={v => setProjectForm({...projectForm, color: v})}>
                    <SelectTrigger data-testid="project-color-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLORS.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${c.class}`} />{c.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Projet parent</Label>
                  <div className="flex items-center gap-2">
                    <MultiSelect
                      options={parentProjectOpts}
                      selected={projectForm.parent_id ? [projectForm.parent_id] : []}
                      onChange={(values) => {
                        const next = values.length ? values[values.length - 1] : '';
                        setProjectForm({ ...projectForm, parent_id: next });
                      }}
                      placeholder="Projet parent"
                      testId="project-parent-select"
                      hierarchical
                    />
                    {projectForm.parent_id && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setProjectForm({ ...projectForm, parent_id: '' })}>
                        Racine
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {editingProject && (
                <div className="space-y-3">
                  <ItemLinksManager itemType="project" itemId={editingProject.id} itemName={editingProject.name} onUpdate={fetchData} />
                  <FileUploader itemType="project" itemId={editingProject.id} onUpdate={fetchData} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="project-submit-btn">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingProject ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;

































