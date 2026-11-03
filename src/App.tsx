import { useState } from 'react';
import { useSongEditor } from './hooks/useSongEditor';
import { useResizableSidebar } from './hooks/useResizableSidebar';
import { TopNavbar } from './components/TopNavbar';
import { Sidebar } from './components/Sidebar';
import { CommandEditor } from './components/CommandEditor';
import { ImportModal } from './components/ImportModal';
import { ExportModal } from './components/ExportModal';
import './App.css';

export default function App() {
  const {
    nodes,
    selectedNodeId,
    selectedNode,
    setSelectedNodeId,
    addNode,
    updateNodeName,
    deleteNode,
    loadImportedSong,
    addCommand,
    updateCommand,
    deleteCommand,
    moveCommand,
  } = useSongEditor();

  const { sidebarWidth, isResizing, handleMouseDown } = useResizableSidebar();

  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  return (
    <div className="app-container">
      <TopNavbar
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        onOpenImport={() => setShowImportModal(true)}
        onOpenExport={() => setShowExportModal(true)}
      />

      <div className={`app-body ${isResizing ? 'resizing' : ''}`}>
        <div className="sidebar-wrapper" style={{ width: `${sidebarWidth}px` }}>
          <Sidebar
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onAddNode={addNode}
            onDeleteNode={deleteNode}
          />
        </div>

        <div className={`resizer ${isResizing ? 'resizing' : ''}`} onMouseDown={handleMouseDown} />

        {selectedNode ? (
          <CommandEditor
            selectedNode={selectedNode}
            nodes={nodes}
            onUpdateNodeName={(name) => updateNodeName(selectedNode.id, name)}
            onAddCommand={(type) => addCommand(selectedNode.id, type)}
            onUpdateCommand={(cmdId, fields) => updateCommand(selectedNode.id, cmdId, fields)}
            onDeleteCommand={(cmdId) => deleteCommand(selectedNode.id, cmdId)}
            onMoveCommand={(idx, dir) => moveCommand(selectedNode.id, idx, dir)}
          />
        ) : (
          <div className="main-content">Select or create a node to edit.</div>
        )}
      </div>

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={(parsedNodes, mainNodeId) => loadImportedSong(parsedNodes, mainNodeId)}
      />

      <ExportModal
        isOpen={showExportModal}
        nodes={nodes}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}
