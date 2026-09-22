import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EntitiesProvider } from '../context/EntitiesContext';
import { RelationshipsProvider } from '../context/RelationshipsContext';
import { DiagramContents } from '../types';
import { setDocumentTitle } from '../utils';
import AddNewSpeedDial from './AddNewSpeedDial';
import { AlertType } from './alert/AlertContext';
import useAlert from './alert/useAlert';
import DiagramEditor from './diagram/DiagramEditor';
import { ReactFlowProvider } from 'reactflow';
import { SocketProvider } from '../context/SocketContext';
import { HistoryProvider } from '../context/HistoryContext';
import ActiveUsersIndicator from './ActiveUsersIndicator';
import Header from './header/Header';

import ChatPanel from './chat/ChatPanel';

function Editor() {
  // interceptor that adds auth token to every request
  const authToken = localStorage.getItem('authToken');
  axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;

  const [diagram, setDiagram] = useState<DiagramContents>();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { diagramId } = useParams();
  const { setAlert } = useAlert();

  setDocumentTitle(diagram?.name || '');

  useEffect(() => {
    const fetchDiagram = async () => {
      try {
        const res = await axios.get(`/api/diagram/${diagramId}/contents`);
        setDiagram(res.data);
      } catch (error: any) {
        if (error.response.status === 401) {
          setAlert(
            'You are not authorized to view this diagram',
            AlertType.ERROR
          );
        } else {
          setAlert(
            'Could not fetch diagram contents. Try again',
            AlertType.ERROR
          );
        }
      }
    };
    fetchDiagram();
  }, [diagramId, setAlert]);

  const handleRenameDiagram = (name: string) => {
    setDiagram({ ...(diagram as DiagramContents), name });
  };

  return (
    <EntitiesProvider>
      <RelationshipsProvider>
        <SocketProvider diagramId={diagramId}>
          <HistoryProvider>
            <div className="page">
              <Header
                name={diagram?.name}
                isEditor
                handleRename={handleRenameDiagram}
                onToggleChat={() => setIsChatOpen(!isChatOpen)}
                isChatOpen={isChatOpen}
              >
                <ActiveUsersIndicator />
              </Header>
              <ChatPanel open={isChatOpen} onClose={() => setIsChatOpen(false)} />
              <AddNewSpeedDial />
              <ReactFlowProvider>
                <DiagramEditor
                  ent={diagram?.entities || []}
                  rel={diagram?.relationships || []}
                  name={diagram?.name}
                />
              </ReactFlowProvider>
            </div>
          </HistoryProvider>
        </SocketProvider>
      </RelationshipsProvider>
    </EntitiesProvider>
  );
}

export default Editor;
