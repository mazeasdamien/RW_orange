import React, { useState } from 'react';
import { AnalyzedPaper, PaperAnalysis } from '../types';
import { CheckCircle2, Circle, AlertTriangle, BookOpen, Search, Copy, Check } from 'lucide-react';

interface DashboardViewProps {
    papers: AnalyzedPaper[];
}

const SearchQuery: React.FC<{ query: string }> = ({ query }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(query);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            onClick={handleCopy}
            className="group flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200 hover:bg-white hover:border-indigo-300 cursor-pointer transition-all"
            title="Click to copy"
        >
            <code className="text-[10px] font-mono text-indigo-700 break-all mr-2">
                {query}
            </code>
            <div className="shrink-0 text-slate-400 group-hover:text-indigo-600">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </div>
        </div>
    );
};

const TargetCard: React.FC<{
    title: string;
    description: string;
    papersFound: number;
    requiredFor: string;
    keywords: string[];
    status: 'critical' | 'warning' | 'good';
}> = ({ title, description, papersFound, requiredFor, keywords, status }) => {
    const colors = {
        critical: 'bg-red-50 border-red-200 text-red-900',
        warning: 'bg-amber-50 border-amber-200 text-amber-900',
        good: 'bg-green-50 border-green-200 text-green-900',
    };

    const iconColors = {
        critical: 'text-red-500',
        warning: 'text-amber-500',
        good: 'text-green-500',
    };

    return (
        <div className={`p-5 rounded-xl border ${colors[status]} relative overflow-hidden transition-all hover:shadow-md`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-bold text-lg flex items-center gap-2">
                        {status === 'good' ? <CheckCircle2 size={20} className={iconColors.good} /> :
                            status === 'warning' ? <AlertTriangle size={20} className={iconColors.warning} /> :
                                <Circle size={20} className={iconColors.critical} />}
                        {title}
                    </h4>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mt-1">{requiredFor}</p>
                </div>
                <div className="text-2xl font-bold opacity-80">{papersFound}</div>
            </div>

            <p className="text-sm mb-4 opacity-90">{description}</p>

            <div className="bg-white/50 p-3 rounded-lg backdrop-blur-sm">
                <div className="text-xs font-bold mb-1 opacity-70">Keywords detected:</div>
                <div className="flex flex-wrap gap-1">
                    {keywords.map(k => (
                        <span key={k} className="px-2 py-0.5 bg-white rounded text-[10px] font-medium border border-gray-100 shadow-sm">
                            {k}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ papers }) => {
    const completedPapers = papers.filter(p => p.status === 'complete' && p.data).map(p => p.data!);

    // Helper to count matches
    const countMatches = (predicate: (p: PaperAnalysis) => boolean) => completedPapers.filter(predicate).length;
    const checkAuthors = (names: string[]) => completedPapers.filter(p =>
        p.authors?.some(a => names.some(n => a.toLowerCase().includes(n.toLowerCase())))
    ).length;

    // Analysis Logic for the user's specific thesis
    // Analysis Logic for the user's specific CHI paper structure
    const targets = [
        {
            title: "1. Intro: Semantic Telepresence",
            description: "Broad context: Teleoperation history, fatigue issues, and the shift to semantic control.",
            requiredFor: "Introduction & Concept",
            keywords: ["fatigue", "cognitive load", "teleoperation", "isolation", "direct control", "2d video"],
            count: countMatches(p => {
                const text = (p.categoryA.coreProblem + p.categoryA.gapClaim + p.categoryE.relevanceToTelementoring).toLowerCase();
                return text.includes('fatigue') || text.includes('load') || (text.includes('direct') && text.includes('control'));
            }),
            target: 15
        },
        {
            title: "2. Design: Hesitation & Taxonomy",
            description: "Related Work: Social signal processing, classification of robot gestures, non-verbal comm.",
            requiredFor: "Design Space & Taxonomy",
            keywords: ["hesitation", "uncertainty", "social signal", "taxonomy", "show", "alert", "encourage"],
            count: countMatches(p => {
                const text = (p.categoryB.socialGestures + p.categoryA.keyDefinitions).toLowerCase();
                return text.includes('hesitation') || text.includes('uncertainty') || text.includes('signal');
            }),
            target: 15
        },
        {
            title: "3. Impl: VLM Text-to-Motion",
            description: "Technical Background: LLMs in robotics, generative motion, lightweight control architectures.",
            requiredFor: "System Implementation",
            keywords: ["vlm", "gpt", "text-to-motion", "parameter", "generative", "sota", "llm"],
            count: countMatches(p => {
                const text = (p.categoryB.motionGeneration + p.categoryC.algorithmModel).toLowerCase();
                return (text.includes('vlm') || text.includes('llm') || text.includes('gpt')) && text.includes('motion');
            }),
            target: 20
        },
        {
            title: "4. Eval: Avatar vs AR",
            description: "Methodology: Previous comparisons of AR/VR, remote guidance user studies, NASA-TLX baselines.",
            requiredFor: "User Study & Evaluation",
            keywords: ["ar", "augmented reality", "hololens", "nasa-tlx", "trust", "comparison", "baseline"],
            count: countMatches(p => {
                const text = (p.categoryD.dependentVariables + p.categoryD.independentVariables + p.categoryD.studyDesign).toLowerCase();
                return text.includes('ar') || text.includes('augmented') || text.includes('hololens') || text.includes('nasa-tlx');
            }),
            target: 20
        }
    ];

    const keyAuthors = [
        { name: "Fitter", topic: "Telepresence Fatigue" },
        { name: "Schmidt-Wolf", topic: "Hesitation Signals" },
        { name: "Roy", topic: "GPT Gestures" },
        { name: "Wang", topic: "CoRI / VLM Control" },
        { name: "Gaebert", topic: "Evaluation Metrics" }
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Top Level Status */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">


                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {targets.map((t, idx) => (
                        <TargetCard
                            key={idx}
                            title={t.title}
                            description={t.description}
                            papersFound={t.count}
                            requiredFor={t.requiredFor}
                            keywords={t.keywords}
                            status={t.count >= t.target ? 'good' : t.count > 0 ? 'warning' : 'critical'}
                        />
                    ))}
                </div>
            </div>

            {/* Recommendations Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                        <Search size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Citation Strategy (Goal: 70)</h3>
                        <p className="text-slate-500 text-sm">You currently have {papers.length} papers. You need {Math.max(0, 70 - papers.length)} more.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sort by urgency (percentage complete) */}
                    {[...targets].sort((a, b) => (a.count / a.target) - (b.count / b.target)).map((t, idx) => {
                        const isComplete = t.count >= t.target;
                        return (
                            <div key={idx} className={`p-4 rounded-xl border transition-all ${isComplete ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-red-200 shadow-md ring-1 ring-red-50'}`}>
                                <h5 className="font-bold text-slate-800 mb-2 flex justify-between items-center">
                                    <span className={isComplete ? 'text-slate-500' : 'text-red-700'}>{t.title}</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${isComplete ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                        {t.count} found (Aim: {t.target})
                                    </span>
                                </h5>
                                {isComplete ? (
                                    <div className="text-xs text-slate-500 italic">
                                        Section covered. To hit 70 citations, look for recent (2024-2025) papers citing these works.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Gap Detected - Copy Search:</div>
                                        <SearchQuery query={`(site:acm.org OR site:ieee.org) AND "${t.keywords[0]}" AND "${t.keywords[1]}" AND "HRI"`} />
                                        <SearchQuery query={`"${t.keywords[2]}" AND "${t.keywords[3] || 'robot'}"`} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

        </div >
    );
};
