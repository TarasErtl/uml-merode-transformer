import { useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
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

interface MERODEDiagramProps {
  merodeIR: MerodeIR | null;
}

/**
 * Main component for rendering the MERODE Diagram using React Flow.
 * Transforms the custom Merode Intermediate Representation (MerodeIR) into interactive nodes and edges,
 * visually highlighting the existence dependencies.
 */
export default function MERODEDiagram({ merodeIR }: MERODEDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!merodeIR || !merodeIR.model) {
      setNodes([]);
      setEdges([]);
      return;
    }

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
          isMultiple
        }
      });
    });

    // Apply top-down auto-layout to enforce the hierarchical structure
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges, 'TB');

    // Track the usage of specific connection handles to fan out multiple incoming/outgoing edges smoothly
    const targetHandleUsage = new Map<string, number>();
    const sourceHandleUsage = new Map<string, number>();

    /**
     * Determines the optimal connection handle for a node based on its spatial relation to the connected node.
     * Distributes overlapping edges to adjacent connection points (left, center, right).
     * 
     * @param nodeId The ID of the node.
     * @param type Whether the handle is acting as 'source' or 'target'.
     * @param sourceNode The origin node of the edge.
     * @param targetNode The destination node of the edge.
     * @param pairedHandle The handle already chosen on the opposite side, used to align straight vertical edges.
     * @returns The ID of the best available handle.
     */
    const getAvailableHandle = (nodeId: string, type: 'source' | 'target', sourceNode: Node, targetNode: Node, pairedHandle?: string): string => {
      const usageMap = type === 'source' ? sourceHandleUsage : targetHandleUsage;
      
      const dx = targetNode.position.x - sourceNode.position.x;
      const threshold = 100;

      let preferredHandles: string[] = [];

      if (type === 'source') {
        if (dx < -threshold) preferredHandles = ['bottom-source-left', 'bottom-source-center', 'bottom-source-right'];
        else if (dx > threshold) preferredHandles = ['bottom-source-right', 'bottom-source-center', 'bottom-source-left'];
        else preferredHandles = ['bottom-source-center', 'bottom-source-left', 'bottom-source-right'];
      } else {
        if (dx > threshold) {
          preferredHandles = ['left-target', 'top-target-left', 'top-target-center'];
        } else if (dx < -threshold) {
          preferredHandles = ['right-target', 'top-target-right', 'top-target-center'];
        } else {
          if (pairedHandle?.includes('left')) preferredHandles = ['top-target-left', 'top-target-center', 'top-target-right'];
          else if (pairedHandle?.includes('right')) preferredHandles = ['top-target-right', 'top-target-center', 'top-target-left'];
          else preferredHandles = ['top-target-center', 'top-target-left', 'top-target-right'];
        }
      }

      let bestHandle = preferredHandles[0];
      let minUsage = usageMap.get(`${nodeId}-${bestHandle}`) || 0;

      for (const handle of preferredHandles) {
        const usage = usageMap.get(`${nodeId}-${handle}`) || 0;
        if (usage < minUsage) {
          minUsage = usage;
          bestHandle = handle;
        }
      }
      usageMap.set(`${nodeId}-${bestHandle}`, minUsage + 1);
      return bestHandle;
    };

    const finalEdges = layoutedEdges.map((edge) => {
      const sourceNode = layoutedNodes.find((n) => n.id === edge.source);
      const targetNode = layoutedNodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        if (sourceNode.id === targetNode.id) {
          // Handle unary associations (self-loops) by forcing them to the side and top
          edge.data = { ...edge.data, isSelfLoop: true };
          edge.sourceHandle = 'right-source';
          edge.targetHandle = 'top-target-center';
        } else {
          // Normal existence dependencies: calculate dynamic routing to prevent overlaps
          edge.sourceHandle = getAvailableHandle(sourceNode.id, 'source', sourceNode, targetNode);
          edge.targetHandle = getAvailableHandle(targetNode.id, 'target', sourceNode, targetNode, edge.sourceHandle);
        }
      }
      return edge;
    });

    setNodes(layoutedNodes);
    setEdges(finalEdges);
  }, [merodeIR, setNodes, setEdges]);

  if (!merodeIR) return null;

  return (
    <div style={{ width: '100%', height: '100%', border: '1px solid #444', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
      <MerodeDiagramMarkers />
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} edgeTypes={edgeTypes} colorMode="dark" fitView>
        <Background />
      </ReactFlow>
    </div>
  );
}