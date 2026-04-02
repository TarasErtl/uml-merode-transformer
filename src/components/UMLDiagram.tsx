import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { UMLIR, UMLClass, UMLAssociation } from '../types/metamodels/uml';

// 1. Custom Node für die Darstellung von UML Klassen und deren Attributen
const ClassNode = ({ data }: any) => {
  const { highlighted, dimmed } = data || {};

  return (
    <div style={{ 
      border: highlighted ? '2px solid #4A90E2' : '1px solid #555', 
      borderRadius: '6px', 
      background: '#1e1e1e', 
      color: '#f8f8f2',
      minWidth: '240px', 
      fontSize: '16px', 
      boxShadow: highlighted ? '0 0 15px rgba(74, 144, 226, 0.6)' : '0 4px 6px rgba(0,0,0,0.4)',
      opacity: dimmed ? 0.3 : 1,
      transition: 'all 0.3s ease'
    }}>
      <div style={{ 
        background: highlighted ? '#3a5a80' : '#2d2d2d', 
        borderBottom: highlighted ? '1px solid #4A90E2' : '1px solid #555', 
        padding: '12px', 
        textAlign: 'center', 
        fontWeight: 'bold',
        fontSize: '18px',
        borderTopLeftRadius: '5px',
        borderTopRightRadius: '5px',
        transition: 'all 0.3s ease'
      }}>
        {data.label}
      </div>
      <div style={{ padding: '12px' }}>
        {data.attributes && data.attributes.length > 0 ? (
          data.attributes.map((attr: any) => (
            <div key={attr.id} style={{ marginBottom: '4px' }}>
              {attr.visibility === 'public' ? '+' : attr.visibility === 'private' ? '-' : '#'} {attr.name}: {attr.type}
            </div>
          ))
        ) : (
          <div style={{ fontStyle: 'italic', color: '#888', textAlign: 'center', fontSize: '14px' }}>Keine Attribute</div>
        )}
      </div>
      {/* Top */}
      <Handle type="target" position={Position.Top} id="top-target" style={{ background: '#aaa' }} />
      <Handle type="source" position={Position.Top} id="top-source" style={{ opacity: 0 }} />
      {/* Bottom */}
      <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ background: '#aaa' }} />
      {/* Left */}
      <Handle type="target" position={Position.Left} id="left-target" style={{ background: '#aaa' }} />
      <Handle type="source" position={Position.Left} id="left-source" style={{ opacity: 0 }} />
      {/* Right */}
      <Handle type="target" position={Position.Right} id="right-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ background: '#aaa' }} />
    </div>
  );
};

// 2. Custom Node für N-äre Assoziationen (Raute)
const NAryNode = ({ data }: any) => {
  const { highlighted, dimmed, label } = data || {};
  return (
    <div style={{ position: 'relative', width: '50px', height: '50px' }}>
      <div style={{ 
        width: '100%', height: '100%', 
        background: highlighted ? '#4A90E2' : '#aaa', 
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        opacity: dimmed ? 0.3 : 1,
        transition: 'all 0.3s ease'
      }}></div>
      {label && (
        <div style={{ position: 'absolute', top: '55px', left: '50%', transform: 'translateX(-50%)', color: highlighted ? '#4A90E2' : '#eee', fontSize: '12px', whiteSpace: 'nowrap', opacity: dimmed ? 0.3 : 1, transition: 'all 0.3s ease' }}>
          {label}
        </div>
      )}
      <Handle type="target" position={Position.Top} id="top-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="top-source" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="left-source" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0 }} />
    </div>
  );
};

const nodeTypes = { umlClass: ClassNode, nAryNode: NAryNode };

// 3. Custom Edge für die Darstellung von Labels, Runden Self-Loops und Aggregations-Markern
const UMLEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data
}: any) => {
  const isSelfLoop = data?.isSelfLoop;
  const { highlighted, dimmed, sourceAggregation, targetAggregation, sourceLabel, targetLabel } = data || {};
  let edgePath = '';

  if (isSelfLoop) {
    // Dynamischer Bogen basierend auf den tatsächlichen Anschlusspunkten
    const getCP = (x: number, y: number, pos: Position) => {
      if (pos === Position.Top) return { x, y: y - 100 };
      if (pos === Position.Bottom) return { x, y: y + 100 };
      if (pos === Position.Left) return { x: x - 100, y };
      if (pos === Position.Right) return { x: x + 100, y };
      return { x, y };
    };
    const cp1 = getCP(sourceX, sourceY, sourcePosition);
    const cp2 = getCP(targetX, targetY, targetPosition);
    edgePath = `M ${sourceX} ${sourceY} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${targetX} ${targetY}`;
  } else {
    // Bezier-Kurve verhindert Überlappungen besser als SmoothStep
    [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }

  const getOffset = (pos: Position, hasMarker: boolean) => {
    const m = hasMarker ? 25 : 0; // extra distance if there is an aggregation marker
    switch (pos) {
      case Position.Top: return { x: 25, y: -25 - m };
      case Position.Bottom: return { x: 25, y: 25 + m };
      case Position.Left: return { x: -35 - m, y: -20 };
      case Position.Right: return { x: 35 + m, y: -20 };
      default: return { x: 0, y: 0 };
    }
  };

  const hasStartMarker = sourceAggregation === 'shared' || sourceAggregation === 'composite';
  const hasEndMarker = targetAggregation === 'shared' || targetAggregation === 'composite';

  const sOffset = getOffset(sourcePosition, hasStartMarker);
  const sourceLabelX = sourceX + sOffset.x;
  const sourceLabelY = sourceY + sOffset.y;

  const tOffset = getOffset(targetPosition, hasEndMarker);
  const targetLabelX = targetX + tOffset.x;
  const targetLabelY = targetY + tOffset.y;

  const edgeStyle = {
    ...style,
    stroke: highlighted ? '#4A90E2' : style?.stroke || '#aaa',
    strokeWidth: highlighted ? 3 : style?.strokeWidth || 2,
    opacity: dimmed ? 0.3 : 1,
    transition: 'all 0.3s ease'
  };

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    background: highlighted ? '#4A90E2' : '#333',
    color: '#eee',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    pointerEvents: 'none', // Verhindert, dass das Label Mausklicks für die Kante blockiert
    opacity: dimmed ? 0.3 : 1,
    transition: 'all 0.3s ease'
  };

  // Dynamische Zuweisung der passenden SVG-Marker-IDs
  const getMarkerUrl = (agg?: string) => {
    if (agg === 'composite') return highlighted ? 'url(#composition-highlighted)' : 'url(#composition)';
    if (agg === 'shared') return highlighted ? 'url(#aggregation-highlighted)' : 'url(#aggregation)';
    return undefined;
  };

  const mStart = getMarkerUrl(sourceAggregation);
  const mEnd = getMarkerUrl(targetAggregation) || markerEnd;

  return (
    <>
      <BaseEdge path={edgePath} markerStart={mStart} markerEnd={mEnd} style={edgeStyle} />
      <EdgeLabelRenderer>
        {sourceLabel && (
          <div style={{ ...labelStyle, transform: `translate(-50%, -50%) translate(${sourceLabelX}px,${sourceLabelY}px)` }}>{data.sourceLabel}</div>
        )}
        {targetLabel && (
          <div style={{ ...labelStyle, transform: `translate(-50%, -50%) translate(${targetLabelX}px,${targetLabelY}px)` }}>{data.targetLabel}</div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

const edgeTypes = { umlEdge: UMLEdge };

// Hilfsfunktion für das Auto-Layouting mit dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // rankdir: 'TB' (Top-to-Bottom), nodesep: Abstand zwischen Knoten horizontal, ranksep: vertikal
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 });

  nodes.forEach((node) => {
    // Ungefähre Annahme der Knotengröße je nach Typ
    const isNAry = node.type === 'nAryNode';
    dagreGraph.setNode(node.id, { width: isNAry ? 50 : 260, height: isNAry ? 50 : 160 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isNAry = node.type === 'nAryNode';
    return {
      ...node,
      position: { x: nodeWithPosition.x - (isNAry ? 25 : 130), y: nodeWithPosition.y - (isNAry ? 25 : 80) },
    };
  });

  return { nodes: layoutedNodes, edges };
};

interface UMLDiagramProps {
  umlIR: UMLIR | null;
}

export default function UMLDiagram({ umlIR }: UMLDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => setHoveredNode(node.id), []);
  const onNodeMouseLeave = useCallback(() => setHoveredNode(null), []);
  
  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => setHoveredEdge(edge.id), []);
  const onEdgeMouseLeave = useCallback(() => setHoveredEdge(null), []);

  const displayNodes = useMemo(() => {
    return nodes.map(node => {
      let highlighted = false;
      let dimmed = false;

      if (hoveredNode) {
        highlighted = node.id === hoveredNode || edges.some(e => (e.source === hoveredNode || e.target === hoveredNode) && (e.source === node.id || e.target === node.id));
        dimmed = !highlighted;
      } else if (hoveredEdge) {
        const edge = edges.find(e => e.id === hoveredEdge);
        if (edge) {
          highlighted = node.id === edge.source || node.id === edge.target;
        }
        dimmed = !highlighted;
      }

      return { ...node, zIndex: highlighted ? 10 : 0, data: { ...node.data, highlighted, dimmed } };
    });
  }, [nodes, edges, hoveredNode, hoveredEdge]);

  const displayEdges = useMemo(() => {
    return edges.map(edge => {
      let highlighted = false;
      let dimmed = false;

      if (hoveredNode) {
        highlighted = edge.source === hoveredNode || edge.target === hoveredNode;
        dimmed = !highlighted;
      } else if (hoveredEdge) {
        highlighted = edge.id === hoveredEdge;
        dimmed = !highlighted;
      }

      return { ...edge, animated: highlighted, zIndex: highlighted ? 10 : 0, data: { ...edge.data, highlighted, dimmed } };
    });
  }, [edges, hoveredNode, hoveredEdge]);

  useEffect(() => {
    if (!umlIR || !umlIR.model) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    const classes = umlIR.model.packagedElement.filter((el): el is UMLClass => el.type === 'uml:Class');
    const associations = umlIR.model.packagedElement.filter((el): el is UMLAssociation => el.type === 'uml:Association');

    // Klassen in Nodes umwandeln
    classes.forEach((cls) => {
      newNodes.push({
        id: cls.id,
        type: 'umlClass',
        position: { x: 0, y: 0 }, // Initiale Position, wird gleich von dagre überschrieben
        data: { label: cls.name, attributes: cls.attributes }
      });
    });

    // Assoziationen in Edges umwandeln
    associations.forEach((assoc) => {
      if (assoc.ends.length === 2) {
        const [end1, end2] = assoc.ends;
        
        const label1 = `${end1.roleName ? end1.roleName + ' ' : ''}${end1.lowerBound}..${end1.upperBound}`;
        const label2 = `${end2.lowerBound}..${end2.upperBound}${end2.roleName ? ' ' + end2.roleName : ''}`;

        // Erkennen, ob es sich um eine unäre Beziehung handelt
        const isSelfLoop = end1.targetClassId === end2.targetClassId;

        newEdges.push({
          id: assoc.id,
          source: end1.targetClassId,
          target: end2.targetClassId,
          type: 'umlEdge',
          style: { stroke: '#aaa', strokeWidth: 2 },
          data: {
            sourceLabel: label1,
            targetLabel: label2,
            isSelfLoop,
            sourceAggregation: end1.aggregation,
            targetAggregation: end2.aggregation,
          }
        });
      } else if (assoc.ends.length > 2) {
        // N-äre Assoziation
        newNodes.push({
          id: assoc.id,
          type: 'nAryNode',
          position: { x: 0, y: 0 },
          data: { label: assoc.name }
        });

        assoc.ends.forEach((end, idx) => {
          const label = `${end.lowerBound}..${end.upperBound}${end.roleName ? ' ' + end.roleName : ''}`;
          newEdges.push({
            id: `${assoc.id}-edge-${idx}`,
            source: assoc.id,
            target: end.targetClassId,
            type: 'umlEdge',
            style: { stroke: '#aaa', strokeWidth: 2 },
            data: {
              targetLabel: label,
              targetAggregation: end.aggregation, 
              isSelfLoop: false
            }
          });
        });
      }
    });

    // Auto-Layout berechnen
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);

    const usedSides = new Map<string, Set<string>>();
    const markSideUsed = (nodeId: string, side: string) => {
      if (!usedSides.has(nodeId)) usedSides.set(nodeId, new Set());
      usedSides.get(nodeId)!.add(side);
    };

    const finalEdges: Edge[] = [];
    const selfLoops: Edge[] = [];

    // 1. Reguläre Kanten verarbeiten und belegte Seiten (Handles) merken
    layoutedEdges.forEach((edge: Edge) => {
      if (edge.data?.isSelfLoop) {
        selfLoops.push(edge);
        return;
      }

      const sourceNode = layoutedNodes.find(n => n.id === edge.source);
      const targetNode = layoutedNodes.find(n => n.id === edge.target);

      if (sourceNode && targetNode) {
        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;

        // Entscheiden, welche Richtung dominant ist
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) { // Target ist Rechts
            edge.sourceHandle = 'right-source';
            edge.targetHandle = 'left-target';
            markSideUsed(sourceNode.id, 'right');
            markSideUsed(targetNode.id, 'left');
          } else { // Target ist Links
            edge.sourceHandle = 'left-source';
            edge.targetHandle = 'right-target';
            markSideUsed(sourceNode.id, 'left');
            markSideUsed(targetNode.id, 'right');
          }
        } else {
          if (dy > 0) { // Target ist Unten
            edge.sourceHandle = 'bottom-source';
            edge.targetHandle = 'top-target';
            markSideUsed(sourceNode.id, 'bottom');
            markSideUsed(targetNode.id, 'top');
          } else { // Target ist Oben
            edge.sourceHandle = 'top-source';
            edge.targetHandle = 'bottom-target';
            markSideUsed(sourceNode.id, 'top');
            markSideUsed(targetNode.id, 'bottom');
          }
        }
      }
      finalEdges.push(edge);
    });

    // 2. Unäre Kanten (Self-Loops) an benachbarte freie Seiten zuweisen
    const adjacentPairs = [
      ['right', 'top'],
      ['top', 'left'],
      ['left', 'bottom'],
      ['bottom', 'right']
    ];

    selfLoops.forEach(edge => {
      const nodeId = edge.source;
      const used = usedSides.get(nodeId) || new Set();
      
      let side1 = 'right'; // Fallbacks falls doch alle belegt sind
      let side2 = 'top';

      // 1. Suche nach einem benachbarten Paar, bei dem beide Seiten frei sind
      const bestPair = adjacentPairs.find(pair => !used.has(pair[0]) && !used.has(pair[1]));
      
      if (bestPair) {
        side1 = bestPair[0];
        side2 = bestPair[1];
      } else {
        // 2. Fallback: Suche nach einem Paar, bei dem wenigstens eine Seite frei ist
        const partialPair = adjacentPairs.find(pair => !used.has(pair[0]) || !used.has(pair[1]));
        if (partialPair) {
          side1 = partialPair[0];
          side2 = partialPair[1];
        }
      }
      
      markSideUsed(nodeId, side1);
      markSideUsed(nodeId, side2);

      edge.sourceHandle = `${side1}-source`;
      edge.targetHandle = `${side2}-target`;
      finalEdges.push(edge);
    });

    setNodes(layoutedNodes);
    setEdges(finalEdges);
  }, [umlIR, setNodes, setEdges]);

  if (!umlIR) return null;

  return (
    <div style={{ width: '100%', height: '100%', border: '1px solid #444', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker id="aggregation" viewBox="0 0 20 10" refX="20" refY="5" markerWidth="20" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <polygon points="0,5 10,0 20,5 10,10" fill="#1e1e1e" stroke="#aaa" strokeWidth="1.5" />
          </marker>
          <marker id="aggregation-highlighted" viewBox="0 0 20 10" refX="20" refY="5" markerWidth="20" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <polygon points="0,5 10,0 20,5 10,10" fill="#1e1e1e" stroke="#4A90E2" strokeWidth="2" />
          </marker>
          <marker id="composition" viewBox="0 0 20 10" refX="20" refY="5" markerWidth="20" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <polygon points="0,5 10,0 20,5 10,10" fill="#aaa" stroke="#aaa" strokeWidth="1.5" />
          </marker>
          <marker id="composition-highlighted" viewBox="0 0 20 10" refX="20" refY="5" markerWidth="20" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <polygon points="0,5 10,0 20,5 10,10" fill="#4A90E2" stroke="#4A90E2" strokeWidth="2" />
          </marker>
        </defs>
      </svg>
      <ReactFlow 
        nodes={displayNodes} 
        edges={displayEdges} 
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        nodeTypes={nodeTypes} 
        edgeTypes={edgeTypes}
        colorMode="dark"
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}