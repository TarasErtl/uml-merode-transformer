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
    nodesep: 120,
    ranksep: 150,
    edgesep: 20,
    ranker: 'longest-path', 
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
 * Helper function to calculate the absolute coordinates of a specific handle on a node.
 * Used to determine the physical distance between connection points.
 * 
 * @param node The React Flow node.
 * @param handlePosition The position of the handle (Top, Bottom, Left, Right).
 * @param nodeWidth The visual width of the node.
 * @param nodeHeight The visual height of the node.
 * @returns The absolute x and y coordinates on the canvas.
 */
const getHandleAbsoluteCoordinates = (node: Node, handlePosition: Position, nodeWidth: number, nodeHeight: number) => {
  let x = node.position.x;
  let y = node.position.y;

  switch (handlePosition) {
    case Position.Top:
      x += nodeWidth / 2;
      break;
    case Position.Bottom:
      x += nodeWidth / 2;
      y += nodeHeight;
      break;
    case Position.Left:
      y += nodeHeight / 2;
      break;
    case Position.Right:
      x += nodeWidth;
      y += nodeHeight / 2;
      break;
  }
  return { x, y };
};

/**
 * Determines the best pair of handles between a source and target node based on the shortest euclidean distance.
 * This prevents edges from routing through the nodes themselves or taking unnecessarily long paths.
 * 
 * @param sourceNode The starting node.
 * @param targetNode The target node.
 * @returns The optimal combination of source and target handle positions.
 */
const getBestHandlePair = (sourceNode: Node, targetNode: Node): { sourcePos: Position, targetPos: Position } => {
  const visibleSourcePositions = [Position.Bottom, Position.Right];
  const visibleTargetPositions = [Position.Top, Position.Left];

  let minDistance = Infinity;
  let bestSourcePos: Position = Position.Right;
  let bestTargetPos: Position = Position.Left;

  const sourceNodeWidth = sourceNode.type === 'anchorNode' ? 1 : sourceNode.type === 'nAryNode' ? 35 : 260;
  const sourceNodeHeight = sourceNode.type === 'anchorNode' ? 1 : sourceNode.type === 'nAryNode' ? 35 : 160;
  const targetNodeWidth = targetNode.type === 'anchorNode' ? 1 : targetNode.type === 'nAryNode' ? 35 : 260;
  const targetNodeHeight = targetNode.type === 'anchorNode' ? 1 : targetNode.type === 'nAryNode' ? 35 : 160;

  for (const sPos of visibleSourcePositions) {
    for (const tPos of visibleTargetPositions) {
      const sourceCoords = getHandleAbsoluteCoordinates(sourceNode, sPos, sourceNodeWidth, sourceNodeHeight);
      const targetCoords = getHandleAbsoluteCoordinates(targetNode, tPos, targetNodeWidth, targetNodeHeight);

      const distance = Math.sqrt(
        Math.pow(sourceCoords.x - targetCoords.x, 2) +
        Math.pow(sourceCoords.y - targetCoords.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        bestSourcePos = sPos;
        bestTargetPos = tPos;
      }
    }
  }
  return { sourcePos: bestSourcePos, targetPos: bestTargetPos };
};

interface UMLDiagramProps {
  umlIR: UMLIR | null;
}

/**
 * Main component for rendering the interactive UML Diagram using React Flow.
 * Transforms the custom UML Intermediate Representation (UMLIR) into graphical nodes and edges.
 */
export default function UMLDiagram({ umlIR }: UMLDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!umlIR || !umlIR.model) {
      setNodes([]);
      setEdges([]);
      return;
    }

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
        data: { label: cls.name, attributes: cls.attributes }
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

        const getAggregationString = (type: string) => type === 'shared' ? 'aggregation' : type === 'composite' ? 'composition' : 'none';

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
              targetLabel: '', // Label only at the class side
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
              sourceLabel: '', // Label only at the class side
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

        const getAggregationString = (type: string) => type === 'shared' ? 'aggregation' : type === 'composite' ? 'composition' : 'none';

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

    // Apply auto-layout to position all elements hierarchically
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges, 'TB');

    // Track the usage of handles to prevent multiple edges from overlapping at the exact same anchor point
    const classNodeHandleUsage: Map<string, Set<string>> = new Map();
    const nAryNodeSourceHandleUsage: Map<string, Map<Position, number>> = new Map();

    /**
     * Finds an available handle for a given node, prioritizing from a list of preferred handle positions.
     * It ensures that if a handle is free, it's picked, otherwise falls back to other candidates.
     * @param nodeId The ID of the node.
     * @param handleType The type of handle ('source' or 'target').
     * @param preferredPositions An ordered list of handle positions to try first. These should be visible handles.
     * @returns The ID of an available handle.
     */
    const getAvailableClassNodeHandle = (nodeId: string, handleType: 'source' | 'target', preferredPositions: Position[]): string => {
      if (!classNodeHandleUsage.has(nodeId)) {
        classNodeHandleUsage.set(nodeId, new Set<string>());
      }
      const nodeUsedHandles = classNodeHandleUsage.get(nodeId)!;

      const preferredHandleIds = preferredPositions.map(pos => `${pos}-${handleType}`);

      for (const handleId of preferredHandleIds) {
        if (!nodeUsedHandles.has(handleId)) {
          nodeUsedHandles.add(handleId);
          return handleId;
        }
      }

      let fallbackCandidates: Position[] = [];
      if (handleType === 'source') {
        fallbackCandidates = [Position.Right, Position.Bottom];
      } else {
        fallbackCandidates = [Position.Left, Position.Top];
      }

      const uniqueFallbackCandidates = fallbackCandidates.filter(pos => !preferredPositions.includes(pos));
      const uniqueFallbackHandleIds = uniqueFallbackCandidates.map(pos => `${pos}-${handleType}`);

      for (const handleId of uniqueFallbackHandleIds) {
        if (!nodeUsedHandles.has(handleId)) {
          nodeUsedHandles.add(handleId);
          return handleId;
        }
      }

      if (preferredHandleIds.length > 0) {
        nodeUsedHandles.add(preferredHandleIds[0]);
        return preferredHandleIds[0];
      }

      return handleType === 'source' ? 'bottom-source' : 'top-target';
    };

    /**
     * Finds the best source handle for an n-ary node, prioritizing uniform distribution
     * and then the side closest to the target node.
     * @param nAryNodeId The ID of the n-ary node.
     * @param targetNode The target class node.
     * @returns The ID of the chosen source handle on the n-ary node.
     */
    const getNAryBalancedSourceHandle = (nAryNodeId: string, targetNode: Node): string => {
      if (!nAryNodeSourceHandleUsage.has(nAryNodeId)) {
        nAryNodeSourceHandleUsage.set(nAryNodeId, new Map<Position, number>([
          [Position.Top, 0],
          [Position.Right, 0],
          [Position.Bottom, 0],
          [Position.Left, 0],
        ]));
      }
      const nodeUsage = nAryNodeSourceHandleUsage.get(nAryNodeId)!;

      const nAryNode = layoutedNodes.find(n => n.id === nAryNodeId);
      if (!nAryNode) {
        return 'bottom-source';
      }

      const dx = targetNode.position.x - nAryNode.position.x;

      let preferredSourcePos: Position;
      const horizontalThreshold = 50;

      if (dx < -horizontalThreshold) {
        preferredSourcePos = Position.Left;
      } else if (dx > horizontalThreshold) {
        preferredSourcePos = Position.Right;
      } else {
        preferredSourcePos = Position.Bottom;
      }

      const allSourcePositions: Position[] = [Position.Top, Position.Right, Position.Bottom, Position.Left];
      allSourcePositions.sort((a, b) => {
        const usageA = nodeUsage.get(a) || 0;
        const usageB = nodeUsage.get(b) || 0;

        if (usageA !== usageB) {
          return usageA - usageB;
        }
        if (a === preferredSourcePos && b !== preferredSourcePos) return -1;
        if (b === preferredSourcePos && a !== preferredSourcePos) return 1;
        
        return 0;
      });

      const chosenPosition = allSourcePositions[0];
      nodeUsage.set(chosenPosition, (nodeUsage.get(chosenPosition) || 0) + 1);
      return `${chosenPosition}-source`;
    };

    const finalEdges = layoutedEdges.map((edge) => {
      const sourceNode = layoutedNodes.find((n) => n.id === edge.source);
      const targetNode = layoutedNodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        if (sourceNode.id === targetNode.id) {
          const nodeId = sourceNode.id;
          const nodeUsedHandles = classNodeHandleUsage.get(nodeId) || new Set<string>();

          const selfLoopHandlePairs = [
            { source: Position.Left, target: Position.Bottom },
            { source: Position.Top, target: Position.Right },
            { source: Position.Right, target: Position.Top },
            { source: Position.Bottom, target: Position.Left }
          ];

          let chosenSourcePos: Position = Position.Right;
          let chosenTargetPos: Position = Position.Top;

          let foundFreePair = false;
          for (const pair of selfLoopHandlePairs) {
            const sourceHandleId = `${pair.source}-source`;
            const targetHandleId = `${pair.target}-target`;
            if (!nodeUsedHandles.has(sourceHandleId) && !nodeUsedHandles.has(targetHandleId)) {
              chosenSourcePos = pair.source;
              chosenTargetPos = pair.target;
              foundFreePair = true;
              break;
            }
          }

          edge.sourceHandle = getAvailableClassNodeHandle(nodeId, 'source', [chosenSourcePos]);
          edge.targetHandle = getAvailableClassNodeHandle(nodeId, 'target', [chosenTargetPos]);
        } else if (sourceNode.type === 'nAryNode') {
          const nAryNode = sourceNode;
          const classNode = targetNode;

          const dx = classNode.position.x - nAryNode.position.x;

          let classTargetPos: Position;
          const alignmentThreshold = 50;

          if (Math.abs(dx) < alignmentThreshold) {
            classTargetPos = Position.Top;
          } else if (dx < 0) {
            classTargetPos = Position.Left;
          } else {
            classTargetPos = Position.Right;
          }
          edge.sourceHandle = getNAryBalancedSourceHandle(nAryNode.id, classNode);
          edge.targetHandle = getAvailableClassNodeHandle(classNode.id, 'target', [classTargetPos]);
        } else {
          const { sourcePos, targetPos } = getBestHandlePair(sourceNode, targetNode);

          edge.sourceHandle = getAvailableClassNodeHandle(sourceNode.id, 'source', [sourcePos]);
          edge.targetHandle = getAvailableClassNodeHandle(targetNode.id, 'target', [targetPos]);
        }
      }
      return edge;
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