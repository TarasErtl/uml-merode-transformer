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
import { UMLIR, UMLClass, UMLAssociation, UMLRegularAssociationEnd, UMLAssociationClass } from '../../types/metamodels/uml';
import { nodeTypes, edgeTypes } from './UMLElements';

/**
 * This function takes the nodes and edges of an Diagramm, and uses dagre to calculate the best layout according to the given direction
 * @param nodes the nodes to be layouted
 * @param edges the edges to be layouted
 * @param direction the direction of the layout (default)
 * @returns the nodes and edges where the position of the elements is layouted
 */
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 100,
    ranksep: 50,
    edgesep: 300,
    ranker: 'network-simplex',
  });

  nodes.forEach((node) => {
    const isNAry = node.type === 'nAryNode';
    const isAnchor = node.type === 'anchorNode';
    dagreGraph.setNode(node.id, { width: isAnchor ? 1 : isNAry ? 35 : 260, height: isAnchor ? 1 : isNAry ? 35 : 160 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target, { weight: 1 });
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isNAry = node.type === 'nAryNode';
    const isAnchor = node.type === 'anchorNode';
    const offsetX = isAnchor ? 0.5 : isNAry ? 17.5 : 130;
    const offsetY = isAnchor ? 0.5 : isNAry ? 17.5 : 80;
    return {
      ...node,
      position: { x: nodeWithPosition.x - offsetX, y: nodeWithPosition.y - offsetY },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Maps a UML aggregation string from the metamodel to the correct diagram marker.
 * @param type The aggregation type string (e.g., 'shared', 'composite').
 * @returns The corresponding marker string ('aggregation', 'composition', or 'none').
 */
const getAggregationString = (type: string) => 
  type === 'shared' ? 'aggregation' : type === 'composite' ? 'composition' : 'none';

/**
 * Transforms the raw UML Intermediate Representation (UMLIR) into initial React Flow nodes and edges.
 * @param umlIR The UML Intermediate Representation containing model elements.
 * @returns An object containing the initial nodes and edges for the diagram.
 */
const buildUmlElements = (umlIR: UMLIR) => {
  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  // Extract specific element types from the Intermediate Representation
  const classes = umlIR.model.packagedElement.filter((el) => el.type === 'uml:Class' || el.type === 'uml:AssociationClass') as UMLClass[];
  const associations = umlIR.model.packagedElement.filter((el) => el.type === 'uml:Association' || el.type === 'uml:AssociationClass') as UMLAssociation[];

  // Create visual nodes for every UML class
  classes.forEach((cls) => {
    initialNodes.push({
      id: cls.id,
      type: 'umlClass',
      position: { x: 0, y: 0 },
      data: { label: cls.name, attributes: cls.attributes, operations: cls.operations, isAbstract: cls.isAbstract }
    });
  });

  // Process UML associations into visual edges (for binary) or diamond nodes + edges (for n-ary)
  associations.forEach((assoc) => {
    const isGeneralization = assoc.ends.some((end) => end.endType === 'generalization');

    if (isGeneralization && assoc.ends.length === 2) {
      const superclassEnd = assoc.ends.find((end) => end.endType === 'generalization');
      const subclassEnd = assoc.ends.find((end) => end.endType !== 'generalization');

      if (superclassEnd && subclassEnd) {
        initialEdges.push({
          id: assoc.id,
          source: subclassEnd.targetClassId,
          target: superclassEnd.targetClassId,
          type: 'umlEdge',
          data: {
            sourceLabel: '',
            targetLabel: '',
            sourceAggregation: 'none',
            targetAggregation: 'generalization',
          }
        });
      }
    } else if (assoc.ends.length === 2) {
      // Binary association: map directly to a single React Flow edge
      const end1 = assoc.ends[0] as UMLRegularAssociationEnd;
      const end2 = assoc.ends[1] as UMLRegularAssociationEnd;
      
      const label1 = `${end1.roleName ? end1.roleName + ' ' : ''}${end1.lowerBound}..${end1.upperBound}`;
      const label2 = `${end2.lowerBound}..${end2.upperBound}${end2.roleName ? ' ' + end2.roleName : ''}`;

      if (assoc.type === 'uml:AssociationClass') {
        const anchorId = `${assoc.id}-anchor`;
        
        initialNodes.push({
          id: anchorId,
          type: 'anchorNode',
          position: { x: 0, y: 0 },
          data: {}
        });

        initialEdges.push({
          id: `${assoc.id}-half1`,
          source: end1.targetClassId,
          target: anchorId,
          type: 'umlEdge',
          data: {
            sourceLabel: label1,
            targetLabel: '',
            sourceAggregation: getAggregationString(end1.endType),
            targetAggregation: 'none',
          }
        });

        initialEdges.push({
          id: `${assoc.id}-half2`,
          source: anchorId,
          target: end2.targetClassId,
          type: 'umlEdge',
          data: {
            sourceLabel: '',
            targetLabel: label2,
            sourceAggregation: 'none',
            targetAggregation: getAggregationString(end2.endType),
          }
        });

        initialEdges.push({
          id: `${assoc.id}-dashed-link`,
          source: assoc.id,
          target: anchorId,
          type: 'default',
          animated: false,
          style: { strokeDasharray: '5,5', stroke: '#aaa', strokeWidth: 1.5 }
        });
      } else {
        initialEdges.push({
          id: assoc.id,
          source: end1.targetClassId,
          target: end2.targetClassId,
          type: 'umlEdge',
          data: {
            sourceLabel: label1,
            targetLabel: label2,
            sourceAggregation: getAggregationString(end1.endType),
            targetAggregation: getAggregationString(end2.endType),
          }
        });
      }
    } else if (assoc.ends.length > 2) {
      // N-ary association: map to a central diamond node and multiple connecting edges
      initialNodes.push({
        id: assoc.id,
        type: 'nAryNode',
        position: { x: 0, y: 0 },
        data: { label: assoc.name }
      });

      assoc.ends.forEach((end, idx) => {
        const regEnd = end as UMLRegularAssociationEnd;
        const label = `${regEnd.lowerBound}..${regEnd.upperBound}${regEnd.roleName ? ' ' + regEnd.roleName : ''}`;
        initialEdges.push({
          id: `${assoc.id}-edge-${idx}`,
          source: assoc.id,
          target: regEnd.targetClassId,
          type: 'umlEdge',
          data: {
            targetLabel: label,
            targetAggregation: getAggregationString(regEnd.endType), 
          }
        });
      });
    }
  });

  return { initialNodes, initialEdges };
};

/**
 * Calculates the center of a given layouted node to determine the optimal connection angle.
 * @param node The React Flow node for which to calculate the center.
 * @returns An object containing the x and y coordinates of the node's center.
 */
const getNodeCenter = (node: Node) => {
  const width = node.type === 'anchorNode' ? 1 : node.type === 'nAryNode' ? 35 : 260;
  const height = node.type === 'anchorNode' ? 1 : node.type === 'nAryNode' ? 35 : 160;
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
  // Deep clone edges to prevent mutating React state directly during drags
  const finalEdges = layoutedEdges.map(e => ({ ...e }));
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

interface UMLDiagramProps {
  umlIR: UMLIR | null;
  hoveredElementId?: string | null;
  hoverSource?: 'proposal' | 'diagram' | null;
  onHoverElement?: (id: string | null) => void;
}

/**
 * Main component for rendering the interactive UML Diagram using React Flow.
 * Transforms the custom UML Intermediate Representation (UMLIR) into graphical nodes and edges.
 * @param props The properties for the UMLDiagram component.
 * @param props.umlIR The UML model data to visualize.
 * @param props.hoveredElementId The ID of the currently hovered element (if any).
 * @param props.hoverSource The source of the hover event ('proposal' or 'diagram').
 * @param props.onHoverElement Callback function triggered when an element is hovered.
 * @returns The rendered React Flow diagram component, or null if no UMLIR is provided.
 */
export default function UMLDiagram({ umlIR, hoveredElementId, hoverSource, onHoverElement }: UMLDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView, getNodes, getEdges } = useReactFlow();
  const wasZoomedByProposal = useRef(false);
  const prevNodesPositions = useRef<string>('');

  useEffect(() => {
    if (!umlIR || !umlIR.model) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // 1. Build graphical representation format
    const { initialNodes, initialEdges } = buildUmlElements(umlIR);
    
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
  }, [umlIR, setNodes, setEdges]);

  // Recalculate optimal handles dynamically when nodes are dragged/moved
  useEffect(() => {
    if (nodes.length === 0 || edges.length === 0) return;

    // Create a string signature of all node positions
    const currentPositions = nodes.map(n => `${n.id}:${Math.round(n.position.x)},${Math.round(n.position.y)}`).join('|');
    
    // If positions have changed (e.g. through user drag), update the edges with new handles
    if (currentPositions !== prevNodesPositions.current) {
      prevNodesPositions.current = currentPositions;
      // Use functional state update to always work with the latest edges
      setEdges((eds) => assignOptimalHandles(nodes, eds));
    }
  }, [nodes, setEdges]);

  // Apply highlighting based on hoveredElementId
  useEffect(() => {
    const nodesToHighlight = new Set<string>();
    const edgesToHighlight = new Set<string>();

    if (hoveredElementId) {
      const allNodes = getNodes();
      const allEdges = getEdges();

      const isNode = allNodes.find(n => n.id === hoveredElementId);
      if (isNode) {
        nodesToHighlight.add(hoveredElementId);
        // Highlight adjacent edges
        allEdges.forEach(e => {
          if (e.source === hoveredElementId || e.target === hoveredElementId) {
            edgesToHighlight.add(e.id);
            // Highlight connected classes for N-Ary and Association Class nodes
            if (isNode.type === 'nAryNode' || isNode.type === 'anchorNode') {
              nodesToHighlight.add(e.source);
              nodesToHighlight.add(e.target);
            }
          }
        });
      }

      // Check edges and association class links
      allEdges.forEach(e => {
        if (e.id === hoveredElementId || e.id.includes(hoveredElementId)) {
          edgesToHighlight.add(e.id);
          nodesToHighlight.add(e.source);
          nodesToHighlight.add(e.target);
        }
      });
    }

    setNodes((nds) => nds.map((n) => ({ ...n, className: `diagram-element ${nodesToHighlight.has(n.id) ? 'highlighted' : ''}` })));
    setEdges((eds) => eds.map((e) => ({ ...e, className: `diagram-element ${edgesToHighlight.has(e.id) ? 'highlighted' : ''}` })));

    if (hoveredElementId && nodesToHighlight.size > 0) {
      if (hoverSource === 'proposal') {
        wasZoomedByProposal.current = true;
        const allNodes = getNodes();
        const nodesToFit = allNodes.filter(n => nodesToHighlight.has(n.id));
        fitView({ nodes: nodesToFit, duration: 500, padding: 0.3, maxZoom: 1.3 });
      }
    } else if (!hoveredElementId) {
      if (wasZoomedByProposal.current) {
        wasZoomedByProposal.current = false;
        // Reset view when mouse leaves
        fitView({ duration: 500, padding: 0.1 });
      }
    }
  }, [hoveredElementId, hoverSource, setNodes, setEdges, getNodes, getEdges, fitView]);

  if (!umlIR) return null;

  return (
    <div style={{ width: '100%', height: '100%', border: '1px solid #444', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker id="aggregation" viewBox="0 0 20 10" refX="20" refY="5" markerWidth="20" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <polygon points="0,5 10,0 20,5 10,10" fill="#1e1e1e" stroke="#aaa" strokeWidth="1.5" />
          </marker>
          <marker id="composition" viewBox="0 0 20 10" refX="20" refY="5" markerWidth="20" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <polygon points="0,5 10,0 20,5 10,10" fill="#aaa" stroke="#aaa" strokeWidth="1.5" />
          </marker>
          <marker id="generalization" viewBox="0 0 30 30" refX="30" refY="15" markerWidth="30" markerHeight="30" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <polygon points="0,0 30,15 0,30" fill="#1e1e1e" stroke="#aaa" strokeWidth="1.5" />
          </marker>
        </defs>
      </svg>
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