import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Tooltip } from '@mui/material';
import axios from 'axios';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useReactFlow } from 'reactflow';
import { useRelationshipsDispatch } from '../../../context/RelationshipsContext';
import { AlertType } from '../../alert/AlertContext';
import useAlert from '../../alert/useAlert';

import { useSocket } from '../../../context/SocketContext';

type Props = {
  labelX: number;
  labelY: number;
  id: string;
  openEditModal: () => void;
};

function RelationshipToolBar({ labelX, labelY, id, openEditModal }: Props) {
  const [loading, setLoading] = useState(false);

  const relationshipsDispatch = useRelationshipsDispatch();
  const { diagramId } = useParams();
  const { setAlert } = useAlert();
  const { emitRelationshipDeleted } = useSocket();

  const { deleteElements, getEdge } = useReactFlow();

  const handleDelete = () => {
    const edge = getEdge(id);
    if (edge) {
      deleteElements({ edges: [edge] });
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${labelX}px,${
          labelY - 25
        }px)`,
        fontSize: 12,
        pointerEvents: 'all',
      }}
      className="nodrag nopan"
    >
      <Tooltip title="Edit" placement="left">
        <IconButton
          aria-label="edit"
          color="primary"
          onClick={openEditModal}
          disabled={loading}
        >
          <EditIcon fontSize="large" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete" placement="right">
        <IconButton
          aria-label="delete"
          color="error"
          onClick={handleDelete}
          disabled={loading}
        >
          <DeleteIcon fontSize="large" />
        </IconButton>
      </Tooltip>
    </div>
  );
}

export default RelationshipToolBar;
