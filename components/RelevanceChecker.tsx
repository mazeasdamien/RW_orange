import React, { useState } from 'react';
import { checkPaperRelevance } from '../services/aiService';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

interface RelevanceCheckerProps {
    file: File;
    onAccept: (file: File) => void;
    onReject: () => void;
}

export const RelevanceChecker: React.FC<RelevanceCheckerProps> = ({ file, onAccept, onReject }) => {
    const [isChecking, setIsChecking] = useState(false);
    const [result, setResult] = useState<{
        isRelevant: boolean;
        score: number;
        reasoning: string;
        matchedSections: string[];
    } | null>(null);

    const extractPdfText = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        // Extract first 3 pages for quick check
        const pagesToCheck = Math.min(3, pdf.numPages);
        for (let i = 1; i <= pagesToCheck; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
        }
        return fullText;
    };

    const handleCheck = async () => {
        setIsChecking(true);
        try {
            const text = await extractPdfText(file);
            const relevanceResult = await checkPaperRelevance(text);
            setResult(relevanceResult);
        } catch (error) {
            console.error(error);
            alert("Failed to check relevance. Check console.");
        } finally {
            setIsChecking(false);
        }
    };

    React.useEffect(() => {
        handleCheck();
    }, []);

    if (isChecking) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-indigo-600" size={48} />
                        <h3 className="text-lg font-bold text-slate-900">Checking Relevance...</h3>
                        <p className="text-sm text-slate-500 text-center">
                            Analyzing: <span className="font-semibold">{file.name}</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!result) return null;

    const scoreColor = result.score >= 70 ? 'green' : result.score >= 40 ? 'amber' : 'red';
    const Icon = result.score >= 70 ? CheckCircle : result.score >= 40 ? AlertTriangle : XCircle;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-2xl w-full">
                <div className="flex items-start gap-4 mb-6">
                    <Icon className={`text-${scoreColor}-600 shrink-0`} size={48} />
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-slate-900 mb-1">Relevance Check Complete</h3>
                        <p className="text-sm text-slate-500">{file.name}</p>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <span className="text-sm font-semibold text-slate-700">Relevance Score</span>
                        <span className={`text-3xl font-bold text-${scoreColor}-600`}>{result.score}/100</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="text-sm font-bold text-slate-700 mb-2">Analysis</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{result.reasoning}</p>
                    </div>

                    {result.matchedSections.length > 0 && (
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                            <h4 className="text-sm font-bold text-indigo-900 mb-2">Supports Sections:</h4>
                            <ul className="list-disc list-inside space-y-1">
                                {result.matchedSections.map((section, idx) => (
                                    <li key={idx} className="text-sm text-indigo-700">{section}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className={`p-4 border-2 rounded-lg ${result.isRelevant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <p className="text-sm font-bold text-center">
                            {result.isRelevant ? '✅ Recommendation: KEEP this paper' : '❌ Recommendation: SKIP this paper'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onReject}
                        className="flex-1 px-6 py-3 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                    >
                        Reject Paper
                    </button>
                    <button
                        onClick={() => onAccept(file)}
                        className="flex-1 px-6 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md hover:shadow-indigo-500/25"
                    >
                        Add to Dataset →
                    </button>
                </div>
            </div>
        </div>
    );
};
