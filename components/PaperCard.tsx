import React, { useState } from 'react';
import { AnalyzedPaper, PaperAnalysis } from '../types';
import { ChevronDown, ChevronUp, FileText, AlertCircle, CheckCircle2, Copy } from 'lucide-react';

interface PaperCardProps {
  paper: AnalyzedPaper;
  onRemove: (id: string) => void;
}

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="mb-2 grid grid-cols-12 gap-2 text-sm">
    <span className="col-span-4 font-semibold text-slate-500">{label}</span>
    <span className="col-span-8 text-slate-800">{value}</span>
  </div>
);

const SectionBlock: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
  <div className={`rounded-lg border border-${color}-200 bg-${color}-50 p-4 mb-4`}>
    <h4 className={`text-${color}-800 font-bold mb-3 uppercase text-xs tracking-wider border-b border-${color}-200 pb-2`}>
      {title}
    </h4>
    {children}
  </div>
);

export const PaperCard: React.FC<PaperCardProps> = ({ paper, onRemove }) => {
  const [expanded, setExpanded] = useState(false);

  if (paper.status === 'analyzing') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-100 p-3 rounded-full">
            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div>
            <div className="h-4 bg-slate-200 rounded w-48 mb-2"></div>
            <div className="h-3 bg-slate-100 rounded w-24"></div>
          </div>
        </div>
        <span className="text-sm text-indigo-600 font-medium">Analyzing with Gemini...</span>
      </div>
    );
  }

  if (paper.status === 'error' || !paper.data) {
    return (
      <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-red-100 p-2 rounded-full text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-red-900">{paper.fileName}</h3>
            <p className="text-sm text-red-700">{paper.errorMsg || 'Analysis failed'}</p>
          </div>
        </div>
        <button onClick={() => onRemove(paper.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">
          Dismiss
        </button>
      </div>
    );
  }

  const data = paper.data;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert("Analysis JSON copied to clipboard");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md">
      <div 
        className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="bg-green-100 p-3 rounded-full text-green-700">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="bg-slate-800 text-white text-xs font-bold px-2 py-0.5 rounded">
                  {data.citationKey}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(paper.uploadDate).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1">{data.title || paper.fileName}</h3>
              <p className="text-sm text-slate-600 line-clamp-1">{data.categoryA.coreProblem}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             {expanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-6 pt-0 border-t border-slate-100 bg-slate-50/50">
          <div className="flex justify-end mb-4 pt-4">
            <button 
              onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
              className="flex items-center space-x-1 text-xs font-medium text-slate-500 hover:text-indigo-600 mr-4"
            >
              <Copy size={14} /> <span>Copy JSON</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(paper.id); }}
              className="text-xs font-medium text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category A: Intro */}
            <SectionBlock title="Category A: Problem & Gap" color="indigo">
              <DetailRow label="Core Problem" value={data.categoryA.coreProblem} />
              <DetailRow label="The Villain" value={data.categoryA.theVillain} />
              <DetailRow label="The Gap Claim" value={data.categoryA.gapClaim} />
              <DetailRow label="Definitions" value={data.categoryA.keyDefinitions} />
            </SectionBlock>

            {/* Category B: Taxonomy */}
            <SectionBlock title="Category B: Related Work (Taxonomy)" color="blue">
              <DetailRow label="Paradigm" value={data.categoryB.interactionParadigm} />
              <DetailRow label="Embodiment" value={data.categoryB.embodimentType} />
              <DetailRow label="Input" value={data.categoryB.inputModality} />
              <DetailRow label="Autonomy" value={data.categoryB.autonomyLevel} />
            </SectionBlock>

            {/* Category C: System */}
            <SectionBlock title="Category C: System Architecture" color="cyan">
              <DetailRow label="Algorithm" value={data.categoryC.algorithmModel} />
              <DetailRow label="Hardware" value={data.categoryC.hardwareSpecs} />
              <DetailRow label="Performance" value={data.categoryC.latencyPerformance} />
              <DetailRow label="Safety" value={data.categoryC.safetyMechanisms} />
            </SectionBlock>

            {/* Category D: User Study */}
            <SectionBlock title="Category D: Study Design" color="orange">
              <DetailRow label="Design" value={data.categoryD.studyDesign} />
              <DetailRow label="N (Sample)" value={data.categoryD.sampleSize} />
              <DetailRow label="Task" value={data.categoryD.taskDescription} />
              <DetailRow label="Indep. Vars" value={data.categoryD.independentVariables} />
              <DetailRow label="Dep. Vars" value={data.categoryD.dependentVariables} />
            </SectionBlock>

            {/* Category E: Results */}
            <SectionBlock title="Category E: Results & Discussion" color="emerald">
              <DetailRow label="Key Finding" value={data.categoryE.keyFinding} />
              <DetailRow label="Unexpected" value={data.categoryE.unexpectedResults} />
              <DetailRow label="Limitations" value={data.categoryE.limitations} />
              <DetailRow label="Telementoring Relevance" value={data.categoryE.relevanceToTelementoring} />
            </SectionBlock>
          </div>
        </div>
      )}
    </div>
  );
};
