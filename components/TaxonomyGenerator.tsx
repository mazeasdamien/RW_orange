import React, { useState, useEffect } from 'react';
import { generateTaxonomyDraft } from '../services/aiService';
import { PenTool, Loader2, Copy, Check, Download, AlertCircle, Eye, FileText, Trash2 } from 'lucide-react';
import { AnalyzedPaper } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TaxonomyGeneratorProps {
    papers: AnalyzedPaper[];
}

// Helper to convert legacy JSON output to Markdown
const convertJsonToMarkdown = (jsonStr: string): string => {
    try {
        if (!jsonStr.trim().startsWith('{')) return jsonStr;
        const data = JSON.parse(jsonStr);
        const analysis = data.analysis || data;

        let md = "";
        if (analysis.literature_corpus_analysis) md += `## 1. Literature Corpus Analysis\n\n${analysis.literature_corpus_analysis}\n\n`;
        if (analysis.coding_table) md += `## 2. Coding Table\n\n${analysis.coding_table}\n\n`;
        if (analysis.hesitate_argument) md += `## 3. The "Hesitate" Argument\n\n${analysis.hesitate_argument}\n\n`;
        if (analysis.references) md += `## 4. References\n\n${analysis.references}\n\n`;

        return md || jsonStr;
    } catch (e) {
        return jsonStr;
    }
};

export const TaxonomyGenerator: React.FC<TaxonomyGeneratorProps> = ({ papers }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string>('');
    const [viewMode, setViewMode] = useState<'write' | 'preview'>('preview');
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
            // Auto-convert legacy JSON if needed
            const cleanText = convertJsonToMarkdown(saved);
            if (cleanText !== saved) {
                // Save the converted version immediately
                localStorage.setItem('taxonomyDraft', cleanText);
            }
            setResult(cleanText);
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

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear the current draft? This cannot be undone.")) {
            setResult('');
            setGeneratedWithCount(0);
            localStorage.removeItem('taxonomyDraft');
            localStorage.removeItem('taxonomyDraftPaperCount');
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
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        {/* Toolbar */}
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap gap-3 justify-between items-center">

                            {/* View Mode Toggle */}
                            <div className="flex bg-slate-200/50 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('write')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'write'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <PenTool size={14} /> Write
                                </button>
                                <button
                                    onClick={() => setViewMode('preview')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'preview'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Eye size={14} /> Preview
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleReset}
                                    className="px-3 py-1.5 rounded-md text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1.5 border border-transparent hover:border-red-100"
                                    title="Clear current draft"
                                >
                                    <Trash2 size={14} />
                                    Reset
                                </button>
                                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                                <button
                                    onClick={handleDownload}
                                    className="px-3 py-1.5 rounded-md text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors flex items-center gap-1.5"
                                >
                                    <Download size={14} />
                                    Download .md
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="px-3 py-1.5 rounded-md text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="bg-white">
                            {viewMode === 'write' ? (
                                <textarea
                                    value={result}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setResult(newValue);
                                        localStorage.setItem('taxonomyDraft', newValue);
                                    }}
                                    className="w-full h-[600px] p-6 bg-slate-50/30 font-mono text-sm text-slate-800 leading-relaxed resize-y focus:outline-none focus:ring-inset focus:ring-2 focus:ring-indigo-500/10"
                                    placeholder="Generated draft will appear here..."
                                    spellCheck={false}
                                />
                            ) : (
                                <div className="h-[600px] overflow-y-auto p-8 bg-white">
                                    <article className="prose prose-slate prose-sm max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                table: ({ node, ...props }) => <div className="overflow-x-auto my-6 border border-slate-200 rounded-lg"><table className="min-w-full divide-y divide-slate-200" {...props} /></div>,
                                                thead: ({ node, ...props }) => <thead className="bg-slate-50" {...props} />,
                                                th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider" {...props} />,
                                                td: ({ node, ...props }) => <td className="px-4 py-3 whitespace-normal text-sm text-slate-700 border-t border-slate-100 leading-relaxed" {...props} />,
                                                tr: ({ node, ...props }) => <tr className="hover:bg-slate-50/50 transition-colors" {...props} />,
                                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-slate-900 border-b pb-2 mb-6 mt-8" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-slate-800 mb-4 mt-8 flex items-center gap-2" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-slate-800 mb-3 mt-6" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 space-y-1 mb-4 text-slate-700" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-5 space-y-1 mb-4 text-slate-700" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 italic text-slate-600 bg-slate-50 rounded-r my-4" {...props} />,
                                                a: ({ node, ...props }) => <a className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2" {...props} />,
                                                code: ({ node, ...props }) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-mono text-xs font-bold border border-slate-200" {...props} />,
                                            }}
                                        >
                                            {result}
                                        </ReactMarkdown>
                                    </article>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
