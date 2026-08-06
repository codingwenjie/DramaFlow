import React from 'react';
import { useAppStore } from './store/useAppStore';
import { useProjectStore } from './store/useProjectStore';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import TabNav from './components/TabNav';
import ProjectOverview from './components/ProjectOverview';
import ScriptEditor from './components/ScriptEditor';
import Storyboard from './components/Storyboard';
import CharacterManager from './components/CharacterManager';
import DubbingPanel from './components/DubbingPanel';
import SynthesisPanel from './components/SynthesisPanel';
import ApiConfig from './components/ApiConfig';
import PromptSkills from './components/PromptSkills';
import ErrorBoundary from './components/ErrorBoundary';
import { C } from './constants';

export { C };

export type ViewMode = 'overview' | 'workflow' | 'api-config' | 'prompt-skills';
export type WorkflowTab = 'script' | 'storyboard' | 'characters' | 'dubbing' | 'synthesis';

const App: React.FC = () => {
  const { activeView, activeTab, navigateToProject } = useAppStore();
  const { projects, addProject } = useProjectStore();

  const handleSelectProject = (id: string) => {
    navigateToProject(id);
  };

  const handleNewProject = (name: string, genre: string, scenes: number, orientation: 'vertical' | 'horizontal') => {
    const newProject = addProject(name, genre, scenes, orientation);
    navigateToProject(newProject.id);
  };

  const renderWorkflowContent = () => {
    if (activeTab === 'script') return <ScriptEditor />;
    if (activeTab === 'storyboard') return <Storyboard />;
    if (activeTab === 'characters') return <CharacterManager />;
    if (activeTab === 'dubbing') return <DubbingPanel />;
    if (activeTab === 'synthesis') return <SynthesisPanel />;
    return null;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        overflow: 'hidden',
        background: C.bg,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />

        {activeView === 'workflow' && (
          <TabNav />
        )}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <ErrorBoundary>
            {activeView === 'overview' ? (
              <ProjectOverview
                projects={projects}
                onSelectProject={handleSelectProject}
                onNewProject={handleNewProject}
              />
            ) : activeView === 'api-config' ? (
              <ApiConfig />
            ) : activeView === 'prompt-skills' ? (
              <PromptSkills />
            ) : (
              renderWorkflowContent()
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default App;
