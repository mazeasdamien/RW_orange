import React, { useState, useCallback } from 'react';
import { Upload, Download, BookOpen, Sparkles, Github, Database } from 'lucide-react';
import { PaperCard } from './components/PaperCard';
import { AnalyzedPaper } from './types';
import { analyzePaperWithGemini } from './services/geminiService';

const App: React.FC = () => {
  const [papers, setPapers] = useState<AnalyzedPaper[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

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

    const newId = crypto.randomUUID();
    const newPaper: AnalyzedPaper = {
      id: newId,
      fileName: file.name,
      status: 'analyzing',
      uploadDate: Date.now(),
    };

    setPapers(prev => [newPaper, ...prev]);

    try {
      // Convert file to Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data:application/pdf;base64, prefix
            const base64Clean = result.split(',')[1];
            resolve(base64Clean);
        };
        reader.onerror = error => reject(error);
      });

      const analysis = await analyzePaperWithGemini(base64);

      setPapers(prev => prev.map(p => 
        p.id === newId ? { ...p, status: 'complete', data: analysis } : p
      ));

    } catch (error) {
      console.error("Analysis Failed", error);
      setPapers(prev => prev.map(p => 
        p.id === newId ? { ...p, status: 'error', errorMsg: error instanceof Error ? error.message : "Unknown error" } : p
      ));
    }
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

  const handleExport = () => {
    const completePapers = papers
      .filter(p => p.status === 'complete' && p.data)
      .map(p => p.data);
    
    if (completePapers.length === 0) {
      alert("No completed analyses to export.");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(completePapers, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "hri_literature_review.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white py-6 px-8 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">HRI Researcher Assistant</h1>
              <p className="text-slate-400 text-sm">Ambient Physical Telementoring Paper Analyzer</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden md:block">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Powered by</div>
                <div className="flex items-center space-x-1 text-indigo-400 font-semibold">
                    <Sparkles size={14} /> <span>Gemini 2.5 Flash</span>
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls & Upload */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Upload Zone */}
            <div 
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-300'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <Upload size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Upload Research Paper</h3>
              <p className="text-slate-500 text-sm mb-6">Drag & drop your PDF here or click to browse.</p>
              
              <label className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors shadow-sm">
                <span>Select PDF</span>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Stats/Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                <Database size={18} className="mr-2 text-indigo-500" /> 
                Database Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-slate-600">Total Papers</span>
                    <span className="font-bold text-slate-900">{papers.length}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-slate-600">Completed</span>
                    <span className="font-bold text-green-600">{papers.filter(p => p.status === 'complete').length}</span>
                </div>
                <button 
                  onClick={handleExport}
                  disabled={papers.filter(p => p.status === 'complete').length === 0}
                  className="w-full mt-2 flex items-center justify-center space-x-2 border border-slate-300 text-slate-700 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Instructions/Help */}
            <div className="bg-indigo-900 rounded-xl p-6 text-indigo-100">
              <h4 className="font-bold text-white mb-2">Research Lens</h4>
              <p className="text-sm opacity-90 mb-4">
                The AI is configured to analyze papers specifically for <strong>Ambient Physical Telementoring</strong>.
              </p>
              <ul className="text-xs space-y-2 opacity-80 list-disc list-inside">
                <li>Extracts Core Problems & "Villains"</li>
                <li>Classifies Embodiment & Autonomy</li>
                <li>Identifies Hardware Specs</li>
                <li>Summarizes Key Findings</li>
              </ul>
            </div>
          </div>

          {/* Right Column: List */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Analyzed Papers</h2>
              <span className="text-sm text-slate-500">{papers.length} documents</span>
            </div>

            {papers.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <BookOpen size={40} />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No papers analyzed yet</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Upload a PDF to begin extracting structured data for your literature review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {papers.map(paper => (
                  <PaperCard 
                    key={paper.id} 
                    paper={paper} 
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
