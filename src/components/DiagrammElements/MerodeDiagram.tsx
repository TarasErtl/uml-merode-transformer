import { useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { type MerodeIR } from '../../types/metamodels/merode';
import { nodeTypes, edgeTypes, MerodeDiagramMarkers } from './MerodeElements';

/**
 * Calculates the layout of the given nodes and edges using the Dagre library.
 * Configured to create a strict top-down hierarchy specifically for MERODE diagrams.
 * 
 * @param nodes The React Flow nodes to be laid out.
 * @param edges The React Flow edges connecting the nodes.
 * @param direction The layout direction ('TB' for Top-Bottom by default).
 * @returns An object containing the positioned nodes and unchanged edges.
 */
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 150,
    ranksep: 200,
    edgesep: 30,
    ranker: 'network-simplex', 
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 260, height: 160 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target, { weight: 1 });
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x: nodeWithPosition.x - 130, y: nodeWithPosition.y - 80 },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Transforms the custom Merode Intermediate Representation (MerodeIR) into initial React Flow nodes and edges.
 * @param merodeIR The MERODE Intermediate Representation containing model elements.
 * @returns An object containing the initial nodes and edges for the diagram.
 */
const buildMerodeElements = (merodeIR: MerodeIR) => {
  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  // Group generic elements into classes and associations using structural properties
  const elements = merodeIR.model.elements;
  const classes = elements.filter((el: any) => el.type === 'merode:Class' || el.attributes !== undefined);
  const associations = elements.filter((el: any) => el.type === 'merode:Association' || el.masterClassId !== undefined);

  // Create visual nodes for every MERODE class
  classes.forEach((cls: any) => {
    initialNodes.push({
      id: cls.id,
      type: 'merodeClass',
      position: { x: 0, y: 0 },
      data: { label: cls.name, attributes: cls.attributes }
    });
  });

  // Process existence dependencies into directed edges (Master -> Dependent)
  associations.forEach((assoc: any) => {
    const multiplicity = assoc.multiplicity || '';
    const isOptional = multiplicity.startsWith('0');
    const isMultiple = multiplicity.endsWith('*') || multiplicity.endsWith('n') || multiplicity.endsWith('m') || multiplicity === '*';

    initialEdges.push({
      id: assoc.id,
      source: assoc.masterClassId,
      target: assoc.dependentClassId,
      type: 'merodeEdge',
      data: {
        targetLabel: `${assoc.roleName || ''}`.trim(),
        isOptional,
        isMultiple,
        isGeneralization: assoc.isGeneralization,
        isAbstract: assoc.isAbstract,
      }
    });
  });

  return { initialNodes, initialEdges };
};

/**
 * Calculates the center of a given layouted node to determine the optimal connection angle.
 * @param node The React Flow node for which to calculate the center.
 * @returns An object containing the x and y coordinates of the node's center.
 */
const getNodeCenter = (node: Node) => {
  const width = 260;
  const height = 160;
  return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
};

/**
 * Resolves layout routing globally by determining the best anchor points for edges based on angles and distances.
 * Fallbacks are used if preferred positions are already taken by other edges.
 * @param layoutedNodes The array of nodes that have already been positioned.
 * @param layoutedEdges The array of edges to be routed.
 * @returns A new array of edges with optimally assigned source and target handles.
 */
const assignOptimalHandles = (layoutedNodes: Node[], layoutedEdges: Edge[]) => {
  const finalEdges = [...layoutedEdges];
  const nodeConnections = new Map<string, { edge: Edge, type: 'source' | 'target', angle: number, dist: number }[]>();
  layoutedNodes.forEach(n => nodeConnections.set(n.id, []));

  // 1. Collect all edges, calculate the ideal angle and distance
  finalEdges.forEach(edge => {
    const sourceNode = layoutedNodes.find(n => n.id === edge.source);
    const targetNode = layoutedNodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      if (sourceNode.id === targetNode.id) {
        // Handle self-loops by assigning fixed angles to encourage a specific loop shape (e.g., right-to-top).
        // These will be processed by the global assignment logic to avoid collisions.
        nodeConnections.get(sourceNode.id)?.push({ edge, type: 'source', angle: 0, dist: 0 }); // Prefers Right
        nodeConnections.get(targetNode.id)?.push({ edge, type: 'target', angle: -90, dist: 0 }); // Prefers Top
        edge.data = { ...edge.data, isSelfLoop: true }; // Mark for special rendering
      } else {
        const sCenter = getNodeCenter(sourceNode);
        const tCenter = getNodeCenter(targetNode);
        
        // Angle in degrees (-180 to 180) between centers
        const angleST = Math.atan2(tCenter.y - sCenter.y, tCenter.x - sCenter.x) * 180 / Math.PI;
        const angleTS = Math.atan2(sCenter.y - tCenter.y, sCenter.x - tCenter.x) * 180 / Math.PI;
        
        // Calculate distance
        const dist = Math.hypot(tCenter.x - sCenter.x, tCenter.y - sCenter.y);
        
        nodeConnections.get(sourceNode.id)?.push({ edge, type: 'source', angle: angleST, dist });
        nodeConnections.get(targetNode.id)?.push({ edge, type: 'target', angle: angleTS, dist });
      }
    }
  });

  // 2. Conflict-free assignment based on distance and dynamic angle
  nodeConnections.forEach((connections) => {
    // Process longest edges first. If equal length, sort by angle.
    // This allows distant connections to get the most direct handle, while close connections tend to evade.
    connections.sort((a, b) => b.dist - a.dist || a.angle - b.angle);

    // Track usage for both sources and targets combined to prevent visual overlap
    const positionUsage = new Map<Position, number>([
      [Position.Top, 0],
      [Position.Right, 0],
      [Position.Bottom, 0],
      [Position.Left, 0]
    ]);
      
    connections.forEach(conn => {
      const handleAngles: Record<string, number> = {
        [Position.Right]: 0,
        [Position.Bottom]: 90,
        [Position.Left]: 180,
        [Position.Top]: -90
      };

      const getAngleDiff = (a1: number, a2: number) => {
        const diff = Math.abs(a1 - a2) % 360;
        return diff > 180 ? 360 - diff : diff;
      };

      const positions = [Position.Right, Position.Bottom, Position.Left, Position.Top];
      
      // Dynamic fallback order: Handles closest to the ideal angle are preferred
      positions.sort((p1, p2) => getAngleDiff(conn.angle, handleAngles[p1]) - getAngleDiff(conn.angle, handleAngles[p2]));
      
      // Find the position with the lowest usage, based on the calculated order
      let bestPos = positions[0];
      let minUsage = Infinity;
      
      for (const pos of positions) {
        const usage = positionUsage.get(pos)!;
        if (usage < minUsage) {
          minUsage = usage;
          bestPos = pos;
          if (minUsage === 0) break; // Perfect, it's completely free
        }
      }
      
      // Mark position as used
      positionUsage.set(bestPos, positionUsage.get(bestPos)! + 1);
      
      // Assign handle to edge
      if (conn.type === 'source') conn.edge.sourceHandle = `${bestPos}-source`;
      else conn.edge.targetHandle = `${bestPos}-target`;
    });
  });

  return finalEdges;
};

interface MERODEDiagramProps {
  merodeIR: MerodeIR | null;
  hoveredElementId?: string | null;
  hoverSource?: 'proposal' | 'diagram' | null;
  onHoverElement?: (id: string | null) => void;
}

/**
 * Main component for rendering the MERODE Diagram using React Flow.
 * Transforms the custom Merode Intermediate Representation (MerodeIR) into interactive nodes and edges,
 * visually highlighting the existence dependencies.
 * @param props The properties for the MERODEDiagram component.
 * @param props.merodeIR The MERODE model data to visualize.
 * @param props.hoveredElementId The ID of the currently hovered element (if any).
 * @param props.hoverSource The source of the hover event ('proposal' or 'diagram').
 * @param props.onHoverElement Callback function triggered when an element is hovered.
 * @returns The rendered React Flow diagram component, or null if no MerodeIR is provided.
 */
export default function MERODEDiagram({ merodeIR, hoveredElementId, hoverSource, onHoverElement }: MERODEDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView, getNodes, getEdges } = useReactFlow();
  const wasZoomedByProposal = useRef(false);

  useEffect(() => {
    if (!merodeIR || !merodeIR.model) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // 1. Build graphical representation format
    const { initialNodes, initialEdges } = buildMerodeElements(merodeIR);

    // 2. Apply auto-layout via dagre
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges, 'TB');

    // 3. Prevent overlaps by smartly routing edges
    const finalEdges = assignOptimalHandles(layoutedNodes, layoutedEdges);

    // Retain existing layout positions if the node is already present
    setNodes((currentNodes) => layoutedNodes.map(node => {
      const existingNode = currentNodes.find(n => n.id === node.id);
      return existingNode ? { ...node, position: existingNode.position, className: 'diagram-element' } : { ...node, className: 'diagram-element' };
    }));
    
    setEdges(finalEdges.map(e => ({ ...e, className: 'diagram-element' })));
  }, [merodeIR, setNodes, setEdges]);

  // Apply highlighting based on hoveredElementId
  useEffect(() => {
    const nodesToHighlight = new Set<string>();
    const edgesToHighlight = new Set<string>();

    if (hoveredElementId) {
      const allNodes = getNodes();
      const allEdges = getEdges();

      // 1. Identify explicitly hovered nodes
      const hoveredNodeIds = new Set(
        allNodes.filter(n => n.id === hoveredElementId || n.id.includes(hoveredElementId)).map(n => n.id)
      );
      
      hoveredNodeIds.forEach(id => nodesToHighlight.add(id));

      allEdges.forEach(e => {
        // 2. Check if edge itself is hovered
        if (e.id === hoveredElementId || e.id.includes(hoveredElementId)) {
          edgesToHighlight.add(e.id);
          nodesToHighlight.add(e.source);
          nodesToHighlight.add(e.target);
        }

        // 3. Check if edge is adjacent to a hovered node
        const isSourceHovered = hoveredNodeIds.has(e.source);
        const isTargetHovered = hoveredNodeIds.has(e.target);

        if (isSourceHovered || isTargetHovered) {
          edgesToHighlight.add(e.id);

          // Highlight adjacent classes for resolved associations (Intermediate Classes)
          if (isSourceHovered && (e.source.includes('_Class') || e.source !== hoveredElementId)) {
            nodesToHighlight.add(e.target);
          }
          if (isTargetHovered && (e.target.includes('_Class') || e.target !== hoveredElementId)) {
            nodesToHighlight.add(e.source);
          }
        }
      });

      // Fit view if triggered by proposal hover
      if (hoverSource === 'proposal' && nodesToHighlight.size > 0) {
        wasZoomedByProposal.current = true;
        const nodesToFit = allNodes.filter(n => nodesToHighlight.has(n.id));
        fitView({ nodes: nodesToFit, duration: 500, padding: 0.3, maxZoom: 1.3 });
      }
    } else {
      // Reset view if previously zoomed by proposal
      if (wasZoomedByProposal.current) {
        wasZoomedByProposal.current = false;
        fitView({ duration: 500, padding: 0.1 });
      }
    }

    // Update classes (avoiding trailing spaces)
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        className: nodesToHighlight.has(n.id) ? 'diagram-element highlighted' : 'diagram-element',
      }))
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        className: edgesToHighlight.has(e.id) ? 'diagram-element highlighted' : 'diagram-element',
      }))
    );
  }, [hoveredElementId, hoverSource, setNodes, setEdges, getNodes, getEdges, fitView]);

  if (!merodeIR) return null;

  return (
    <div style={{ width: '100%', height: '100%', border: '1px solid #444', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
      <MerodeDiagramMarkers />
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={onNodesChange} 
        onEdgesChange={onEdgesChange} 
        onNodeMouseEnter={(_, node) => onHoverElement?.(node.id)}
        onNodeMouseLeave={() => onHoverElement?.(null)}
        onEdgeMouseEnter={(_, edge) => onHoverElement?.(edge.id)}
        onEdgeMouseLeave={() => onHoverElement?.(null)}
        nodeTypes={nodeTypes} 
        edgeTypes={edgeTypes} 
        colorMode="dark" 
        fitView
      >
        <Background />
      </ReactFlow>
    </div>
  );
}