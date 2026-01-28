import React, { useState, useCallback } from 'react';
import { Upload, Download, BookOpen, Sparkles, Github, Database, LayoutDashboard, FileText, Settings } from 'lucide-react';
import { PaperCard } from './components/PaperCard';
import { AnalyzedPaper, PaperAnalysis } from './types';
import { analyzePaper } from './services/aiService';
import { convertPapersToCSV, convertPapersToRIS, downloadFile } from './utils/exportUtils';

import { MatrixView } from './components/MatrixView';
import { MetadataEditor } from './components/MetadataEditor';
import { DashboardView } from './components/DashboardView';
import { TaxonomyGenerator } from './components/TaxonomyGenerator';
import { RelevanceChecker } from './components/RelevanceChecker';
import { AISettingsPanel } from './components/AISettingsPanel';

const App: React.FC = () => {
  // Initialize state from localStorage if available
  const [papers, setPapers] = useState<AnalyzedPaper[]>(() => {
    try {
      const saved = localStorage.getItem('hri_papers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load papers from local storage", e);
      return [];
    }
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'dashboard' | 'taxonomy'>('list');
  const [editingPaper, setEditingPaper] = useState<AnalyzedPaper | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Persist papers to localStorage whenever they change
  React.useEffect(() => {
    try {
      localStorage.setItem('hri_papers', JSON.stringify(papers));
    } catch (e) {
      console.error("Failed to save papers to local storage", e);
    }
  }, [papers]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      await processFile(file);
      // Reset input value so same file can be selected again if needed
      event.target.value = '';
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }

    // Check for duplicates
    if (papers.some(p => p.fileName === file.name)) {
      const shouldProceed = window.confirm(
        `The file "${file.name}" has already been processed or is in the list.\n\nDo you want to process it again?`
      );
      if (!shouldProceed) {
        return;
      }
    }

    // Trigger relevance check
    setPendingFile(file);
  };

  const handleAcceptPaper = async (file: File) => {
    setPendingFile(null);

    const newId = crypto.randomUUID();
    const newPaper: AnalyzedPaper = {
      id: newId,
      fileName: file.name,
      status: 'analyzing',
      uploadDate: Date.now(),
    };

    setPapers(prev => [newPaper, ...prev]);

    try {
      const analysis = await analyzePaper(file);

      setPapers(prev => {
        // Check if this analyzed paper's DOI already exists in other papers
        const isDuplicate = prev.some(p =>
          p.id !== newId &&
          p.status === 'complete' &&
          p.data?.doi && analysis.doi &&
          p.data?.doi.toLowerCase().trim() === analysis.doi.toLowerCase().trim()
        );

        return prev.map(p =>
          p.id === newId ? {
            ...p,
            status: 'complete',
            data: analysis,
            isDuplicate: isDuplicate
          } : p
        );
      });

    } catch (error) {
      console.error("Analysis Failed", error);
      setPapers(prev => prev.map(p =>
        p.id === newId ? { ...p, status: 'error', errorMsg: error instanceof Error ? error.message : "Unknown error" } : p
      ));
    }
  };

  const handleRejectPaper = () => {
    setPendingFile(null);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleRemove = (id: string) => {
    setPapers(prev => prev.filter(p => p.id !== id));
  };

  const handleEdit = (paper: AnalyzedPaper) => {
    setEditingPaper(paper);
  }

  const handleSaveEdit = (updatedData: PaperAnalysis) => {
    if (!editingPaper) return;

    // Check for DOI collision
    const duplicatePaper = papers.find(p =>
      p.id !== editingPaper.id &&
      p.data?.doi && updatedData.doi &&
      p.data.doi.toLowerCase().trim() === updatedData.doi.toLowerCase().trim()
    );

    if (duplicatePaper) {
      const confirmSave = window.confirm(
        `Duplicate Warning:\n\nThis DOI is already associated with the paper:\n"${duplicatePaper.data?.title}"\n\nDo you want to save anyway?`
      );
      if (!confirmSave) return;
    }

    setPapers(prev => prev.map(p =>
      p.id === editingPaper.id
        ? { ...p, data: updatedData, isDuplicate: false } // Clear duplicate flag if manually resolved/saved
        : p
    ));
    setEditingPaper(null);
  }

  const getCompletedPapers = () => {
    return papers
      .filter(p => p.status === 'complete' && p.data)
      .map(p => p.data!);
  }

  const handleExportJSON = () => {
    const completePapers = getCompletedPapers();
    if (completePapers.length === 0) {
      alert("No completed analyses to export.");
      return;
    }

    const dataStr = JSON.stringify(completePapers, null, 2);
    downloadFile(dataStr, "hri_literature_review.json", "text/json;charset=utf-8;");
  };

  const handleExportCSV = () => {
    const completePapers = getCompletedPapers();
    if (completePapers.length === 0) {
      alert("No completed analyses to export.");
      return;
    }
    const csvContent = convertPapersToCSV(completePapers);
    downloadFile(csvContent, "hri_literature_review.csv", "text/csv;charset=utf-8;");
  };

  const handleImportJSON = () => {
    document.getElementById('json-upload')?.click();
  };

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const importedPapers = JSON.parse(json); // Ideally validate this schema
        if (Array.isArray(importedPapers)) {
          // Confirm merge or replace? Let's assume merge for safety but warn duplicates
          const confirmReplace = window.confirm(
            "Do you want to REPLACE your current list with this backup?\n\nClick OK to Replace.\nClick Cancel to Merge (keep existing)."
          );

          if (confirmReplace) {
            setPapers(importedPapers);
          } else {
            // Merge logic: avoid ID collisions
            setPapers(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newPapers = importedPapers.filter((p: AnalyzedPaper) => !existingIds.has(p.id));
              return [...prev, ...newPapers];
            });
          }
          alert("Import successful!");
        }
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Failed to import JSON. Invalid file format.");
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset
  };

  // Backup the full application state
  const handleBackup = () => {
    const dataStr = JSON.stringify(papers, null, 2);
    downloadFile(dataStr, "hri_assistant_backup.json", "text/json;charset=utf-8;");
  };

  const handleExportRIS = () => {
    const completePapers = getCompletedPapers();
    if (completePapers.length === 0) {
      alert("No completed analyses to export.");
      return;
    }
    const risContent = convertPapersToRIS(completePapers);
    downloadFile(risContent, "hri_literature_review.ris", "application/x-research-info-systems;charset=utf-8;");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 md:px-6">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            {/* Brand */}
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
                <BookOpen className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Literature Review Assistant</h1>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <div className="flex items-center space-x-1.5 text-indigo-300">
                    <Sparkles size={12} />
                    <span>
                      {(() => {
                        const settings = localStorage.getItem('aiSettings');
                        const config = settings ? JSON.parse(settings) : { provider: 'claude' };
                        return config.provider === 'gemini' ? 'Gemini 3 Flash Preview' : 'Claude 4 Sonnet';
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <Database size={12} />
                    <span>{papers.length} papers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Actions Toolbar */}
            <div className="flex items-center space-x-4 md:space-x-6">

              {/* View Toggle */}
              <div className="bg-slate-800 p-1 rounded-lg flex space-x-1 border border-slate-700">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'list'
                    ? 'bg-slate-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  List
                </button>

                <button
                  onClick={() => setViewMode('dashboard')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'dashboard'
                    ? 'bg-slate-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <LayoutDashboard size={12} />
                  Dashboard
                </button>
                <button
                  onClick={() => setViewMode('taxonomy')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'taxonomy'
                    ? 'bg-slate-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <FileText size={12} />
                  Taxonomy
                </button>
              </div>



              {/* Exports */}
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 px-2 uppercase tracking-tight">Export</span>
                <button
                  onClick={handleExportCSV}
                  disabled={papers.filter(p => p.status === 'complete').length === 0}
                  className="px-3 py-1.5 rounded text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  disabled={papers.filter(p => p.status === 'complete').length === 0}
                  className="px-3 py-1.5 rounded text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-1"
                >
                  JSON
                </button>
                <button
                  onClick={handleExportRIS}
                  disabled={papers.filter(p => p.status === 'complete').length === 0}
                  className="px-3 py-1.5 rounded text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-1"
                  title="Export to Mendeley/Zotero"
                >
                  RIS
                </button>
              </div>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold bg-slate-700 text-slate-200 hover:bg-slate-600 transition-all"
                title="AI Model Settings"
              >
                <Settings size={14} />
                <span className="hidden sm:inline">Settings</span>
              </button>

              {/* Upload Button */}
              <label className="group relative bg-indigo-600 hover:bg-indigo-500 text-white pl-4 pr-5 py-2.5 rounded-lg cursor-pointer flex items-center space-x-2 transition-all shadow-md hover:shadow-indigo-500/25 active:scale-95">
                <Upload size={18} className="text-indigo-200 group-hover:text-white transition-colors" />
                <span className="font-semibold text-sm">Upload PDF</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="flex-1 p-6 md:p-8 relative min-h-[calc(100vh-80px)]"
        onDragOver={handleDragOver}
      >
        {/* Full Page Drop Overlay */}
        <div
          className={`fixed inset-0 bg-indigo-900/90 z-50 flex items-center justify-center transition-opacity duration-200 ${isDragOver ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
        >
          <div className="bg-white p-12 rounded-3xl shadow-2xl text-center transform scale-110">
            <div className="bg-indigo-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
              <Upload size={48} />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-2">Drop it here!</h3>
            <p className="text-slate-500 text-lg">Your PDF will be analyzed automatically.</p>
          </div>
        </div>

        {editingPaper && editingPaper.data && (
          <MetadataEditor
            paper={editingPaper.data}
            onSave={handleSaveEdit}
            onCancel={() => setEditingPaper(null)}
          />
        )}

        <div className="mx-auto max-w-[98%]">
          {papers.length === 0 ? (
            <div className="mt-20 flex flex-col items-center justify-center text-center">
              <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 max-w-lg w-full">
                <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
                  <BookOpen size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">No papers yet</h3>
                <p className="text-slate-500 mb-8 leading-relaxed">
                  Upload a research paper PDF to begin extracting structured data for your literature review.
                </p>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                  Drag & Drop anywhere to upload
                </p>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'list' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 mb-2">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Your Analysis Stream</h2>
                  </div>
                  {papers.map(paper => (
                    <PaperCard
                      key={paper.id}
                      paper={paper}
                      onRemove={handleRemove}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}



              {viewMode === 'dashboard' && (
                <DashboardView papers={papers} />
              )}
              {viewMode === 'taxonomy' && (
                <TaxonomyGenerator papers={papers} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Relevance Check Modal */}
      {pendingFile && (
        <RelevanceChecker
          file={pendingFile}
          onAccept={handleAcceptPaper}
          onReject={handleRejectPaper}
        />
      )}

      {/* AI Settings Modal */}
      {showSettings && (
        <AISettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default App;
