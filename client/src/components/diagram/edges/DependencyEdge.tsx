import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from 'reactflow';
import { RelationshipEditModal } from '../../forms/modals/RelationshipModal';
import RelationshipToolBar from './RelationshipToolBar';
import { getMarkerRotation } from './edgeUtils';

export function DependencyEdgeView({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const theme = useTheme();
  const edgeColor = theme.palette.mode === 'dark' ? '#b1b1b7' : '#555';
  const emptyFill = theme.palette.mode === 'dark' ? theme.palette.background.default : '#eee';
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return (
    <>
      <svg style={{ position: 'absolute', top: 1000, left: 1000 }}>
        <defs>
          <marker
            id={id}
            viewBox="0 0 40 40"
            markerHeight={70}
            markerWidth={70}
            refX={12}
            refY={8}
            orient={getMarkerRotation(sourcePosition)}
            fill="none"
            stroke={edgeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </marker>
        </defs>
      </svg>
      <BaseEdge
        path={edgePath}
        style={{ strokeDasharray: '5, 5' }}
        markerStart={`url(#${id})`}
      />
    </>
  );
}

function DependencyEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const theme = useTheme();
  const edgeColor = theme.palette.mode === 'dark' ? '#b1b1b7' : '#555';
  const emptyFill = theme.palette.mode === 'dark' ? theme.palette.background.default : '#eee';
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const [open, setOpen] = useState(false);
  return (
    <>
      {selected && (
        <EdgeLabelRenderer>
          <RelationshipToolBar
            labelX={labelX}
            labelY={labelY}
            id={id}
            openEditModal={() => setOpen(true)}
          />
        </EdgeLabelRenderer>
      )}
      <DependencyEdgeView
        sourceX={sourceX}
        sourceY={sourceY}
        targetX={targetX}
        targetY={targetY}
        sourcePosition={sourcePosition}
        targetPosition={targetPosition}
        id={id}
        source={source}
        target={target}
      />
      <RelationshipEditModal
        open={open}
        handleClose={() => setOpen(false)}
        id={id}
        relationshipType="Dependency"
      />
    </>
  );
}

export default DependencyEdge;
