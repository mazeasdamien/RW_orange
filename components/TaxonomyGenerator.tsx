import React, { useState, useEffect } from 'react';
import { generateTaxonomyDraft } from '../services/aiService';
import { PenTool, Loader2, Copy, Check, Download, AlertCircle } from 'lucide-react';
import { AnalyzedPaper } from '../types';

interface TaxonomyGeneratorProps {
    papers: AnalyzedPaper[];
}

export const TaxonomyGenerator: React.FC<TaxonomyGeneratorProps> = ({ papers }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [generatedWithCount, setGeneratedWithCount] = useState<number>(0);

    // Get the actual list of completed analysis data
    const completedPapers = papers
        .filter(p => p.status === 'complete' && p.data)
        .map(p => p.data!);

    // Load saved draft from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('taxonomyDraft');
        const savedCount = localStorage.getItem('taxonomyDraftPaperCount');
        if (saved) {
            setResult(saved);
            setGeneratedWithCount(savedCount ? parseInt(savedCount) : 0);
        }
    }, []);

    // Check if draft is stale
    const isStale = result && generatedWithCount !== completedPapers.length;

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            // Pass the papers to the AI service
            const text = await generateTaxonomyDraft(completedPapers);
            setResult(text);
            setGeneratedWithCount(completedPapers.length);

            // Save to localStorage
            localStorage.setItem('taxonomyDraft', text);
            localStorage.setItem('taxonomyDraftPaperCount', completedPapers.length.toString());
        } catch (error) {
            console.error(error);
            alert("Failed to generate draft. Check console.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([result], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taxonomy_draft_${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Taxonomy Extraction Assistant</h2>
                        <p className="text-slate-500 mb-2">
                            Automatically extract behavioral codes and construct a taxonomy directly from your uploaded PDF collection. <br />
                            <span className="font-bold text-slate-600">Strict mode enabled: No synthetic data.</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-indigo-600 font-semibold bg-indigo-50 inline-block px-2 py-1 rounded border border-indigo-100">
                                Context: {completedPapers.length} papers analyzed
                            </p>
                            {isStale && (
                                <p className="text-xs text-amber-600 font-semibold bg-amber-50 inline-block px-2 py-1 rounded border border-amber-100 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    Draft outdated - regenerate with new papers
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all shadow-md ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/25'
                            }`}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <PenTool size={20} />}
                        {isLoading ? "Extracting..." : "Extract Taxonomy from Papers"}
                    </button>
                </div>

                {result && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Generated Draft (Markdown)</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700"
                                >
                                    <Download size={14} />
                                    Download .md
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? "Copied!" : "Copy Markdown"}
                                </button>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50/50 max-h-[600px] overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed">
                                {result}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
