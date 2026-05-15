import React from 'react';
import { Handle, Position, BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';

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
 * Helper function to map visibility strings to UML symbols
 */
const getVisibilitySymbol = (visibility?: string) => {
  if (visibility === 'public') return '+ ';
  if (visibility === 'private') return '- ';
  if (visibility === 'protected') return '# ';
  return ''; // Default to no symbol instead of '#' if undefined
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
 * Custom Node component for representing MERODE Classes.
 * It uses a distinct color scheme to differentiate from UML Classes.
 */
export const MerodeClassNode = ({ data }: any) => {
  return (
    <div style={{ 
      border: '1px solid #555', 
      borderRadius: '6px', 
      background: '#1e1e1e', // Match UML node background color
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
          data.attributes.map((attr: any, index: number) => (
            <div key={attr.id || index} style={{ marginBottom: '4px' }}>
              {attr.name}: {attr.type}
            </div>
          ))
        ) : (
          <div style={{ fontStyle: 'italic', color: '#888', textAlign: 'center', fontSize: '14px' }}>No Attributes</div>
        )}
      </div>
      
      {data.operations && data.operations.length > 0 && (
        <div style={{ padding: '12px', borderTop: '1px solid #555' }}>
          {data.operations.map((op: any) => (
            <div key={op.id} style={{ marginBottom: '4px' }}>
              {getVisibilitySymbol(op.visibility)}{op.name}()
            </div>
          ))}
        </div>
      )}

      <InvisibleHandles />
    </div>
  );
};

/**
 * Custom Edge component for MERODE associations (usually existence dependency).
 */
export const MerodeEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }: any) => {
  const isSelfLoop = data?.isSelfLoop;
  let edgePath;

  if (isSelfLoop) {
    const cp1 = getSelfLoopControlPoint(sourceX, sourceY, sourcePosition);
    const cp2 = getSelfLoopControlPoint(targetX, targetY, targetPosition);
    edgePath = `M ${sourceX} ${sourceY} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${targetX} ${targetY}`;
  } else {
    [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  }

  let mStart = data?.isOptional ? 'url(#merode-circle-hollow)' : 'url(#merode-circle-filled)';
  let mEnd = data?.isMultiple ? (markerEnd || 'url(#merode-arrow)') : undefined;
  const labelOffset = 60; // Increased offset to prevent labels from overlapping horizontal markers

  if (data?.isGeneralization) {
    mStart = data.isAbstract ? 'url(#generalization-abstract)' : 'url(#generalization-concrete)';
    mEnd = undefined; // No marker on the subclass side
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
      {data?.targetLabel && !data?.isGeneralization && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${targetLabelX}px,${targetLabelY}px)`, background: '#333', color: '#eee', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, pointerEvents: 'none', zIndex: 10 }}>
            {data.targetLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const nodeTypes = { merodeClass: MerodeClassNode };
export const edgeTypes = { merodeEdge: MerodeEdge };

export const MerodeDiagramMarkers = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
    <defs>
      <marker id="merode-arrow" viewBox="0 0 24 24" refX="24" refY="12" markerWidth="24" markerHeight="24" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <polygon points="0,4 24,12 0,20 6,12" fill="#aaa" stroke="#aaa" strokeWidth="1.5" strokeLinejoin="round" />
      </marker>
      
      <marker id="merode-circle-hollow" viewBox="0 0 20 20" refX="10" refY="10" markerWidth="20" markerHeight="20" orient="auto" markerUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="8" fill="#1e1e1e" stroke="#aaa" strokeWidth="2" />
      </marker>

      <marker id="merode-circle-filled" viewBox="0 0 20 20" refX="10" refY="10" markerWidth="20" markerHeight="20" orient="auto" markerUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="8" fill="#aaa" stroke="#aaa" strokeWidth="2" />
      </marker>

      <marker id="generalization-abstract" viewBox="0 0 30 30" refX="30" refY="15" markerWidth="30" markerHeight="30" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <polygon points="0,0 30,15 0,30" fill="#1e1e1e" stroke="#aaa" strokeWidth="1.5" />
      </marker>
      
      <marker id="generalization-concrete" viewBox="0 0 30 30" refX="30" refY="15" markerWidth="30" markerHeight="30" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <polygon points="0,0 30,15 0,30" fill="#aaa" stroke="#aaa" strokeWidth="1.5" />
      </marker>
    </defs>
  </svg>
);