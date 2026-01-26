// Data structures based on the user's categorization methodology

export interface CategoryA {
  coreProblem: string;
  theVillain: string;
  gapClaim: string;
  keyDefinitions: string;
}

export interface CategoryB {
  interactionParadigm: string;
  embodimentType: string;
  inputModality: string;
  autonomyLevel: string;
}

export interface CategoryC {
  algorithmModel: string;
  hardwareSpecs: string;
  latencyPerformance: string;
  safetyMechanisms: string;
}

export interface CategoryD {
  studyDesign: string;
  sampleSize: string;
  taskDescription: string;
  independentVariables: string;
  dependentVariables: string;
}

export interface CategoryE {
  keyFinding: string;
  unexpectedResults: string;
  limitations: string;
  futureWork: string;
  relevanceToTelementoring: string;
}

export interface PaperAnalysis {
  citationKey: string;
  title: string;
  categoryA: CategoryA;
  categoryB: CategoryB;
  categoryC: CategoryC;
  categoryD: CategoryD;
  categoryE: CategoryE;
}

export interface AnalyzedPaper {
  id: string;
  fileName: string;
  status: 'analyzing' | 'complete' | 'error';
  data?: PaperAnalysis;
  errorMsg?: string;
  uploadDate: number;
}
