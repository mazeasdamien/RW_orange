import React, { useState } from 'react';
import { AnalyzedPaper, PaperAnalysis } from '../types';
import { CheckCircle2, Circle, AlertTriangle, BookOpen, Search, Copy, Check, RefreshCw } from 'lucide-react';
import { generateCitationStrategy } from '../services/aiService';

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
                    <h4 className="font-bold text-lg">
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
    const [refreshKey, setRefreshKey] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const [aiRecommendations, setAiRecommendations] = useState<{
        section: string;
        gap: string;
        searchQueries: string[];
    }[]>(() => {
        const saved = localStorage.getItem('aiRecommendations');
        return saved ? JSON.parse(saved) : [];
    });
    const [citationGoal, setCitationGoal] = useState(70);

    const completedPapers = papers.filter(p => p.status === 'complete' && p.data).map(p => p.data!);

    // Re-read settings on mount and whenever component re-renders
    React.useEffect(() => {
        const readSettings = () => {
            const settings = localStorage.getItem('aiSettings');
            const config = settings ? JSON.parse(settings) : { citationGoal: 70 };
            const newGoal = config.citationGoal || 70;
            console.log('📊 Dashboard reading citation goal:', newGoal);
            setCitationGoal(newGoal);
        };
        readSettings();

        // Also listen for storage events (when settings change in another tab or after reload)
        window.addEventListener('storage', readSettings);

        // Listen for custom settings changed event
        const handleSettingsChanged = () => {
            console.log('📊 Settings changed event received');
            readSettings();
        };
        window.addEventListener('settingsChanged', handleSettingsChanged);

        return () => {
            window.removeEventListener('storage', readSettings);
            window.removeEventListener('settingsChanged', handleSettingsChanged);
        };
    }, []); // Empty dependency array = only run on mount

    // Helper to count matches
    const countMatches = (predicate: (p: PaperAnalysis) => boolean) => completedPapers.filter(predicate).length;
    const checkAuthors = (names: string[]) => completedPapers.filter(p =>
        p.authors?.some(a => names.some(n => a.toLowerCase().includes(n.toLowerCase())))
    ).length;

    // Extract section targets from paper sections text, or calculate proportionally
    const getSectionTargets = () => {
        const settings = localStorage.getItem('aiSettings');
        const config = settings ? JSON.parse(settings) : { paperSections: '', citationGoal: 70 };

        // Try to extract numbers from paper sections text
        if (config.paperSections) {
            const matches = config.paperSections.match(/\((\d+)\s+papers?\)/gi);
            if (matches && matches.length >= 4) {
                const extracted = matches.map((m: string) => parseInt(m.match(/\d+/)?.[0] || '0'));
                console.log('📊 Extracted section targets:', extracted);
                return {
                    target1: extracted[0] || 15,
                    target2: extracted[1] || 15,
                    target3: extracted[2] || 20,
                    target4: extracted[3] || 20
                };
            }
        }

        // Fallback: calculate proportionally
        const target1 = Math.round(citationGoal * (15 / 70));
        const target2 = Math.round(citationGoal * (15 / 70));
        const target3 = Math.round(citationGoal * (20 / 70));
        const target4 = Math.round(citationGoal * (20 / 70));
        return { target1, target2, target3, target4 };
    };

    const { target1, target2, target3, target4 } = getSectionTargets();

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
            target: target1
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
            target: target2
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
            target: target3
        },
        {
            title: "4. Eval: Avatar vs AR",
            description: "Methodology: Previous comparisons of AR/VR, remote guidance user studies, NASA-TLX baselines.",
            requiredFor: "User Study & Evaluation",
            keywords: ["ar", "augmented reality", "hololens", "nasa-tlx", "trust", "comparison", "baseline"],
            count: countMatches(p => {
                const text = (p.categoryD.dependentVariables + p.categoryD.independentVariables + p.categoryD.studyDesign).toLowerCase();
                return text.includes('ar') || text.includes('augmented') || text.includes('nasa') || text.includes('tlx');
            }),
            target: target4
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
            {/* Citation Goals Summary */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Literature Review Goals</h2>
                        <p className="text-sm text-slate-600">Track your progress toward citation targets</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-4xl font-bold text-indigo-600">{citationGoal}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide">Total Target</div>
                        </div>
                        <button
                            onClick={() => {
                                console.log('🔄 Refresh button clicked');
                                const settings = localStorage.getItem('aiSettings');
                                console.log('🔄 Settings from localStorage:', settings);
                                const config = settings ? JSON.parse(settings) : { citationGoal: 70 };
                                console.log('🔄 Parsed config:', config);
                                const newGoal = config.citationGoal || 70;
                                console.log('🔄 New citation goal:', newGoal);
                                console.log('🔄 Current citation goal state:', citationGoal);
                                setCitationGoal(newGoal);
                                // Force re-render
                                setRefreshKey(prev => prev + 1);
                            }}
                            className="p-2 bg-white rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                            title="Refresh goals from settings"
                        >
                            <RefreshCw size={20} className="text-indigo-600" />
                        </button>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-3">
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-amber-700">{target1}</div>
                        <div className="text-xs text-slate-600">Intro</div>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-amber-700">{target2}</div>
                        <div className="text-xs text-slate-600">Design</div>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-orange-700">{target3}</div>
                        <div className="text-xs text-slate-600">Implementation</div>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-orange-700">{target4}</div>
                        <div className="text-xs text-slate-600">Evaluation</div>
                    </div>
                </div>
            </div>

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

            {/* Citation Strategy Generator */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                            <Search size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">AI Citation Strategy</h3>
                            <p className="text-sm text-slate-500">Generate personalized search recommendations</p>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            if (completedPapers.length === 0) {
                                alert("Please upload and analyze some papers first!");
                                return;
                            }
                            setIsUpdating(true);
                            setRefreshKey(prev => prev + 1);
                            try {
                                const recommendations = await generateCitationStrategy(completedPapers);
                                setAiRecommendations(recommendations);
                                // Save to localStorage so it persists across tab switches
                                localStorage.setItem('aiRecommendations', JSON.stringify(recommendations));
                            } catch (error) {
                                console.error(error);
                                alert("Failed to generate strategy. Check console.");
                            } finally {
                                setIsUpdating(false);
                                setTimeout(() => setRefreshKey(prev => -Math.abs(prev)), 500);
                            }
                        }}
                        disabled={isUpdating}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={16} className={(refreshKey > 0 || isUpdating) ? 'animate-spin' : ''} />
                        {isUpdating ? 'Analyzing...' : 'Generate Strategy'}
                    </button>
                </div>
            </div>

            {/* AI-Powered Recommendations */}
            {aiRecommendations.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-8 rounded-2xl shadow-sm border-2 border-purple-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-600 text-white rounded-full">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">🤖 AI-Powered Search Strategy</h3>
                            <p className="text-sm text-slate-600">Based on your current {completedPapers.length} papers</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {aiRecommendations.map((rec, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-purple-200">
                                <h4 className="font-bold text-purple-900 mb-2">{rec.section}</h4>
                                <p className="text-sm text-slate-600 mb-3 italic">Gap: {rec.gap}</p>
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Suggested Searches:</div>
                                    {rec.searchQueries.map((query, qIdx) => (
                                        <SearchQuery key={qIdx} query={query} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div >
    );
};
