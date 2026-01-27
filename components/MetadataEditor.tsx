import React, { useState } from 'react';
import { PaperAnalysis } from '../types';
import { X, Save, RefreshCw } from 'lucide-react';

interface MetadataEditorProps {
    paper: PaperAnalysis;
    onSave: (updated: PaperAnalysis) => void;
    onCancel: () => void;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ paper, onSave, onCancel }) => {
    const [formData, setFormData] = useState<PaperAnalysis>({ ...paper });
    const [isFetching, setIsFetching] = useState(false);

    const handleChange = (field: keyof PaperAnalysis, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAuthorsChange = (value: string) => {
        // Split by comma or semicolon
        const authors = value.split(/[,;]\s*/).map(a => a.trim()).filter(a => a);
        setFormData(prev => ({ ...prev, authors }));
    }

    const handleFetchDoi = async () => {
        if (!formData.doi) return;

        setIsFetching(true);
        try {
            const cleanDoi = formData.doi.replace(/^doi:/i, '').trim();
            const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);

            if (!response.ok) {
                alert("Could not find metadata for this DOI.");
                setIsFetching(false);
                return;
            }

            const data = await response.json();
            const work = data.message;

            setFormData(prev => ({
                ...prev,
                title: work.title?.[0] || prev.title,
                authors: work.author?.map((a: any) => `${a.family}, ${a.given}`) || prev.authors,
                journal: work['container-title']?.[0] || prev.journal,
                year: work.published?.['date-parts']?.[0]?.[0]?.toString() || prev.year,
                volume: work.volume || prev.volume,
                issue: work.issue || prev.issue,
                abstract: work.abstract ? work.abstract.replace(/<[^>]*>?/gm, '') : prev.abstract,
            }));
        } catch (e) {
            console.error("Fetch failed", e);
            alert("Failed to fetch metadata.");
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-900">Edit Bibliographic Data</h3>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">

                    <div className="bg-indigo-50 p-4 rounded-lg mb-4 border border-indigo-100">
                        <label className="block text-sm font-bold text-indigo-900 mb-2">Auto-Fill from DOI</label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={formData.doi || ''}
                                onChange={e => handleChange('doi', e.target.value)}
                                placeholder="Paste DOI here (e.g., 10.1145/3290605.3300233)"
                                className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                            />
                            <button
                                onClick={handleFetchDoi}
                                disabled={isFetching || !formData.doi}
                                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                            >
                                {isFetching ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                <span>Fetch Data</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => handleChange('title', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                            <input
                                type="text"
                                value={formData.year || ''}
                                onChange={e => handleChange('year', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Journal / Conference</label>
                            <input
                                type="text"
                                value={formData.journal || ''}
                                onChange={e => handleChange('journal', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Authors</label>
                        <div className="border border-slate-300 rounded-lg p-3 space-y-2 bg-white">
                            {/* Display existing authors as tags */}
                            <div className="flex flex-wrap gap-2">
                                {formData.authors?.map((author, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium border border-indigo-200">
                                        <span>{author}</span>
                                        <button
                                            onClick={() => {
                                                const newAuthors = formData.authors.filter((_, i) => i !== idx);
                                                setFormData(prev => ({ ...prev, authors: newAuthors }));
                                            }}
                                            className="ml-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-200 rounded-full p-0.5"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Input to add new author */}
                            <input
                                type="text"
                                placeholder="Add author (LastName, FirstName) - press Enter"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const newAuthor = e.currentTarget.value.trim();
                                        if (newAuthor) {
                                            setFormData(prev => ({
                                                ...prev,
                                                authors: [...(prev.authors || []), newAuthor]
                                            }));
                                            e.currentTarget.value = '';
                                        }
                                    }
                                }}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                            <p className="text-xs text-slate-500">Format: LastName, FirstName (e.g., "Smith, John")</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Volume</label>
                            <input
                                type="text"
                                value={formData.volume || ''}
                                onChange={e => handleChange('volume', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Issue</label>
                            <input
                                type="text"
                                value={formData.issue || ''}
                                onChange={e => handleChange('issue', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Abstract</label>
                        <textarea
                            value={formData.abstract || ''}
                            onChange={e => handleChange('abstract', e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50 rounded-b-xl">
                    <button onClick={onCancel} className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => onSave(formData)} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2">
                        <Save size={18} />
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
