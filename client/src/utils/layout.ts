import dagre from 'dagre';
import { Node, Edge } from 'reactflow';

/**
 * Returns updated node positions using dagre's directed graph layout algorithm.
 * Maintains parent-child relationships top-to-bottom.
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Increase node separation for UML diagrams so they don't look cramped
  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 80, 
    ranksep: 120 
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.width || 250,
      height: node.height || 150,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Map the new positions to our entity updates format
  const updates: { entityId: string; position: { x: number; y: number } }[] = [];

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Dagre returns the center of the node, but ReactFlow uses the top-left corner
    // We adjust it by subtracting half the width and height
    const x = Math.round(nodeWithPosition.x - (node.width || 250) / 2);
    const y = Math.round(nodeWithPosition.y - (node.height || 150) / 2);

    updates.push({
      entityId: node.id,
      position: { x, y }
    });
  });

  return updates;
};
