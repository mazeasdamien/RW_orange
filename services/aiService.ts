import OpenAI from "openai";
import * as pdfjsLib from "pdfjs-dist";
import { PaperAnalysis } from "../types";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configure PDF.js worker - use local worker to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// AI Configuration
const ORANGE_API_BASE = "https://llmproxy.ai.orange/v1";
const CLAUDE_MODEL = "vertex_ai/claude4-sonnet";
const GEMINI_MODEL = "gemini-3-flash-preview";

// Unified AI call function
async function callAI(
  prompt: string,
  systemPrompt?: string,
  responseMimeType: string = 'application/json'
): Promise<string> {
  const settings = localStorage.getItem('aiSettings');
  const config = settings ? JSON.parse(settings) : {
    provider: 'claude',
    orangeApiKey: '',
    geminiApiKey: ''
  };

  if (config.provider === 'gemini' && config.geminiApiKey) {
    // Use Google's native SDK
    console.log(`🤖 Using Gemini 3 Flash Preview via Google Native SDK (Mode: ${responseMimeType})`);
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        temperature: 0.3,
        responseMimeType: responseMimeType,
      }
    });

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n${prompt}`
      : prompt;

    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();
    console.log('✅ Gemini response received:', response.substring(0, 100) + '...');
    return response;
  }

  // Use Claude via OpenAI format
  console.log('🤖 Using Claude 4 Sonnet via Orange LLM Proxy');
  if (!config.orangeApiKey) {
    throw new Error("Orange API key not configured. Please go to Settings and add your Orange LLM Proxy API key.");
  }

  const client = new OpenAI({
    apiKey: config.orangeApiKey,
    baseURL: ORANGE_API_BASE,
    dangerouslyAllowBrowser: true,
  });

  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await client.chat.completions.create({
    model: CLAUDE_MODEL,
    messages,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  return response.choices[0]?.message?.content || "";
}

function getModelName() {
  const settings = localStorage.getItem('aiSettings');
  const config = settings ? JSON.parse(settings) : { provider: 'claude' };
  return config.provider === 'gemini' ? GEMINI_MODEL : CLAUDE_MODEL;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

async function enrichWithCrossRef(
  analysis: PaperAnalysis
): Promise<PaperAnalysis> {
  try {
    let crossRefData = null;

    // If AI already found a DOI, use it directly
    if (analysis.doi) {
      const cleanDoi = analysis.doi.replace(/^doi:/i, '').trim();
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);
      if (response.ok) {
        const data = await response.json();
        crossRefData = data.message;
      }
    }

    // If no DOI or DOI lookup failed, search by title
    if (!crossRefData && analysis.title) {
      const firstAuthor = analysis.authors?.[0] || "";
      const authorLastName = firstAuthor.includes(',')
        ? firstAuthor.split(',')[0]
        : firstAuthor.split(" ").pop() || "";

      const searchQuery = encodeURIComponent(`${analysis.title} ${authorLastName}`);
      const response = await fetch(`https://api.crossref.org/works?query=${searchQuery}&rows=1`);

      if (response.ok) {
        const data = await response.json();
        if (data.message.items && data.message.items.length > 0) {
          crossRefData = data.message.items[0];
        }
      }
    }

    // If we found CrossRef data, enrich the analysis
    if (crossRefData) {
      return {
        ...analysis,
        doi: crossRefData.DOI || analysis.doi,
        url: crossRefData.DOI ? `https://doi.org/${crossRefData.DOI}` : analysis.url,
        journal: crossRefData['container-title']?.[0] || analysis.journal,
        volume: crossRefData.volume || analysis.volume,
        issue: crossRefData.issue || analysis.issue,
        year: crossRefData.published?.['date-parts']?.[0]?.[0]?.toString() || analysis.year,
      };
    }
  } catch (error) {
    console.warn("CrossRef enrichment failed:", error);
  }

  return analysis;
}

export const analyzePaper = async (file: File): Promise<PaperAnalysis> => {
  const fullText = await extractTextFromPdf(file);

  const settings = localStorage.getItem('aiSettings');
  const config = settings ? JSON.parse(settings) : {
    projectTitle: 'Literature Review',
    projectDescription: 'Research project',
    researchFocus: 'HRI'
  };

  const systemPrompt = `You are an AI research assistant analyzing academic papers for a literature review.
  
PROJECT CONTEXT:
Title: "${config.projectTitle}"
Description: ${config.projectDescription}
Research Keywords: ${config.researchFocus}

Your task is to extract information that is relevant to this research project. Return JSON only.`;

  const userPrompt = `Analyze this research paper and extract key information strictly according to these categories:

{
  "citationKey": "FirstAuthorLastName2024",
  "title": "Paper title",
  "authors": [
    "LastName1, FirstName1",
    "LastName2, FirstName2",
    "LastName3, FirstName3"
  ],
  "journal": "Journal or Conference name (e.g., 'ACM CHI', 'IEEE Transactions on Robotics')",
  "year": "2024",
  "doi": "10.xxxx/xxxxx (if available, otherwise empty string)",
  "volume": "Volume number (if available, otherwise empty string)",
  "issue": "Issue number (if available, otherwise empty string)",
  "abstract": "Full abstract text",
  "categoryA": {
    "coreProblem": "The fundamental research problem addressed",
    "theVillain": "Main challenge or obstacle identified",
    "gapClaim": "The identified gap and research claim",
    "keyDefinitions": "Key concepts and definitions"
  },
  "categoryB": {
    "interactionParadigm": "Type of interaction paradigm used",
    "embodimentType": "Type of robot embodiment",
    "inputModality": "Input modalities used",
    "autonomyLevel": "Level of autonomy",
    "socialGestures": "Analysis of social gestures and their roles",
    "motionGeneration": "Technical details on how motion/gestures are generated"
  },
  "categoryC": {
    "algorithmModel": "Description of algorithms or computational models used",
    "hardwareSpecs": "Hardware specifications",
    "latencyPerformance": "Latency and performance metrics",
    "safetyMechanisms": "Safety mechanisms described"
  },
  "categoryD": {
    "studyDesign": "Experimental design and methodology",
    "sampleSize": "Sample size description",
    "taskDescription": "Description of tasks performed",
    "independentVariables": "Independent variables studied",
    "dependentVariables": "Dependent variables measured"
  },
  "categoryE": {
    "keyFinding": "Main research findings and contributions",
    "unexpectedResults": "Unexpected results mentioned",
    "limitations": "Study limitations mentioned",
    "futureWork": "Suggested future research directions",
    "relevanceToTelementoring": "How this relates to telementoring and HRI"
  }
}

IMPORTANT INSTRUCTIONS:
1. Extract all bibliographic information (journal, volume, issue, doi) carefully from the paper header, footer, or first page.
2. Authors MUST be a JSON array where EACH author is a SEPARATE string element in "LastName, FirstName" format.
   Example: ["Gaebert, Carl", "Rehren, Oliver", "Jansen, Sebastian"]
   NOT: ["Gaebert, Carl, Rehren, Oliver, Jansen, Sebastian"]

Paper text:
${fullText}`;

  try {
    const text = await callAI(userPrompt, systemPrompt);
    if (!text) {
      throw new Error("No response text from AI Provider");
    }

    // Strip markdown code blocks if present (```json ... ```)
    const cleanedText = text.replace(/```json\s*|\s*```/g, '').trim();

    const initialAnalysis: PaperAnalysis = JSON.parse(cleanedText);
    const finalAnalysis = await enrichWithCrossRef(initialAnalysis);

    return finalAnalysis;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};

export const generateTaxonomyDraft = async (papers: PaperAnalysis[]): Promise<string> => {
  // STRICT VALIDATION: Refuse to generate without real data
  if (papers.length === 0) {
    throw new Error("Cannot generate taxonomy without uploaded papers. Please upload and analyze PDFs first.");
  }

  // Format papers with FULL details - no truncation
  const paperContext = papers.map((p, i) => `
[PAPER ${i + 1}]
Title: ${p.title}
Authors: ${p.authors?.join(", ") || "N/A"}
Year: ${p.year || "N/A"}
Abstract: ${p.abstract}
Core Problem: ${p.categoryA.coreProblem}
Gap/Claim: ${p.categoryA.gapClaim}
Key Definitions: ${p.categoryA.keyDefinitions}
Social Gestures: ${p.categoryB.socialGestures}
Motion Generation: ${p.categoryB.motionGeneration}
Key Finding: ${p.categoryE.keyFinding}
---
`).join("\n");

  const prompt = `
Role: Act as an expert HCI Researcher and Data Analyst specializing in remote collaboration, robotics, and social signal processing.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
❌ DO NOT invent, simulate, or hallucinate any data
❌ DO NOT cite papers that are not in the list below
❌ DO NOT create fictional quotes or findings
✅ ONLY use information explicitly stated in the provided papers
✅ If a category lacks support, acknowledge the gap honestly

CONTEXT - PROVIDED DATA (Source A):
The user has uploaded exactly ${papers.length} papers to be used as the EXCLUSIVE literature corpus:
${paperContext}

The Taxonomy:
We are establishing four core categories of robot/avatar motion for remote guidance:
1. Show (Directing attention/demonstrating)
2. Alert (Signaling risk/stopping)
3. Encourage (Socio-emotional support)
4. Hesitate (Expressing uncertainty/inviting checks)

The Methodology (The "Gold Standard"):
I want you to follow the specific methodological rigor used in top CHI papers (ADC, AI Privacy, ClueCart, LAMP). Below is the breakdown of how these papers build taxonomies:

[BEGIN METHODOLOGY CONTEXT]
1. The "Meta-Methodology" of successful CHI Taxonomies
- Clear Problem Framing.
- Systematic Data Collection: "Top-Down" (Literature Review).
- Iterative Coding: Open coding -> merging codes -> final categories.

2. The Required Data Structure for My Taxonomy
Source A: Top-Down Literature Synthesis
- Domains: Telepresence, Social Robotics, Industrial Safety, CSCW.
- Extraction: Identify recurring behavioral intents (e.g., "pointing," "emergency stop," "nodding," "slow movement") found **STRICTLY** in the PROVIDED DATA above.

[END METHODOLOGY CONTEXT]

Your Task:
Based on the methodology above, please analyze the provided papers to write the "Design Space & Taxonomy" section of the paper.
**Do NOT simulate or hallucinate any data.** Use ONLY the content from the provided papers.

**CRITICAL FORMATTING INSTRUCTION:**
- Output **RAW MARKDOWN** content.
- Do **NOT** wrap the output in a JSON object.
- Do **NOT** wrap the output in a \`\`\`markdown code block.
  - Start directly with the headings(e.g., "## 1. Literature Corpus Analysis").

Please output the following in Markdown format:
  1. Literature Corpus Analysis: Extract behavioral concepts directly from the ${papers.length} provided papers and map them to our 4 categories. ** Cite papers using[Author, Year] format.**
    2. The Coding Table: Create a markdown table with columns: Paper Title | Extracted Concept | Open Code | Final Category
  3. The "Hesitate" Argument: Draft a paragraph deriving the "Hesitate" category from the data.If the provided papers do not support "Hesitate" explicitly, state: "The uploaded literature does not explicitly cover hesitation signals. This represents a gap in the current corpus."
  4. ** References Section **: Generate a bibliography in this format:
  [Author1, Author2, Year] Title.Journal / Venue.

    REMINDER: You are analyzing ${papers.length} specific papers.Do not reference anything outside this list.
`;

  try {
    const text = await callAI(prompt, undefined, 'text/plain');

    if (!text) {
      throw new Error("No response text from AI Provider");
    }

    // Strip markdown code blocks if present (```markdown ... ``` or just ``` ... ```)
    const cleanedText = text.replace(/^```markdown\s*|^```\s*|```$/g, '').trim();

    // Append paper metadata for easy reference
    const citationList = papers.map(p =>
      `- [${p.authors?.join(", ") || "Unknown"}, ${p.year || "N/A"}] ${p.title}${p.doi ? ` DOI: ${p.doi}` : ""}${p.url ? ` URL: ${p.url}` : ""}`
    ).join("\n");

    const fullOutput = `${cleanedText}\n\n---\n\n## Paper Metadata (for your records)\n${citationList}`;

    return fullOutput;
  } catch (error) {
    console.error("Taxonomy Generation Error:", error);
    throw error;
  }
};

export const checkPaperRelevance = async (paperText: string): Promise<{
  isRelevant: boolean;
  score: number;
  reasoning: string;
  matchedSections: string[];
}> => {
  const settings = localStorage.getItem('aiSettings');
  const config = settings ? JSON.parse(settings) : {
    projectTitle: 'Semantic Telepresence via an Avatar Robot controlled by a VLM-driven Text to Motion system',
    projectDescription: 'Research on VLM-based avatar robot control',
    researchFocus: 'VLM, robotics, teleoperation',
    paperSections: `1. Introduction & Concept (15 papers target)
   - Keywords: fatigue, cognitive load, teleoperation, isolation, direct control, 2D video
   - Goal: Prove direct teleoperation is tiring, justify VLM approach

2. Design Space & Taxonomy (15 papers target)
   - Keywords: hesitation, uncertainty, social signal, taxonomy, show, alert, encourage
   - Goal: Justify "Hesitation" as valid signal, define taxonomy (Show/Alert/Encourage)

3. System Implementation (20 papers target)
   - Keywords: VLM, GPT, text-to-motion, parameter, generative, SOTA, LLM
   - Goal: Prove VLM usage for robot control is state of the art

4. User Study & Evaluation (20 papers target)
   - Keywords: AR, augmented reality, HoloLens, NASA-TLX, trust, comparison, baseline
   - Goal: Show methodology for comparing Avatar vs AR systems`
  };

  const prompt = `
You are evaluating if a research paper is relevant to a research project titled:
"${config.projectTitle}"

PROJECT DESCRIPTION:
${config.projectDescription}

RESEARCH KEYWORDS: ${config.researchFocus}

${config.paperSections ? 'PAPER SECTIONS:\n' + config.paperSections : ''}

EVALUATION CRITERIA:
Analyze the paper text below and determine:
1. How relevant is it to this research project? (Score 0-100)
2. What specific aspects make it relevant or irrelevant?
3. Which sections of the paper contain relevant information?
4. Should we KEEP or SKIP this paper?

Return a JSON object with this structure:
{
  "relevanceScore": 85,
  "reasoning": "This paper discusses VLM applications in robotics...",
  "matchedSections": ["Abstract", "Related Work", "System Design"],
  "recommendation": "KEEP"
}

PAPER TEXT TO EVALUATE:
${paperText.substring(0, 4000)}

DECISION RULES:
- Score 70-100: KEEP (highly relevant)
- Score 40-69: KEEP (moderately relevant)
- Score 0-39: SKIP (not relevant enough)
Return JSON only:
{
  "isRelevant": true/false (true if score >= 40),
  "score": 0-100,
  "reasoning": "Brief explanation",
  "matchedSections": ["Section 1", "Section 2"]
}

PAPER TEXT TO EVALUATE:
${paperText.substring(0, 4000)}
`;

  try {
    const text = await callAI(prompt);
    if (!text) {
      throw new Error("No response from AI");
    }

    // Strip markdown code blocks if present (```json ... ```)
    const cleanedText = text.replace(/```json\s*|\s*```/g, '').trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Relevance Check Error:", error);
    throw error;
  }
};

export const generateCitationStrategy = async (papers: PaperAnalysis[]): Promise<{
  section: string;
  gap: string;
  searchQueries: string[];
}[]> => {
  const settings = localStorage.getItem('aiSettings');
  const config = settings ? JSON.parse(settings) : {
    projectTitle: 'Semantic Telepresence via an Avatar Robot controlled by a VLM-driven Text to Motion system',
    projectDescription: 'Research on using Vision-Language Models (VLMs) to control avatar robots for telepresence',
    researchFocus: 'VLM for robotics, teleoperation, social signals'
  };

  const paperSummary = papers.map(p => `- ${p.title} (${p.year}): ${p.categoryA.coreProblem}`).join('\n');

  const prompt = `
You are a research strategy advisor for a research paper titled:
"${config.projectTitle}"

PROJECT DESCRIPTION:
${config.projectDescription}

RESEARCH KEYWORDS: ${config.researchFocus}

CURRENT DATASET (${papers.length} papers):
${paperSummary}

YOUR TASK:
Analyze this dataset and identify critical gaps across 4 sections of the paper. For each gap, provide specific, actionable search queries.

PAPER SECTIONS:
1. Introduction & Concept (Target: 15 papers)
   - Should cover: problem motivation, cognitive load, challenges, justification
   
2. Design Space & Taxonomy (Target: 15 papers)
   - Should cover: social signals, interaction paradigms, design frameworks
   
3. System Implementation (Target: 20 papers)
   - Should cover: technical approaches, SOTA systems, implementation details
   
4. User Study & Evaluation (Target: 20 papers)
   - Should cover: evaluation methods, metrics, comparative studies

Return a JSON array with this structure:
[
  {
    "section": "Introduction & Concept",
    "gap": "Brief description of what's missing",
    "searchQueries": [
      "specific search query 1",
      "specific search query 2",
      "specific search query 3"
    ]
  }
]

IMPORTANT: 
- Analyze what topics are ALREADY covered by the papers above
- Only suggest queries for MISSING topics
- Make queries specific and actionable (e.g., "cognitive fatigue teleoperation robots" not just "fatigue")
- Prioritize the most critical gaps for a strong CHI paper
`;

  try {
    const text = await callAI(prompt);
    if (!text) {
      throw new Error("No response from AI");
    }

    const cleanedText = text.replace(/```json\s*|\s*```/g, '').trim();
    const result = JSON.parse(cleanedText);

    // Handle both array and object with "recommendations" key
    return Array.isArray(result) ? result : result.recommendations || [];
  } catch (error) {
    console.error("Strategy Generation Error:", error);
    throw error;
  }
};

