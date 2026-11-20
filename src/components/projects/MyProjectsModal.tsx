'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  FolderKanban,
  X,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Layers,
  Box,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface CloudProjectRow {
  id: string;
  user_id: string;
  name: string;
  floorplan_data: Record<string, unknown>;
  updated_at: string;
}

interface MyProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyProjectsModal: React.FC<MyProjectsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const {
    currentProjectId,
    loadProjectData,
    createNewProject,
    setCurrentProjectId,
  } = useFloorplanStore();
  const { language } = usePreferencesStore();

  const [projects, setProjects] = useState<CloudProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    setError(null);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setProjects((data as CloudProjectRow[]) || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading projects');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setLoading(true);
        fetchProjects();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchProjects]);

  const handleOpenProject = (project: CloudProjectRow) => {
    loadProjectData({
      id: project.id,
      name: project.name,
      floorplan_data: project.floorplan_data,
      updated_at: project.updated_at,
    });
    onClose();
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`${getTranslation(language, 'confirmDelete')} "${name}"`)) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) {
        alert(`${getTranslation(language, 'saveError')}: ${error.message}`);
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (currentProjectId === id) {
          setCurrentProjectId(null);
        }
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateNew = () => {
    createNewProject(
      language === 'uz' ? 'Yangi Me’moriy Loyiha' : 'Новый Архитектурный Проект'
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {getTranslation(language, 'myProjectsTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getTranslation(language, 'myProjectsSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNew}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{getTranslation(language, 'newProject')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/80">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-cyan-500 mb-3" />
              <p className="text-xs">{getTranslation(language, 'savingProject')}</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {getTranslation(language, 'noProjectsYet')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {getTranslation(language, 'noProjectsHint')}
              </p>
              <button
                onClick={handleCreateNew}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation(language, 'newProject')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {projects.map((project) => {
                const isCurrent = currentProjectId === project.id;
                const data = project.floorplan_data || {};
                const wallCount = Array.isArray(data.walls) ? data.walls.length : 0;
                const furnCount = Array.isArray(data.furniture) ? data.furniture.length : 0;
                const updatedDate = new Date(project.updated_at).toLocaleDateString(
                  language === 'uz' ? 'uz-UZ' : 'ru-RU',
                  {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                );

                return (
                  <div
                    key={project.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isCurrent
                        ? 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-500/40'
                        : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {project.name}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                            {language === 'uz' ? 'Joriy' : 'Активен'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{updatedDate}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          <span>{wallCount} devor</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Box className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{furnCount} mebel</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleOpenProject(project)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{getTranslation(language, 'openProject')}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProject(project.id, project.name)}
                        disabled={deletingId === project.id}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-40 cursor-pointer"
                        title={getTranslation(language, 'deleteProject')}
                      >
                        {deletingId === project.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
