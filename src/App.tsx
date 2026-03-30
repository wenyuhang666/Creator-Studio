import { useEffect } from "react";
import { AppProviders } from "./app/AppProviders";
import { useAppStore } from "./app/store";
import { bootstrapApp } from "./app/bootstrap";
import { useProjectCommands } from "./hooks/useProjectCommands";
import { useTheme } from "./hooks/useTheme";
import MainLayout from "./layouts/MainLayout";
import { CreateProjectModal } from "./components/Project";
import { WelcomePage } from "./components/Project";

export default function App() {
  const { theme, toggle } = useTheme();
  const { currentProject, recentProjects, projectBusy, createProjectModalOpen } = useAppStore();
  const { setCreateProjectModalOpen } = useAppStore();
  const { loadRecentProjects: loadRecent, openProject, createProject, handleOpenProjectDialog, closeProject } =
    useProjectCommands();

  // 初始化应用
  useEffect(() => {
    void bootstrapApp();
    void loadRecent();
  }, []);

  return (
    <AppProviders>
      {currentProject ? (
        <>
          <MainLayout
            projectPath={currentProject.path}
            projectName={currentProject.name}
            projectBusy={projectBusy}
            theme={theme}
            onToggleTheme={toggle}
            onCreateProject={() => setCreateProjectModalOpen(true)}
            onOpenProject={() => void handleOpenProjectDialog()}
            onCloseProject={closeProject}
          />
          <CreateProjectModal
            visible={createProjectModalOpen}
            onCancel={() => setCreateProjectModalOpen(false)}
            onCreate={(name, parentPath) => void createProject(name, parentPath)}
          />
        </>
      ) : (
        <>
          <WelcomePage
            onCreateProject={() => setCreateProjectModalOpen(true)}
            onOpenProject={() => void handleOpenProjectDialog()}
            recentProjects={recentProjects}
            onOpenRecent={(path) => void openProject(path)}
          />
          <CreateProjectModal
            visible={createProjectModalOpen}
            onCancel={() => setCreateProjectModalOpen(false)}
            onCreate={(name, parentPath) => void createProject(name, parentPath)}
          />
        </>
      )}
    </AppProviders>
  );
}
