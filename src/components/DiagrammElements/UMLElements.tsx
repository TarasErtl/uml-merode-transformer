import React from 'react';
import { Handle, Position, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, getBezierPath } from '@xyflow/react';

/**
 * Shared component to render invisible handles for all 4 sides.
 * Prevents redundant code across different node types.
 */
const InvisibleHandles = () => {
  const positions = [Position.Top, Position.Bottom, Position.Left, Position.Right];
  return (
    <>
      {positions.map((pos) => (
        <React.Fragment key={pos}>
          <Handle type="target" position={pos} id={`${pos}-target`} style={{ opacity: 0 }} />
          <Handle type="source" position={pos} id={`${pos}-source`} style={{ opacity: 0 }} />
        </React.Fragment>
      ))}
    </>
  );
};

/**
 * Custom Node component for representing UML Classes.
 * Displays the class name in a header and lists attributes with visibility markers.
 */
export const ClassNode = ({ data }: any) => {
  return (
    <div style={{ 
      border: '1px solid #555', 
      borderRadius: '6px', 
      background: '#1e1e1e', 
      color: '#f8f8f2',
      minWidth: '240px', 
      fontSize: '16px', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.4)'
    }}>
      <div style={{ 
        background: '#2d2d2d', 
        borderBottom: '1px solid #555', 
        padding: '12px', 
        textAlign: 'center', 
        fontWeight: 'bold',
        fontSize: '20px',
        fontFamily: 'Arial',
        borderTopLeftRadius: '5px',
        borderTopRightRadius: '5px'
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
          <div style={{ fontStyle: 'italic', color: '#888', textAlign: 'center', fontSize: '14px' }}>No Attributes</div>
        )}
      </div>
      
      <InvisibleHandles />
      <InvisibleHandles />
    </div>
  );
};

/**
 * Custom Node component for N-ary associations.
 * Renders as a diamond shape (rhombus) to represent complex relationships between multiple classes.
 */
export const NAryNode = ({ data }: any) => {
  return (
    <div style={{ position: 'relative', width: '35px', height: '35px' }}>
      <div style={{ 
        width: '100%', height: '100%', 
        background: '#aaa', 
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
      }}></div>
      {data.label && (
        <div style={{ position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', color: '#eee', fontSize: '12px', whiteSpace: 'nowrap' }}>
          {data.label}
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

/**
 * Custom Anchor Node for Association Classes
 * Invisible node serving as a connection point in the middle of an association edge.
 */
export const AnchorNode = () => {
  return (
    <div style={{ width: '1px', height: '1px', visibility: 'hidden' }}>
      <InvisibleHandles />
    </div>
  );
};

/**
 * Calculates the bezier control points for self-loop edges.
 */
const getSelfLoopControlPoint = (x: number, y: number, pos: Position) => {
  switch (pos) {
    case Position.Top: return { x, y: y - 100 };
    case Position.Bottom: return { x, y: y + 100 };
    case Position.Left: return { x: x - 100, y };
    case Position.Right: return { x: x + 100, y };
    default: return { x, y };
  }
};

/**
 * Custom Edge component for UML relationships.
 * Handles the rendering of association paths, multiplicity labels, 
 * and specific markers for aggregation or composition.
 */
export const UMLEdge = ({
  id,
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
  let edgePath;

  if (isSelfLoop) {
    const cp1 = getSelfLoopControlPoint(sourceX, sourceY, sourcePosition);
    const cp2 = getSelfLoopControlPoint(targetX, targetY, targetPosition);
    edgePath = `M ${sourceX} ${sourceY} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${targetX} ${targetY}`;
  } else {
    [edgePath] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }

  const getMarkerUrl = (agg?: string) => {
    if (agg === 'composition' || agg === 'composite') return 'url(#composition)';
    if (agg === 'aggregation' || agg === 'shared') return 'url(#aggregation)';
    if (agg === 'generalization') return 'url(#generalization)';
    return undefined;
  };

  const mStart = getMarkerUrl(data?.sourceAggregation);
  const mEnd = getMarkerUrl(data?.targetAggregation) || markerEnd;

  const labelOffset = 30;

  let sourceLabelX = sourceX;
  let sourceLabelY = sourceY;
  switch (sourcePosition) {
    case Position.Top:    sourceLabelY -= labelOffset; break;
    case Position.Bottom: sourceLabelY += labelOffset; break;
    case Position.Left:   sourceLabelX -= labelOffset; break;
    case Position.Right:  sourceLabelX += labelOffset; break;
  }

  let targetLabelX = targetX;
  let targetLabelY = targetY;
  switch (targetPosition) {
    case Position.Top:    targetLabelY -= labelOffset; break;
    case Position.Bottom: targetLabelY += labelOffset; break;
    case Position.Left:   targetLabelX -= labelOffset; break;
    case Position.Right:  targetLabelX += labelOffset; break;
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerStart={mStart} markerEnd={mEnd} style={{ ...style, stroke: '#aaa', strokeWidth: 2 }} />
      {data?.sourceLabel && (
        <EdgeLabelRenderer>
          <div style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceLabelX}px,${sourceLabelY}px)`,
            background: '#333',
            color: '#eee',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
          pointerEvents: 'none',
          zIndex: 10
          }}>
            {data.sourceLabel}
          </div>
        </EdgeLabelRenderer>
      )}
      {data?.targetLabel && (
        <EdgeLabelRenderer>
          <div style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${targetLabelX}px,${targetLabelY}px)`,
            background: '#333',
            color: '#eee',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
            pointerEvents: 'none',
            zIndex: 10
          }}>
            {data.targetLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const nodeTypes = { umlClass: ClassNode, nAryNode: NAryNode, anchorNode: AnchorNode };
export const edgeTypes = { umlEdge: UMLEdge };