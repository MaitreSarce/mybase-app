import { useState, useEffect } from 'react';
import { projectsApi, tasksApi } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Checkbox } from '../components/ui/checkbox';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  FolderKanban, 
  Loader2,
  CheckCircle2,
  Circle,
  Calendar,
  X,
  Tag
} from 'lucide-react';

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
  const [selectedProject, setSelectedProject] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    color: 'blue',
    tags: []
  });
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    project_id: '',
    due_date: '',
    priority: 3,
    tags: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        projectsApi.getAll(),
        tasksApi.getAll()
      ]);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProjectDialog = (project = null) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
        description: project.description || '',
        color: project.color || 'blue',
        tags: project.tags || []
      });
    } else {
      setEditingProject(null);
      setProjectForm({ name: '', description: '', color: 'blue', tags: [] });
    }
    setProjectDialogOpen(true);
  };

  const handleOpenTaskDialog = (task = null, projectId = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description || '',
        project_id: task.project_id || '',
        due_date: task.due_date || '',
        priority: task.priority || 3,
        tags: task.tags || []
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        project_id: projectId || '',
        due_date: '',
        priority: 3,
        tags: []
      });
    }
    setTaskDialogOpen(true);
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingProject) {
        await projectsApi.update(editingProject.id, projectForm);
        toast.success('Projet mis à jour');
      } else {
        await projectsApi.create(projectForm);
        toast.success('Projet créé');
      }
      setProjectDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const data = {
      ...taskForm,
      project_id: taskForm.project_id || null
    };
    
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
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Supprimer le projet "${project.name}" et ses tâches ?`)) return;
    
    try {
      await projectsApi.delete(project.id);
      toast.success('Projet supprimé');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Supprimer la tâche "${task.title}" ?`)) return;
    
    try {
      await tasksApi.delete(task.id);
      toast.success('Tâche supprimée');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleTask = async (task) => {
    try {
      await tasksApi.update(task.id, { completed: !task.completed });
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const addTag = (formType) => {
    if (newTag.trim()) {
      if (formType === 'project' && !projectForm.tags.includes(newTag.trim())) {
        setProjectForm({ ...projectForm, tags: [...projectForm.tags, newTag.trim()] });
      } else if (formType === 'task' && !taskForm.tags.includes(newTag.trim())) {
        setTaskForm({ ...taskForm, tags: [...taskForm.tags, newTag.trim()] });
      }
      setNewTag('');
    }
  };

  const getColorClass = (color) => {
    return COLORS.find(c => c.value === color)?.class || 'bg-blue-500';
  };

  const getPriorityInfo = (priority) => {
    return PRIORITIES.find(p => p.value === priority) || PRIORITIES[2];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const filteredTasks = tasks.filter(task => {
    if (!showCompleted && task.completed) return false;
    if (selectedProject !== 'all' && task.project_id !== selectedProject) return false;
    return true;
  });

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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projets & Tâches</h1>
          <p className="text-muted-foreground mt-1">Organisez vos projets et suivez vos tâches</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => handleOpenTaskDialog()} data-testid="add-task-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmitTask}>
                <DialogHeader>
                  <DialogTitle>{editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Titre *</Label>
                    <Input
                      id="task-title"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      placeholder="Ex: Finaliser le rapport"
                      required
                      data-testid="task-title-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-description">Description</Label>
                    <Textarea
                      id="task-description"
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      placeholder="Détails de la tâche..."
                      data-testid="task-description-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Projet</Label>
                      <Select
                        value={taskForm.project_id}
                        onValueChange={(value) => setTaskForm({ ...taskForm, project_id: value })}
                      >
                        <SelectTrigger data-testid="task-project-select">
                          <SelectValue placeholder="Aucun projet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Aucun projet</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priorité</Label>
                      <Select
                        value={String(taskForm.priority)}
                        onValueChange={(value) => setTaskForm({ ...taskForm, priority: parseInt(value) })}
                      >
                        <SelectTrigger data-testid="task-priority-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p.value} value={String(p.value)}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${p.color}`} />
                                {p.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-due-date">Date d'échéance</Label>
                    <Input
                      id="task-due-date"
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                      data-testid="task-due-date-input"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving} data-testid="task-submit-btn">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingTask ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenProjectDialog()} data-testid="add-project-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau projet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmitProject}>
                <DialogHeader>
                  <DialogTitle>{editingProject ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Nom *</Label>
                    <Input
                      id="project-name"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      placeholder="Ex: Rénovation cuisine"
                      required
                      data-testid="project-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-description">Description</Label>
                    <Textarea
                      id="project-description"
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                      placeholder="Description du projet..."
                      data-testid="project-description-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Couleur</Label>
                    <Select
                      value={projectForm.color}
                      onValueChange={(value) => setProjectForm({ ...projectForm, color: value })}
                    >
                      <SelectTrigger data-testid="project-color-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${color.class}`} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving} data-testid="project-submit-btn">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingProject ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects" data-testid="projects-tab">Projets</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tasks-tab">Tâches</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          {projects.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun projet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Créez votre premier projet pour commencer
                </p>
                <Button onClick={() => handleOpenProjectDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un projet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const progress = project.task_count > 0 
                  ? (project.completed_tasks / project.task_count) * 100 
                  : 0;
                return (
                  <Card
                    key={project.id}
                    className="bg-card border-border card-hover group"
                    data-testid={`project-card-${project.id}`}
                  >
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getColorClass(project.color)}`} />
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenTaskDialog(null, project.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter une tâche
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenProjectDialog(project)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-mono">
                            {project.completed_tasks}/{project.task_count}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Checkbox
                id="showCompleted"
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
                data-testid="show-completed-checkbox"
              />
              <Label htmlFor="showCompleted" className="text-sm cursor-pointer">
                Afficher terminées
              </Label>
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px]" data-testid="tasks-filter-project">
                <SelectValue placeholder="Tous les projets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tasks List */}
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
              {filteredTasks.map((task) => {
                const priorityInfo = getPriorityInfo(task.priority);
                const project = projects.find(p => p.id === task.project_id);
                return (
                  <Card
                    key={task.id}
                    className={`bg-card border-border card-hover ${task.completed ? 'opacity-60' : ''}`}
                    data-testid={`task-card-${task.id}`}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggleTask(task)}
                          className="flex-shrink-0"
                          data-testid={`task-toggle-${task.id}`}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                          )}
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
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.due_date)}
                          </Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenTaskDialog(task)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
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
      </Tabs>
    </div>
  );
};

export default ProjectsPage;
