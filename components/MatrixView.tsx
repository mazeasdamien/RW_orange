import React, { useState } from 'react';
import { AnalyzedPaper } from '../types';
import { X, Check } from 'lucide-react';

interface MatrixViewProps {
    papers: AnalyzedPaper[];
    onEdit: (paper: AnalyzedPaper) => void;
}

export const MatrixView: React.FC<MatrixViewProps> = ({ papers, onEdit }) => {
    const completedPapers = papers.filter(p => p.status === 'complete' && p.data);

    if (completedPapers.length === 0) {
        return (
            <div className="text-center py-20 text-slate-500">
                No completed papers to display in matrix view.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 font-bold text-slate-900 sticky left-0 bg-slate-50 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Paper</th>
                        <th className="px-6 py-3 min-w-[200px]">Problem & Gap</th>
                        <th className="px-6 py-3 min-w-[150px]">Paradigm</th>
                        <th className="px-6 py-3 min-w-[150px]">Embodiment</th>
                        <th className="px-6 py-3 min-w-[150px]">Input</th>
                        <th className="px-6 py-3 min-w-[150px]">Autonomy</th>
                        <th className="px-6 py-3 min-w-[120px]">Sample Size</th>
                        <th className="px-6 py-3 min-w-[300px]">Key Finding</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {completedPapers.map((paper) => {
                        const data = paper.data!;
                        return (
                            <tr key={paper.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] align-top">
                                    <div className="font-bold text-indigo-600 mb-1">{data.citationKey}</div>
                                    <div className="text-xs text-slate-500 font-normal line-clamp-2 mb-2" title={data.title}>{data.title}</div>
                                    <button
                                        onClick={() => onEdit(paper)}
                                        className="text-[10px] text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                                    >
                                        Edit Metadata
                                    </button>
                                </td>
                                <td className="px-6 py-4 align-top">
                                    <div className="mb-2">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Problem</span>
                                        <p className="text-slate-700 line-clamp-3" title={data.categoryA.coreProblem}>{data.categoryA.coreProblem}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gap</span>
                                        <p className="text-slate-600 text-xs line-clamp-2" title={data.categoryA.gapClaim}>{data.categoryA.gapClaim}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 align-top">{data.categoryB.interactionParadigm}</td>
                                <td className="px-6 py-4 text-slate-600 align-top">{data.categoryB.embodimentType}</td>
                                <td className="px-6 py-4 text-slate-600 align-top">{data.categoryB.inputModality}</td>
                                <td className="px-6 py-4 text-slate-600 align-top">{data.categoryB.autonomyLevel}</td>
                                <td className="px-6 py-4 font-mono text-slate-600 align-top">{data.categoryD.sampleSize}</td>
                                <td className="px-6 py-4 text-slate-600 align-top">
                                    <p className="line-clamp-4" title={data.categoryE.keyFinding}>{data.categoryE.keyFinding}</p>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
