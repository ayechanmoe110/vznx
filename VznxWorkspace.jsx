import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, X, List, Users, CheckSquare, Edit, Trash2, Aperture } from 'lucide-react';

// --- Data & Persistence Utilities ---

const INITIAL_PROJECTS = [
  { id: 'p1', name: 'New Headquarters Design', status: 'In Progress', progress: 0 },
  { id: 'p2', name: 'Residential Tower 3D Mockup', status: 'Completed', progress: 100 },
  { id: 'p3', name: 'Client Presentation Prep', status: 'In Progress', progress: 0 },
];

const INITIAL_TASKS = [
  { id: 't1', projectId: 'p1', name: 'Draft Floor Plans', isComplete: false, assignedToMemberId: 'm1' },
  { id: 't2', projectId: 'p1', name: 'Review Structural Drawings', isComplete: false, assignedToMemberId: 'm2' },
  { id: 't3', projectId: 'p1', name: 'Submit for Initial Approval', isComplete: false, assignedToMemberId: 'm1' },
  { id: 't4', projectId: 'p2', name: 'Final Rendering', isComplete: true, assignedToMemberId: 'm3' },
  { id: 't5', projectId: 'p2', name: 'Model Testing', isComplete: true, assignedToMemberId: 'm3' },
  { id: 't6', projectId: 'p3', name: 'Gather Project Statistics', isComplete: false, assignedToMemberId: 'm2' },
];

const INITIAL_TEAM = [
  { id: 'm1', name: 'Alice Johnson', maxCapacity: 5 }, // Added maxCapacity
  { id: 'm2', name: 'Ben Smith', maxCapacity: 5 },    // Added maxCapacity
  { id: 'm3', name: 'Chloe Lee', maxCapacity: 4 },    // Added maxCapacity
];

const LOCAL_STORAGE_KEY = 'vznx_workspace_data';

// Helper function to safely parse local storage data
const getInitialData = (key, initialValue) => {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error("Error reading localStorage:", error);
    return initialValue;
  }
};

// Helper function to update a single key in the combined local storage object
const updateLocalStorage = (data) => {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

// --- Reusable Components ---

const ProgressBar = React.memo(({ progress, colorClass = 'bg-blue-500' }) => {
  // Ensure progress is within [0, 100] range
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${safeProgress}%` }}
      ></div>
    </div>
  );
});

const Card = ({ children, className = '' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-100 ${className}`}>
    {children}
  </div>
);

// --- Logic & State Manager Component (App) ---

const App = () => {
  // Load state from local storage or use initial data
  const [data, setData] = useState(() => {
    const storedData = getInitialData(LOCAL_STORAGE_KEY, {});
    return {
      projects: storedData.projects || INITIAL_PROJECTS,
      tasks: storedData.tasks || INITIAL_TASKS,
      teamMembers: storedData.teamMembers || INITIAL_TEAM,
      activeView: 'dashboard', // 'dashboard', 'tasks', 'team'
      selectedProjectId: null,
    };
  });

  // Persist data whenever projects, tasks, or teamMembers change
  useEffect(() => {
    updateLocalStorage({
      projects: data.projects,
      tasks: data.tasks,
      teamMembers: data.teamMembers,
    });
  }, [data.projects, data.tasks, data.teamMembers]);

  // --- Core Data Manipulation Logic ---

  // Function to calculate project progress based on tasks (BONUS)
  const calculateProjectProgress = useCallback((projectId, currentTasks) => {
    const projectTasks = currentTasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;

    const completedTasks = projectTasks.filter(t => t.isComplete).length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  }, []);

  // Update projects state with calculated progress
  const updateProjectProgress = useCallback((updatedTasks = data.tasks) => {
    setData(prevData => {
      const updatedProjects = prevData.projects.map(project => {
        const newProgress = calculateProjectProgress(project.id, updatedTasks);
        return {
          ...project,
          progress: newProgress,
          status: newProgress === 100 ? 'Completed' : 'In Progress',
        };
      });
      return { ...prevData, projects: updatedProjects };
    });
  }, [data.tasks, calculateProjectProgress]);

  // Run initial progress calculation when app loads
  useEffect(() => {
    updateProjectProgress(data.tasks);
  }, [updateProjectProgress, data.tasks]);

  // --- Handlers for Dashboard (CRUD) ---

  const handleAddProject = (name) => {
    if (!name) return;
    const newProject = {
      id: `p${Date.now()}`,
      name,
      status: 'In Progress',
      progress: 0,
    };
    setData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
  };

  const handleDeleteProject = (projectId) => {
    setData(prev => {
      const filteredProjects = prev.projects.filter(p => p.id !== projectId);
      const filteredTasks = prev.tasks.filter(t => t.projectId !== projectId);
      // Update progress for all remaining projects
      updateProjectProgress(filteredTasks);
      return { ...prev, projects: filteredProjects, tasks: filteredTasks };
    });
  };

  const handleManualUpdateProgress = (projectId, newProgress) => {
    setData(prev => {
      const updatedProjects = prev.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              progress: newProgress,
              status: newProgress === 100 ? 'Completed' : 'In Progress',
            }
          : p
      );
      return { ...prev, projects: updatedProjects };
    });
  };

  const handleViewTasks = (projectId) => {
    setData(prev => ({ ...prev, activeView: 'tasks', selectedProjectId: projectId }));
  };

  // --- Handlers for Tasks ---

  const handleToggleTask = (taskId) => {
    setData(prev => {
      const updatedTasks = prev.tasks.map(t =>
        t.id === taskId ? { ...t, isComplete: !t.isComplete } : t
      );
      // Immediately update project progress after toggling a task (BONUS)
      updateProjectProgress(updatedTasks);
      return { ...prev, tasks: updatedTasks };
    });
  };
  
  // --- Handlers for Team Members ---
  
  const handleAddTeamMember = (name, capacity) => { // Now accepts capacity
    if (!name || capacity === undefined) return;
    const newMember = {
      id: `m${Date.now()}`,
      name,
      maxCapacity: Math.max(1, capacity), // Ensure capacity is at least 1
    };
    setData(prev => ({ ...prev, teamMembers: [...prev.teamMembers, newMember] }));
  };

  const handleDeleteTeamMember = (memberId) => {
    setData(prev => {
      const updatedMembers = prev.teamMembers.filter(m => m.id !== memberId);
      // Remove all tasks assigned to the deleted member
      const updatedTasks = prev.tasks.filter(t => t.assignedToMemberId !== memberId);
      
      // Recalculate project progress based on the remaining tasks
      updateProjectProgress(updatedTasks); 
      
      return { 
          ...prev, 
          teamMembers: updatedMembers, 
          tasks: updatedTasks 
      };
    });
  };

  const handleEditTeamMember = (memberId, newName, newCapacity) => {
    setData(prev => {
      const updatedMembers = prev.teamMembers.map(m => {
        if (m.id === memberId) {
          // Ensure capacity is a positive integer
          const safeCapacity = Math.max(1, parseInt(newCapacity) || 1);
          return {
            ...m,
            name: newName.trim(),
            maxCapacity: safeCapacity,
          };
        }
        return m;
      });
      return { ...prev, teamMembers: updatedMembers };
    });
  };

  // --- Navigation Component ---

  const Sidebar = () => (
    <nav className="p-4 space-y-2 bg-white border-r border-gray-200">
      <div className="flex items-center justify-center p-3 mb-6 font-mono text-xl font-bold text-gray-800 bg-gray-50 rounded-lg">
        VZNX
      </div>

      <button
        onClick={() => setData(prev => ({ ...prev, activeView: 'dashboard', selectedProjectId: null }))}
        className={`flex items-center w-full p-3 rounded-xl text-sm transition-colors ${
          data.activeView === 'dashboard'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <List className="w-5 h-5 mr-3" />
        Project Dashboard
      </button>

      <button
        onClick={() => setData(prev => ({ ...prev, activeView: 'team', selectedProjectId: null }))}
        className={`flex items-center w-full p-3 rounded-xl text-sm transition-colors ${
          data.activeView === 'team'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Users className="w-5 h-5 mr-3" />
        Team Overview
      </button>

      {data.activeView === 'tasks' && (
        <button
          onClick={() => setData(prev => ({ ...prev, activeView: 'tasks' }))}
          className="flex items-center w-full p-3 text-sm text-white bg-blue-700 rounded-xl shadow-md"
        >
          <Aperture className="w-5 h-5 mr-3" />
          Current Project Tasks
        </button>
      )}
    </nav>
  );

  // --- View Selector ---

  const renderContent = () => {
    switch (data.activeView) {
      case 'tasks':
        // Ensure we have a valid project selected when viewing tasks
        const project = data.projects.find(p => p.id === data.selectedProjectId);
        if (!project) return <div className="p-8 text-center text-gray-500">Project not found or invalid selection.</div>;
        return (
          <TaskList
            project={project}
            tasks={data.tasks.filter(t => t.projectId === project.id)}
            teamMembers={data.teamMembers}
            onToggleTask={handleToggleTask}
            onBack={() => setData(prev => ({ ...prev, activeView: 'dashboard', selectedProjectId: null }))}
          />
        );
      case 'team':
        return <TeamOverview 
          tasks={data.tasks} 
          teamMembers={data.teamMembers} 
          onAddTeamMember={handleAddTeamMember}
          onDeleteTeamMember={handleDeleteTeamMember}
          onEditTeamMember={handleEditTeamMember} // Pass the new edit handler
        />;
      case 'dashboard':
      default:
        return (
          <ProjectDashboard
            projects={data.projects}
            onAddProject={handleAddProject}
            onDeleteProject={handleDeleteProject}
            onManualUpdateProgress={handleManualUpdateProgress}
            onViewTasks={handleViewTasks}
          />
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 p-8 overflow-y-auto">
        <h1 className="mb-8 text-3xl font-extrabold text-gray-900">
          {data.activeView === 'dashboard' && 'Project Dashboard'}
          {data.activeView === 'tasks' && 'Project Task List'}
          {data.activeView === 'team' && 'Team Overview'}
        </h1>
        {renderContent()}
      </main>
    </div>
  );
};

// --- Project Dashboard Component ---

const ProjectDashboard = ({ projects, onAddProject, onDeleteProject, onManualUpdateProgress, onViewTasks }) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editProgress, setEditProgress] = useState(0);

  const handleStartEdit = (project) => {
    setEditingId(project.id);
    setEditProgress(project.progress);
  };

  const handleSaveEdit = (projectId) => {
    onManualUpdateProgress(projectId, editProgress);
    setEditingId(null);
  };

  return (
    <>
      <Card className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Add New Project</h2>
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Enter new project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => {
              onAddProject(newProjectName);
              setNewProjectName('');
            }}
            className="flex items-center px-4 py-3 text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600 transition duration-150"
          >
            <Plus className="w-5 h-5 mr-1" /> Add Project
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-6 text-gray-700">Active Projects ({projects.length})</h2>
        <div className="space-y-4">
          {projects.length === 0 ? (
            <p className="text-gray-500">No projects found. Start by adding one!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <div key={project.id} className="p-5 border border-gray-200 rounded-xl bg-gray-50 hover:shadow-lg transition duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-800 truncate">{project.name}</h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      project.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {project.status}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500 mb-1">Progress: {project.progress}%</p>
                    <ProgressBar progress={project.progress} colorClass={project.progress === 100 ? 'bg-green-500' : 'bg-blue-500'} />
                  </div>

                  <div className="space-y-2">
                    {editingId === project.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editProgress}
                          onChange={(e) => setEditProgress(parseInt(e.target.value) || 0)}
                          className="w-20 p-1 border border-gray-300 rounded-lg text-center text-sm"
                        />
                        <button
                          onClick={() => handleSaveEdit(project.id)}
                          className="px-3 py-1 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onViewTasks(project.id)}
                          className="flex-1 flex items-center justify-center py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition"
                        >
                          <List className="w-4 h-4 mr-1" /> View Tasks
                        </button>
                        <button
                          onClick={() => handleStartEdit(project)}
                          title="Edit Progress"
                          className="p-2 text-gray-600 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteProject(project.id)}
                          title="Delete Project"
                          className="p-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

// --- Task List Component ---

const TaskList = ({ project, tasks, teamMembers, onToggleTask, onBack }) => {
  const getMemberName = (id) => teamMembers.find(m => m.id === id)?.name || 'Unassigned';

  const completedCount = tasks.filter(t => t.isComplete).length;
  const totalCount = tasks.length;

  return (
    <Card>
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
        <button
          onClick={onBack}
          className="flex items-center px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
        >
          <X className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>
      </div>

      <div className="mb-6">
        <p className="text-lg font-medium text-gray-600 mb-2">
          Completion: {completedCount} / {totalCount} Tasks
        </p>
        <ProgressBar progress={project.progress} colorClass={project.progress === 100 ? 'bg-green-500' : 'bg-blue-500'} />
      </div>

      <h3 className="text-xl font-semibold mb-4 text-gray-700">Tasks</h3>
      {tasks.length === 0 ? (
        <p className="text-gray-500">No tasks assigned yet for this project.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                task.isComplete ? 'bg-green-50 border-l-4 border-green-400' : 'bg-white border border-gray-200'
              }`}
              onClick={() => onToggleTask(task.id)}
            >
              <div className="flex items-center">
                <button
                  className={`mr-3 p-1 rounded-full border transition-colors ${
                    task.isComplete ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-400 text-gray-400'
                  }`}
                  aria-label={task.isComplete ? "Mark incomplete" : "Mark complete"}
                >
                  <CheckSquare className="w-5 h-5" />
                </button>
                <span className={`text-gray-800 ${task.isComplete ? 'line-through text-gray-500 italic' : 'font-medium'}`}>
                  {task.name}
                </span>
              </div>
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {getMemberName(task.assignedToMemberId)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// --- Team Overview Component (with Capacity Bonus) ---

const TeamOverview = ({ tasks, teamMembers, onAddTeamMember, onDeleteTeamMember, onEditTeamMember }) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberCapacity, setNewMemberCapacity] = useState(5); // State for new capacity input
  
  // State for inline editing
  const [editingMemberId, setEditingMemberId] = useState(null); // ID of the member currently being edited
  const [editName, setEditName] = useState('');                 // Value for the name input
  const [editCapacity, setEditCapacity] = useState('');         // Value for the capacity input

  const teamData = useMemo(() => {
    return teamMembers.map(member => {
      const assignedTasks = tasks.filter(t => t.assignedToMemberId === member.id);
      const openTasks = assignedTasks.filter(t => !t.isComplete).length;
      
      // Use member's specific capacity, defaulting to 5 if not set
      const maxCapacity = member.maxCapacity || 5; 
      
      // Calculate capacityPct based on member's maxCapacity
      // Use Math.min(100, ...) to cap the progress bar at 100% display, even if workload is higher
      const capacityPct = Math.min(100, Math.round((openTasks / maxCapacity) * 100));

      let colorClass = 'bg-green-500';
      // Use openTasks > maxCapacity for critical red status, even if capacityPct calculation overflows past 100
      if (openTasks > maxCapacity || capacityPct > 90) { 
        colorClass = 'bg-red-500'; 
      } else if (capacityPct > 50) {
        colorClass = 'bg-orange-500'; // Moderate workload
      }
      
      return {
        ...member,
        openTasks,
        capacityPct,
        maxCapacity, // Include calculated maxCapacity for display
        colorClass,
      };
    });
  }, [tasks, teamMembers]);

  const handleAddMemberClick = () => {
    // Ensure capacity is a valid number, defaulting to 5 if empty/invalid
    const safeCapacity = parseInt(newMemberCapacity) > 0 ? parseInt(newMemberCapacity) : 5;
    
    if (newMemberName.trim()) {
        onAddTeamMember(newMemberName.trim(), safeCapacity); // Pass capacity
        setNewMemberName('');
        setNewMemberCapacity(5); // Reset capacity input
    }
  };
  
  // Handlers for editing
  const handleStartEdit = (member) => {
    setEditingMemberId(member.id);
    setEditName(member.name);
    setEditCapacity(member.maxCapacity);
  };

  const handleSaveEdit = () => {
    if (editName.trim() && parseInt(editCapacity) > 0) {
      onEditTeamMember(editingMemberId, editName, editCapacity);
      setEditingMemberId(null); // Exit edit mode
    }
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null); // Exit edit mode
  };


  return (
    <>
      {/* New Member Addition Card with Capacity Input */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Add New Team Member</h2>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <input
            type="text"
            placeholder="Full Name"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
          {/* New Capacity Input */}
          <input
            type="number"
            min="1"
            placeholder="Capacity (1+)"
            value={newMemberCapacity}
            onChange={(e) => setNewMemberCapacity(parseInt(e.target.value) || '')}
            className="w-full sm:w-32 p-3 border border-gray-300 rounded-lg text-center focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleAddMemberClick}
            className="flex items-center justify-center px-4 py-3 text-white bg-indigo-500 rounded-lg shadow-md hover:bg-indigo-600 transition duration-150"
          >
            <Plus className="w-5 h-5 mr-1" /> Add Member
          </button>
        </div>
      </Card>
      
      {/* Existing Team Overview Card */}
      <Card>
        <h2 className="text-xl font-semibold mb-6 text-gray-700">Team Capacity and Workload</h2>
        <div className="space-y-6">
          {teamData.map(member => (
            <div key={member.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50">
              
              {editingMemberId === member.id ? (
                // --- Edit Mode UI ---
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-800">Editing {member.name}</h3>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Member Name"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">Max Capacity:</span>
                    <input
                      type="number"
                      min="1"
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(parseInt(e.target.value) || 1)}
                      className="w-20 p-2 border border-gray-300 rounded-lg text-center text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-500">tasks</span>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition"
                      disabled={!editName.trim() || parseInt(editCapacity) < 1}
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

              ) : (
                // --- Display Mode UI ---
                <>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-lg font-bold text-gray-800">{member.name}</span>
                    <div className="flex space-x-2">
                        {/* Edit Button - New! */}
                        <button
                            onClick={() => handleStartEdit(member)}
                            title="Edit Member Details"
                            className="p-2 text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        {/* Delete Button */}
                        <button
                            onClick={() => onDeleteTeamMember(member.id)}
                            title="Delete Member (removes assigned tasks)"
                            className="p-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600 font-medium">
                      {member.openTasks} Open Tasks
                    </span>
                    <span className="text-sm text-gray-500">
                        Max Capacity: <strong className="text-gray-700">{member.maxCapacity}</strong> tasks
                    </span>
                  </div>
                  
                  <ProgressBar progress={member.capacityPct} colorClass={member.colorClass} />
                  
                  {/* Over Capacity Warning */}
                  {member.openTasks > member.maxCapacity && (
                      <p className="mt-2 text-sm text-red-600 font-semibold">
                          ⚠️ OVER CAPACITY ({member.openTasks - member.maxCapacity} tasks over limit)
                      </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};

export default App;