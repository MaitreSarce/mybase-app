import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { mindmapApi, tagsApi, linksApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, Handle, Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { RefreshCw, Loader2, Network, X, ChevronUp, ChevronDown, Undo2 } from 'lucide-react';
import { MultiSelect } from '../components/MultiSelect';

const TYPE_LABELS = {
  collection: 'Collection',
  inventory: 'Inventaire',
  wishlist: 'Souhaits',
  project: 'Projet',
  task: 'Tache',
  content: 'Contenu',
  portfolio: 'Portefeuille',
  portfolio_physical: 'Actif physique',
};
const ITEM_TYPES = Object.keys(TYPE_LABELS);

const TYPE_COLORS = {
  collection: '#3b82f6', inventory: '#8b5cf6', wishlist: '#ec4899',
  project: '#f59e0b', task: '#10b981', content: '#06b6d4', portfolio: '#f97316', portfolio_physical: '#14b8a6',
};
const HIERARCHY_PRESETS = {
  projects_first: {
    label: 'Projet > Sous-projet > Tache > Contenu > Inventaire > Souhaits > Actif physique',
    order: ['project', 'task', 'content', 'inventory', 'wishlist', 'collection', 'portfolio', 'portfolio_physical'],
  },
  collections_first: {
    label: 'Collection > Inventaire > Souhaits > Contenu > Projet > Tache > Actif physique',
    order: ['collection', 'inventory', 'wishlist', 'content', 'project', 'task', 'portfolio', 'portfolio_physical'],
  },
};


const CustomNode = ({ data }) => (
  <div
    className="px-4 py-2 rounded-lg border-2 shadow-lg min-w-[120px] max-w-[200px] text-center relative"
    style={{
      backgroundColor: data.dimmed ? 'hsl(240 6% 7%)' : 'hsl(240 6% 10%)',
      borderColor: data.color,
      color: '#fafafa',
      opacity: data.dimmed ? 0.25 : 1,
      transition: 'opacity 0.3s',
    }}
  >
    <Handle type="target" position={Position.Top} style={{ background: data.color, width: 8, height: 8 }} />
    <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5" style={{ color: data.color }}>
      {TYPE_LABELS[data.itemType] || data.itemType}
    </div>
    <div className="text-sm font-medium truncate">{data.label}</div>
    <Handle type="source" position={Position.Bottom} style={{ background: data.color, width: 8, height: 8 }} />
  </div>
);

const nodeTypes = { custom: CustomNode };
const MINDMAP_POSITIONS_KEY = 'mybase:mindmap:positions:v1';
const MINDMAP_VIEWPORT_KEY = 'mybase:mindmap:viewport:v1';
const MAX_UNDO_STEPS = 20;

const MindmapPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawData, setRawData] = useState({ nodes: [], edges: [] });
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [activeTab, setActiveTab] = useState('graph');
  const [navPath, setNavPath] = useState([]);
  const [navVisitedIds, setNavVisitedIds] = useState([]);
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [layoutMode, setLayoutMode] = useState('tree');
  const [hierarchyOrder, setHierarchyOrder] = useState(HIERARCHY_PRESETS.projects_first.order);
  const [layoutReady, setLayoutReady] = useState(false);
  const [defaultViewport, setDefaultViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [hasSavedViewport, setHasSavedViewport] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const savedPositionsRef = useRef({});
  const dragStartSnapshotRef = useRef(null);
  const pendingSaveRef = useRef({});
  const saveTimeoutRef = useRef(null);

  const nodeTypeMap = useMemo(() => {
    const map = {};
    rawData.nodes.forEach(n => { map[n.id] = n.type; });
    return map;
  }, [rawData.nodes]);

  const nodeById = useMemo(() => {
    const map = {};
    rawData.nodes.forEach((node) => { map[node.id] = node; });
    return map;
  }, [rawData.nodes]);

  const adjacencyMap = useMemo(() => {
    const map = new Map();
    rawData.edges.forEach((edge) => {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.source).add(edge.target);
      map.get(edge.target).add(edge.source);
    });
    return map;
  }, [rawData.edges]);

  const navRootNodes = useMemo(() => {
    const hasIncomingFromSameType = (node) => rawData.edges.some((edge) => {
      if (edge.target !== node.id) return false;
      const src = nodeById[edge.source];
      return src && src.type === node.type;
    });

    return rawData.nodes
      .filter((node) => {
        if (node.type === 'collection') return true;
        if (node.type !== 'project' && node.type !== 'content') return false;
        if (node.parent_id) return false;
        return !hasIncomingFromSameType(node);
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [rawData.nodes, rawData.edges, nodeById]);

  const currentNavNodeId = navPath.length ? navPath[navPath.length - 1] : null;
  const currentNavNode = currentNavNodeId ? nodeById[currentNavNodeId] || null : null;
  const navVisitedSet = useMemo(() => new Set(navVisitedIds), [navVisitedIds]);
  const navNeighborNodes = useMemo(() => {
    if (!currentNavNodeId) {
      return navRootNodes
        .filter((node) => !navVisitedSet.has(node.id))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    const neighbors = Array.from(adjacencyMap.get(currentNavNodeId) || []);
    return neighbors
      .map((id) => nodeById[id])
      .filter(Boolean)
      .filter((node) => !navVisitedSet.has(node.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [adjacencyMap, currentNavNodeId, navRootNodes, nodeById, navVisitedSet]);

  useEffect(() => {
    if (!navPath.length) return;
    const validIds = new Set(rawData.nodes.map((node) => node.id));
    const cleaned = navPath.filter((id) => validIds.has(id));
    if (cleaned.length !== navPath.length) setNavPath(cleaned);
  }, [navPath, rawData.nodes]);

  useEffect(() => {
    if (!navVisitedIds.length) return;
    const validIds = new Set(rawData.nodes.map((node) => node.id));
    const cleaned = navVisitedIds.filter((id) => validIds.has(id));
    if (cleaned.length !== navVisitedIds.length) setNavVisitedIds(cleaned);
  }, [navVisitedIds, rawData.nodes]);

  const fetchData = useCallback(async () => {
    try {
      const [mapRes, tagsRes] = await Promise.all([mindmapApi.getData(), tagsApi.getAll()]);
      setRawData(mapRes.data);
      setAllTags(tagsRes.data);
    } catch { toast.error('Erreur lors du chargement de la carte'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const handleConnect = useCallback(async (connection) => {
    const sourceType = nodeTypeMap[connection.source];
    const targetType = nodeTypeMap[connection.target];
    if (!sourceType || !targetType) return;
    try {
      await linksApi.create({
        source_type: sourceType, source_id: connection.source,
        target_type: targetType, target_id: connection.target,
      });
      toast.success('Lien cree');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  }, [nodeTypeMap, fetchData]);
  const handleEdgesDelete = useCallback(async (deletedEdges) => {
    for (const edge of deletedEdges) {
      const sourceType = nodeTypeMap[edge.source];
      const targetType = nodeTypeMap[edge.target];
      if (!sourceType || !targetType) continue;
      try {
        await linksApi.delete(sourceType, edge.source, targetType, edge.target);
        toast.success('Lien supprime');
      } catch { toast.error('Erreur'); }
    }
    fetchData();
  }, [nodeTypeMap, fetchData]);

  const queueSaveViewState = useCallback((partial) => {
    pendingSaveRef.current = { ...pendingSaveRef.current, ...partial };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const payload = pendingSaveRef.current;
      pendingSaveRef.current = {};
      try {
        await mindmapApi.saveViewState(payload);
      } catch {
        // Keep local fallback only if remote save fails.
      }
    }, 400);
  }, []);

  

  useEffect(() => {
    let cancelled = false;
    const loadViewState = async () => {
      try {
        const response = await mindmapApi.getViewState();
        if (cancelled) return;
        const remotePositions = response?.data?.positions;
        const remoteViewport = response?.data?.viewport;

        if (remotePositions && typeof remotePositions === 'object') {
          savedPositionsRef.current = remotePositions;
          window.localStorage.setItem(MINDMAP_POSITIONS_KEY, JSON.stringify(remotePositions));
        } else {
          const savedPositions = window.localStorage.getItem(MINDMAP_POSITIONS_KEY);
          if (savedPositions) {
            const parsed = JSON.parse(savedPositions);
            if (parsed && typeof parsed === 'object') savedPositionsRef.current = parsed;
          }
        }

        const x = Number(remoteViewport?.x);
        const y = Number(remoteViewport?.y);
        const zoom = Number(remoteViewport?.zoom);
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(zoom)) {
          setDefaultViewport({ x, y, zoom });
          setHasSavedViewport(true);
          window.localStorage.setItem(MINDMAP_VIEWPORT_KEY, JSON.stringify({ x, y, zoom }));
        } else {
          const savedViewport = window.localStorage.getItem(MINDMAP_VIEWPORT_KEY);
          if (savedViewport) {
            const parsed = JSON.parse(savedViewport);
            const localX = Number(parsed?.x);
            const localY = Number(parsed?.y);
            const localZoom = Number(parsed?.zoom);
            if (Number.isFinite(localX) && Number.isFinite(localY) && Number.isFinite(localZoom)) {
              setDefaultViewport({ x: localX, y: localY, zoom: localZoom });
              setHasSavedViewport(true);
            }
          }
        }
      } catch {
        // Fallback to local storage if remote preferences are unavailable.
        try {
          const savedPositions = window.localStorage.getItem(MINDMAP_POSITIONS_KEY);
          if (savedPositions) {
            const parsed = JSON.parse(savedPositions);
            if (parsed && typeof parsed === 'object') savedPositionsRef.current = parsed;
          }
          const savedViewport = window.localStorage.getItem(MINDMAP_VIEWPORT_KEY);
          if (savedViewport) {
            const parsed = JSON.parse(savedViewport);
            const x = Number(parsed?.x);
            const y = Number(parsed?.y);
            const zoom = Number(parsed?.zoom);
            if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(zoom)) {
              setDefaultViewport({ x, y, zoom });
              setHasSavedViewport(true);
            }
          }
        } catch {
          // Ignore local fallback errors.
        }
      } finally {
        if (!cancelled) setLayoutReady(true);
      }
    };
    loadViewState();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const connectedNodeIds = useMemo(() => {
    if (!focusedNodeId) return null;

    // Keep the full connected component of the clicked node
    // so we include all direct and indirect parents/children.
    const adjacency = new Map();
    rawData.edges.forEach((e) => {
      if (!adjacency.has(e.source)) adjacency.set(e.source, new Set());
      if (!adjacency.has(e.target)) adjacency.set(e.target, new Set());
      adjacency.get(e.source).add(e.target);
      adjacency.get(e.target).add(e.source);
    });

    const visited = new Set([focusedNodeId]);
    const queue = [focusedNodeId];

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;

      neighbors.forEach((nextId) => {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push(nextId);
        }
      });
    }

    return visited;
  }, [focusedNodeId, rawData.edges]);

    useEffect(() => {
    if (!layoutReady) return;
    if (!rawData.nodes.length) { setNodes([]); setEdges([]); return; }

    let filteredNodes = rawData.nodes;
    if (filterTypes.length > 0) {
      filteredNodes = filteredNodes.filter(n => filterTypes.includes(n.type));
    }
    if (filterTags.length > 0) {
      filteredNodes = filteredNodes.filter(n => n.tags?.some(t => filterTags.includes(t)));
    }
    if (connectedNodeIds) {
      filteredNodes = filteredNodes.filter(n => connectedNodeIds.has(n.id));
    }

    const levelByType = Object.fromEntries(hierarchyOrder.map((type, index) => [type, index]));

    let flowNodes;

    if (layoutMode === 'tree') {
      const groups = {};
      filteredNodes.forEach((node) => {
        const level = levelByType[node.type] ?? hierarchyOrder.length;
        if (!groups[level]) groups[level] = [];
        groups[level].push(node);
      });

      const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);
      flowNodes = [];
      const prevOrderMap = new Map();

      levels.forEach((level) => {
        const nodesAtLevel = [...groups[level]];

        if (level > 0) {
          const prevLevelNodes = groups[level - 1] || [];
          prevLevelNodes.forEach((n, idx) => prevOrderMap.set(n.id, idx));
          nodesAtLevel.sort((a, b) => {
            const aLinks = rawData.edges
              .filter(e => e.target === a.id || e.source === a.id)
              .map(e => (e.target === a.id ? e.source : e.target))
              .filter(id => prevOrderMap.has(id));
            const bLinks = rawData.edges
              .filter(e => e.target === b.id || e.source === b.id)
              .map(e => (e.target === b.id ? e.source : e.target))
              .filter(id => prevOrderMap.has(id));

            const aScore = aLinks.length ? aLinks.reduce((s, id) => s + prevOrderMap.get(id), 0) / aLinks.length : Number.MAX_SAFE_INTEGER;
            const bScore = bLinks.length ? bLinks.reduce((s, id) => s + prevOrderMap.get(id), 0) / bLinks.length : Number.MAX_SAFE_INTEGER;
            return aScore - bScore;
          });
        }

        nodesAtLevel.forEach((n, idx) => {
          const dimmed = connectedNodeIds ? !connectedNodeIds.has(n.id) : false;
          flowNodes.push({
            id: n.id,
            type: 'custom',
            position: savedPositionsRef.current[n.id] || { x: 80 + (level * 360), y: 60 + (idx * 110) },
            data: { label: n.name, color: n.color || TYPE_COLORS[n.type] || '#888', itemType: n.type, dimmed },
          });
        });
      });
    } else {
      const nodeCount = Math.max(filteredNodes.length, 1);
      const radius = Math.max(300, nodeCount * 40);
      const centerX = radius + 100;
      const centerY = radius + 100;

      flowNodes = filteredNodes.map((n, i) => {
        const angle = (2 * Math.PI * i) / nodeCount;
        const dimmed = connectedNodeIds ? !connectedNodeIds.has(n.id) : false;
        return {
          id: n.id,
          type: 'custom',
          position: savedPositionsRef.current[n.id] || { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) },
          data: { label: n.name, color: n.color || TYPE_COLORS[n.type] || '#888', itemType: n.type, dimmed },
        };
      });
    }

    const nodeIds = new Set(flowNodes.map(n => n.id));
    const flowEdges = rawData.edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e, i) => ({
        id: `e-${i}`, source: e.source, target: e.target,
        style: { stroke: connectedNodeIds && (!connectedNodeIds.has(e.source) || !connectedNodeIds.has(e.target)) ? '#333' : '#666', strokeWidth: 1.5 },
        animated: false,
      }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [layoutReady, rawData, filterTypes, filterTags, connectedNodeIds, layoutMode, hierarchyOrder, setNodes, setEdges]);
  useEffect(() => {
    if (!nodes.length) return;
    const next = { ...savedPositionsRef.current };
    nodes.forEach((n) => { next[n.id] = n.position; });
    savedPositionsRef.current = next;
    try {
      window.localStorage.setItem(MINDMAP_POSITIONS_KEY, JSON.stringify(next));
    } catch {
      // Ignore localStorage issues.
    }
    queueSaveViewState({ positions: next });
  }, [nodes, queueSaveViewState]);


  const handleNodeClick = useCallback((_, node) => {
    setFocusedNodeId(prev => prev === node.id ? null : node.id);
  }, []);

  const handleNodeDragStart = useCallback(() => {
    dragStartSnapshotRef.current = Object.fromEntries(nodes.map((n) => [n.id, { ...n.position }]));
  }, [nodes]);

  const handleNodeDragStop = useCallback((_, node) => {
    const snapshot = dragStartSnapshotRef.current;
    dragStartSnapshotRef.current = null;
    if (!snapshot) return;
    const before = snapshot[node.id];
    if (!before) return;
    if (before.x === node.position.x && before.y === node.position.y) return;
    setUndoStack((prev) => [...prev.slice(-(MAX_UNDO_STEPS - 1)), snapshot]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      setNodes((curr) => curr.map((n) => (snapshot[n.id] ? { ...n, position: snapshot[n.id] } : n)));
      return prev.slice(0, -1);
    });
  }, [setNodes]);

  const handleMoveEnd = useCallback((_, viewport) => {
    if (!viewport) return;
    try {
      window.localStorage.setItem(MINDMAP_VIEWPORT_KEY, JSON.stringify(viewport));
    } catch {
      // Ignore localStorage issues.
    }
    queueSaveViewState({ viewport });
  }, [queueSaveViewState]);

  const handleRefresh = () => { setRefreshing(true); fetchData(); };
  const handleEditNode = useCallback((node) => {
    if (!node?.id || !node?.type) return;
    const encodedId = encodeURIComponent(node.id);
    if (node.type === 'inventory') {
      navigate(`/inventory?editId=${encodedId}`);
      return;
    }
    if (node.type === 'wishlist') {
      navigate(`/wishlist?editId=${encodedId}`);
      return;
    }
    if (node.type === 'content') {
      navigate(`/content?editId=${encodedId}`);
      return;
    }
    if (node.type === 'project') {
      navigate(`/projects?editType=projects&editId=${encodedId}`);
      return;
    }
    if (node.type === 'task') {
      navigate(`/projects?editType=tasks&editId=${encodedId}`);
      return;
    }
    if (node.type === 'collection') {
      navigate(`/collections?editId=${encodedId}`);
      return;
    }
    if (node.type === 'portfolio' || node.type === 'portfolio_physical') {
      navigate('/portfolio');
      toast.info('Ouverture de la page portefeuille.');
      return;
    }
    toast.info('Type non pris en charge pour l’édition directe.');
  }, [navigate]);

  const moveHierarchyType = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= hierarchyOrder.length) return;
    const next = [...hierarchyOrder];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setHierarchyOrder(next);
  };

  const resetHierarchy = () => setHierarchyOrder(HIERARCHY_PRESETS.projects_first.order);

  const typeOpts = Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }));
  const tagOpts = allTags.map(t => ({ value: t.name, label: t.name }));
  const focusedNodeName = focusedNodeId ? rawData.nodes.find(n => n.id === focusedNodeId)?.name : null;

  if (loading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-[600px] w-full rounded-lg" /></div>);
  }

  return (
    <div className="space-y-4" data-testid="mindmap-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carte Mentale</h1>
          <p className="text-muted-foreground mt-1">Visualisez les connexions entre vos elements</p>
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <Select value={layoutMode} onValueChange={setLayoutMode}>
            <SelectTrigger className="w-[150px]" data-testid="mindmap-layout-mode">
              <SelectValue placeholder="Disposition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tree">Mode arbre</SelectItem>
              <SelectItem value="radial">Mode radial</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-md border border-border px-2 py-1" data-testid="mindmap-hierarchy-order">
            <div className="text-xs text-muted-foreground mb-1">Ordre hiérarchique</div>
            <div className="flex flex-wrap gap-1">
              {hierarchyOrder.map((type, index) => (
                <Badge key={`${type}-${index}`} variant="secondary" className="gap-1 px-2 py-1">
                  {index + 1}. {TYPE_LABELS[type] || type}
                  <button type="button" onClick={() => moveHierarchyType(index, -1)} disabled={index === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => moveHierarchyType(index, 1)} disabled={index === hierarchyOrder.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={resetHierarchy}>Reset</Button>
            </div>
          </div>
          <MultiSelect options={typeOpts} selected={filterTypes} onChange={setFilterTypes} placeholder="Sections" testId="mindmap-filter-types" />
          {tagOpts.length > 0 && <MultiSelect options={tagOpts} selected={filterTags} onChange={setFilterTags} placeholder="Tags" testId="mindmap-filter-tags" />}
          <Button variant="outline" onClick={handleUndo} disabled={undoStack.length === 0} data-testid="mindmap-undo-btn" title="Annuler le dernier deplacement">
            <Undo2 className="h-4 w-4" />
          </Button>          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} data-testid="mindmap-refresh-btn">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="graph">Carte</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <Badge key={key} variant="outline" className="gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[key] }} />{label}
              </Badge>
            ))}
            {focusedNodeName && (
              <Badge variant="secondary" className="gap-1.5 ml-4">
                Focus: {focusedNodeName}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFocusedNodeId(null)} />
              </Badge>
            )}
          </div>

          {rawData.nodes.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Network className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Carte vide</h3>
                <p className="text-sm text-muted-foreground">Ajoutez des elements et des liens pour les voir ici</p>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[600px] rounded-lg border border-border overflow-hidden bg-background" data-testid="mindmap-canvas">
              <ReactFlow
                nodes={nodes} edges={edges}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onConnect={handleConnect} onEdgesDelete={handleEdgesDelete}
                onNodeClick={handleNodeClick}
                onNodeDragStart={handleNodeDragStart}
                onNodeDragStop={handleNodeDragStop}
                onMoveEnd={handleMoveEnd}
                defaultViewport={defaultViewport}
                nodeTypes={nodeTypes} fitView={!hasSavedViewport} minZoom={0.1} maxZoom={2}
                proOptions={{ hideAttribution: true }}
                connectionLineStyle={{ stroke: '#888', strokeWidth: 2 }}
              >
                <Background color="#333" gap={20} />
                <Controls />
                <MiniMap nodeColor={(n) => n.data?.color || '#888'} style={{ backgroundColor: 'hsl(240 6% 7%)' }} />
              </ReactFlow>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {rawData.nodes.length} elements, {rawData.edges.length} connexions — Cliquez sur un noeud pour voir ses connexions, glissez d'un point a un autre pour creer un lien
          </p>
        </TabsContent>

        <TabsContent value="navigation" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={navPath.length === 0}
              onClick={() => setNavPath((prev) => prev.slice(0, -1))}
            >
              Retour
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={navPath.length === 0 && navVisitedIds.length === 0}
              onClick={() => {
                setNavPath([]);
                setNavVisitedIds([]);
              }}
            >
              Niveau 1
            </Button>
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>Racine</span>
              {navPath.map((id, idx) => {
                const node = nodeById[id];
                if (!node) return null;
                return (
                  <button
                    key={`nav-crumb-${id}`}
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => setNavPath(navPath.slice(0, idx + 1))}
                  >
                    <ChevronDown className="h-3 w-3 -rotate-90" />
                    <span>{node.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {navNeighborNodes.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-14">
                <Network className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-2">Aucun voisin lié</h3>
                <p className="text-sm text-muted-foreground">
                  {currentNavNode
                    ? 'Ce noeud n’a pas de voisin non visité.'
                    : 'Aucune racine non visitée. Cliquez sur "Niveau 1" pour réinitialiser la navigation.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {navNeighborNodes.map((node) => {
                const neighborsCount = (adjacencyMap.get(node.id)?.size || 0);
                return (
                  <Card key={`nav-node-${node.id}`} className="bg-card border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{node.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {TYPE_LABELS[node.type] || node.type} · {neighborsCount} lien{neighborsCount > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="h-2.5 w-2.5 rounded-full mt-1" style={{ backgroundColor: node.color || TYPE_COLORS[node.type] || '#888' }} />
                      </div>
                      {node.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {node.tags.slice(0, 4).map((tag) => (
                            <Badge key={`${node.id}-${tag}`} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Badge variant="outline" className="text-xs">ID: {String(node.id).slice(0, 8)}</Badge>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleEditNode(node)}>
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setNavPath((prev) => [...prev, node.id]);
                              setNavVisitedIds((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));
                            }}
                          >
                            Ouvrir
                          </Button>
                        </div>
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

export default MindmapPage;

























