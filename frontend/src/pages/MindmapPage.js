import { useState, useEffect, useCallback, useMemo } from 'react';
import { mindmapApi, tagsApi } from '../services/api';
import { toast } from 'sonner';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { RefreshCw, Loader2, Network } from 'lucide-react';

const TYPE_LABELS = {
  collection: 'Collection',
  inventory: 'Inventaire',
  wishlist: 'Souhait',
  project: 'Projet',
  task: 'Tâche',
  content: 'Contenu',
  portfolio: 'Actif',
};

const TYPE_COLORS = {
  collection: '#3b82f6',
  inventory: '#8b5cf6',
  wishlist: '#ec4899',
  project: '#f59e0b',
  task: '#10b981',
  content: '#06b6d4',
  portfolio: '#f97316',
};

const CustomNode = ({ data }) => (
  <div
    className="px-4 py-2 rounded-lg border-2 shadow-lg min-w-[120px] max-w-[200px] text-center"
    style={{
      backgroundColor: 'hsl(240 6% 10%)',
      borderColor: data.color,
      color: '#fafafa',
    }}
  >
    <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5" style={{ color: data.color }}>
      {TYPE_LABELS[data.itemType] || data.itemType}
    </div>
    <div className="text-sm font-medium truncate">{data.label}</div>
  </div>
);

const nodeTypes = { custom: CustomNode };

const MindmapPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [perspective, setPerspective] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawData, setRawData] = useState({ nodes: [], edges: [] });

  const fetchData = useCallback(async (persp) => {
    try {
      const [mapRes, tagsRes] = await Promise.all([
        mindmapApi.getData(persp || undefined),
        tagsApi.getAll(),
      ]);
      setRawData(mapRes.data);
      setAllTags(tagsRes.data);
    } catch {
      toast.error('Erreur lors du chargement de la carte');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(perspective); }, [fetchData, perspective]);

  useEffect(() => {
    if (!rawData.nodes.length) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Layout: arrange nodes in a circle/force-like layout
    const nodeCount = rawData.nodes.length;
    const radius = Math.max(300, nodeCount * 40);
    const centerX = radius + 100;
    const centerY = radius + 100;

    const flowNodes = rawData.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / nodeCount;
      return {
        id: n.id,
        type: 'custom',
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        data: {
          label: n.name,
          color: n.color || TYPE_COLORS[n.type] || '#888',
          itemType: n.type,
        },
      };
    });

    const nodeIds = new Set(flowNodes.map(n => n.id));
    const flowEdges = rawData.edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        label: e.label || '',
        style: { stroke: '#555', strokeWidth: 1.5 },
        labelStyle: { fill: '#aaa', fontSize: 10 },
        animated: false,
      }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [rawData, setNodes, setEdges]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(perspective);
  };

  const handlePerspectiveChange = (val) => {
    setPerspective(val === 'all' ? '' : val);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="mindmap-page">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carte Mentale</h1>
          <p className="text-muted-foreground mt-1">
            Visualisez les connexions entre tous vos éléments
          </p>
        </div>
        <div className="flex gap-2 items-start">
          <Select value={perspective || 'all'} onValueChange={handlePerspectiveChange}>
            <SelectTrigger className="w-[200px]" data-testid="mindmap-perspective-select">
              <SelectValue placeholder="Perspective" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout afficher</SelectItem>
              <SelectItem disabled className="font-semibold text-xs text-muted-foreground">-- Par type --</SelectItem>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={`type:${key}`}>{label}</SelectItem>
              ))}
              {allTags.length > 0 && (
                <SelectItem disabled className="font-semibold text-xs text-muted-foreground">-- Par tag --</SelectItem>
              )}
              {allTags.map(tag => (
                <SelectItem key={tag} value={`tag:${tag}`}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} data-testid="mindmap-refresh-btn">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <Badge key={key} variant="outline" className="gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[key] }} />
            {label}
          </Badge>
        ))}
      </div>

      {rawData.nodes.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Network className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Carte vide</h3>
            <p className="text-sm text-muted-foreground">
              Ajoutez des éléments et des liens pour les voir ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="h-[600px] rounded-lg border border-border overflow-hidden bg-background" data-testid="mindmap-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#333" gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(n) => n.data?.color || '#888'}
              style={{ backgroundColor: 'hsl(240 6% 7%)' }}
            />
          </ReactFlow>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {rawData.nodes.length} éléments, {rawData.edges.length} connexions
      </p>
    </div>
  );
};

export default MindmapPage;
