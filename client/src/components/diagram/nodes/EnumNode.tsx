import axios from 'axios';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { NodeProps, useReactFlow } from 'reactflow';
import { useEntitiesDispatch } from '../../../context/EntitiesContext';
import { Enum, EnumValue } from '../../../types';
import { AlertType } from '../../alert/AlertContext';
import useAlert from '../../alert/useAlert';
import EnumModal from '../../forms/modals/EnumModal';
import Handles from './Handles';
import NodeToolBarCustom from './NodeToolBarCustom';

import { useSocket } from '../../../context/SocketContext';

import { Paper, useTheme } from '@mui/material';

export function EnumNodeView({ data }: { data: Enum }) {
  const theme = useTheme();
  const bgColor = theme.palette.mode === 'dark' ? '#3e1a1a' : '#ffcccb';

  return (
    <>
      <Handles />
      <Paper className="node" style={{ backgroundColor: bgColor }} elevation={3}>
        <div className="node-header">
          <div className="node-supertitle">{'<enumeration>'}</div>

          <div className="node-title">{data.name}</div>
        </div>
        <hr />
        <div className="node-body">
          <div className="node-attributes">
            {data.values &&
              data.values.map((constant: EnumValue) => (
                <div className="node-attribute" key={constant.id}>
                  {constant.name}
                </div>
              ))}
          </div>
        </div>
      </Paper>
    </>
  );
}

function EnumNode({ id, data }: NodeProps<Enum>) {
  const [editOpen, setEditOpen] = useState(false);
  const { emitEntityDeleted } = useSocket();

  const { setAlert } = useAlert();
  const { diagramId } = useParams();

  const { deleteElements, getNode } = useReactFlow();

  const handleDelete = () => {
    const node = getNode(id);
    if (node) {
      deleteElements({ nodes: [node] });
    }
  };

  return (
    <>
      <NodeToolBarCustom
        setEditOpen={setEditOpen}
        handleDelete={handleDelete}
      />
      <div onDoubleClick={() => setEditOpen(true)}>
        <EnumNodeView data={data} />
      </div>
      <EnumModal
        open={editOpen}
        handleClose={() => setEditOpen(false)}
        id={id}
        data={data}
      />
    </>
  );
}

export default EnumNode;
