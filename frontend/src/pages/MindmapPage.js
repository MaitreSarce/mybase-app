import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { mindmapApi, tagsApi, linksApi } from '../services/api';
import { toast } from 'sonner';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, Handle, Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent } from '../components/ui/card';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawData, setRawData] = useState({ nodes: [], edges: [] });
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
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
        id: `e-${i}`, source: e.source, target: e.target, label: e.label || '',
        style: { stroke: connectedNodeIds && (!connectedNodeIds.has(e.source) || !connectedNodeIds.has(e.target)) ? '#333' : '#666', strokeWidth: 1.5 },
        labelStyle: { fill: '#aaa', fontSize: 10 }, animated: false,
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
    </div>
  );
};

export default MindmapPage;

























