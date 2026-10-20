import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  Tag,
  User,
  MessageSquare
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../stores/authStore';
import { TaskStatus, TaskPriority } from '@intellmeet/shared';

const COLUMNS = [
  { id: TaskStatus.TODO, title: 'To Do', color: 'border-slate-500' },
  { id: TaskStatus.IN_PROGRESS, title: 'In Progress', color: 'border-blue-500' },
  { id: TaskStatus.IN_REVIEW, title: 'In Review', color: 'border-amber-500' },
  { id: TaskStatus.DONE, title: 'Completed', color: 'border-emerald-500' }
];

export const TasksKanbanPage: React.FC = () => {
  const { workspace, user } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // New Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [newStatus, setNewStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, [workspace]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const data: any = await apiClient.get('/tasks');
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      if (workspace?.id) {
        const data: any = await apiClient.get(`/workspaces/${workspace.id}/members`);
        setMembers(data.members || []);
      }
    } catch (err) {
      // Ignore
    }
  };

  const handleMoveTask = async (taskId: string, targetStatus: TaskStatus) => {
    try {
      // Optimistic update
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, status: targetStatus } : t))
      );

      if (targetStatus === TaskStatus.DONE) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

      await apiClient.patch(`/tasks/${taskId}`, { status: targetStatus });
    } catch (err) {
      fetchTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const res: any = await apiClient.post('/tasks', {
        title: newTitle.trim(),
        description: newDescription.trim(),
        priority: newPriority,
        status: newStatus,
        assigneeId: newAssigneeId || undefined,
        dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        tags
      });

      setTasks(prev => [res.task, ...prev]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setTags([]);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'ALL' || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Project Tasks & Kanban</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize action items from meetings and track sprint execution
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/30 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Priority:</span>
          </span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* 4-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);

          return (
            <div
              key={column.id}
              className="rounded-2xl bg-slate-900/50 border border-white/10 flex flex-col max-h-[calc(100vh-250px)]"
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-white/10 flex items-center justify-between border-t-2 ${column.color}`}>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    {column.title}
                  </h3>
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-bold flex items-center justify-center">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="p-3 overflow-y-auto space-y-3 flex-1">
                {colTasks.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-slate-600 border border-dashed border-white/5 rounded-xl">
                    No tasks in {column.title.toLowerCase()}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isOverdue =
                      task.dueDate &&
                      new Date(task.dueDate) < new Date() &&
                      task.status !== TaskStatus.DONE;

                    return (
                      <div
                        key={task.id}
                        className="p-4 rounded-xl bg-slate-800/70 border border-white/10 hover:border-violet-500/40 transition shadow-sm space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              task.priority === 'URGENT'
                                ? 'bg-rose-500/20 text-rose-300'
                                : task.priority === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {task.priority}
                          </span>

                          {/* Quick Column Mover buttons */}
                          <div className="flex items-center gap-1">
                            {column.id !== TaskStatus.TODO && (
                              <button
                                onClick={() => {
                                  const idx = COLUMNS.findIndex(c => c.id === column.id);
                                  handleMoveTask(task.id, COLUMNS[idx - 1].id);
                                }}
                                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                                title="Move left"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {column.id !== TaskStatus.DONE && (
                              <button
                                onClick={() => {
                                  const idx = COLUMNS.findIndex(c => c.id === column.id);
                                  handleMoveTask(task.id, COLUMNS[idx + 1].id);
                                }}
                                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                                title="Move right"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-slate-100 leading-snug">
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Tags */}
                        {task.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {task.tags.map((tag: string, i: number) => (
                              <span
                                key={i}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Card Footer: Assignee & Due Date */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center font-bold text-[9px] text-white">
                              {task.assigneeId?.fullName?.charAt(0) || 'T'}
                            </div>
                            <span className="truncate max-w-[80px]">
                              {task.assigneeId?.fullName || 'Unassigned'}
                            </span>
                          </div>

                          {task.dueDate && (
                            <span
                              className={`flex items-center gap-1 ${
                                isOverdue ? 'text-rose-400 font-bold' : 'text-slate-500'
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-violet-400" />
                <span>Create Project Task</span>
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Audit workspace isolation queries"
                  required
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Specific requirements or details..."
                  rows={3}
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500/60"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                    <option value={TaskPriority.URGENT}>Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500/60"
                  >
                    <option value={TaskStatus.TODO}>To Do</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TaskStatus.IN_REVIEW}>In Review</option>
                    <option value={TaskStatus.DONE}>Done</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Assignee
                  </label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500/60"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500/60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
