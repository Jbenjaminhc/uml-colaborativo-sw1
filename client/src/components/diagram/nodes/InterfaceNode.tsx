import axios from 'axios';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { NodeProps, useReactFlow } from 'reactflow';
import { useEntitiesDispatch } from '../../../context/EntitiesContext';
import '../../../styles/Node.css';
import { Constant, Interface, Method } from '../../../types';
import { AlertType } from '../../alert/AlertContext';
import useAlert from '../../alert/useAlert';
import InterfaceModal from '../../forms/modals/InterfaceModal';
import Handles from './Handles';
import NodeToolBarCustom from './NodeToolBarCustom';

import { useSocket } from '../../../context/SocketContext';

import { Paper, useTheme } from '@mui/material';

export function InterfaceNodeView({ data }: { data: Interface }) {
  const theme = useTheme();
  const bgColor = theme.palette.mode === 'dark' ? '#143818' : '#b1f3b1';

  return (
    <>
      <Handles />
      <Paper className="node" style={{ backgroundColor: bgColor }} elevation={3}>
        <div className="node-header">
          <div className="node-supertitle">{'<interface>'}</div>
          <div className="node-title">{data.name}</div>
        </div>
        <hr />
        <div className="node-body">
          <div className="node-attributes">
            {data.constants &&
              data.constants.map((constant: Constant) => (
                <div className="node-attribute" key={constant.id}>
                  {`+ ${constant.name}: ${constant.type} <static>`}
                </div>
              ))}
          </div>
          <hr />
          <div className="node-methods">
            {data.methods &&
              data.methods.map((method: Method) => (
                <div className="node-method" key={method.id}>
                  {method.visibility} {method.name}(): {method.returnType}{' '}
                  {method.isStatic ? '<static>' : ''}
                </div>
              ))}
          </div>
        </div>
      </Paper>
    </>
  );
}

function InterfaceNode({ id, data }: NodeProps<Interface>) {
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
        <InterfaceNodeView data={data} />
      </div>
      <InterfaceModal
        open={editOpen}
        handleClose={() => setEditOpen(false)}
        id={id}
        data={data}
      />
    </>
  );
}

export default InterfaceNode;
