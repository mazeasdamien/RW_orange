import OpenAI from "openai";
import * as pdfjsLib from "pdfjs-dist";
import { PaperAnalysis } from "../types";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

const API_KEY = "sk-LDYDnMFSsPZAPbHVkwrPbA";
const API_BASE = "https://llmproxy.ai.orange/v1";
const MODEL_NAME = "vertex_ai/claude4-sonnet";

const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: API_BASE,
  dangerouslyAllowBrowser: true,
});

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
  // Extract first author's last name
  const firstAuthor = analysis.authors?.[0] || "";
  const authorLastName = firstAuthor.split(" ").pop() || "";

  // Construct DOI search URL
  const searchQuery = encodeURIComponent(
    `${analysis.title} ${authorLastName}`
  );
  const crossRefUrl = `https://api.crossref.org/works?query=${searchQuery}&rows=1`;

  try {
    const response = await fetch(crossRefUrl);
    const data = await response.json();

    if (data.message.items && data.message.items.length > 0) {
      const item = data.message.items[0];
      const doi = item.DOI;
      const url = `https://doi.org/${doi}`;

      // Add DOI and URL to the analysis
      return {
        ...analysis,
        doi,
        url,
      };
    }
  } catch (error) {
    console.warn("CrossRef lookup failed:", error);
  }

  return analysis;
}

export const analyzePaper = async (file: File): Promise<PaperAnalysis> => {
  const fullText = await extractTextFromPdf(file);

  const systemPrompt = `You are an AI research assistant analyzing academic papers for an HRI literature review. Return JSON only.`;

  const userPrompt = `Analyze this research paper and extract key information strictly according to these categories:

{
  "title": "Paper title",
  "authors": ["Author1", "Author2"],
  "year": 2024,
  "abstract": "Full abstract text",
  "categoryA": {
    "coreProblem": "The fundamental research problem addressed",
    "gapClaim": "The identified gap and research claim",
    "keyDefinitions": "Key concepts and definitions"
  },
  "categoryB": {
    "gestureTelementoring": "Description of gesture-based telementoring aspects",
    "socialGestures": "Analysis of social gestures and their roles",
    "motionGeneration": "Technical details on how motion/gestures are generated"
  },
  "categoryC": {
    "algorithmModel": "Description of algorithms or computational models used",
    "technicalApproach": "Technical approach and architecture"
  },
  "categoryD": {
    "studyDesign": "Experimental design and methodology",
    "independentVariables": "Independent variables studied",
    "dependentVariables": "Dependent variables measured",
    "numParticipants": 0
  },
  "categoryE": {
    "keyFinding": "Main research findings and contributions",
    "limitations": "Study limitations mentioned",
    "futureWork": "Suggested future research directions",
    "relevanceToTelementoring": "How this relates to telementoring and HRI"
  }
}

Paper text:
${fullText}`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("No response text from AI Provider");
    }

    const initialAnalysis: PaperAnalysis = JSON.parse(text);
    const finalAnalysis = await enrichWithCrossRef(initialAnalysis);

    return finalAnalysis;
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

Please output the following in Markdown format:
1. Literature Corpus Analysis: Extract behavioral concepts directly from the ${papers.length} provided papers and map them to our 4 categories. **Cite papers using [Author, Year] format.**
2. The Coding Table: Create a markdown table with columns: Paper Title | Extracted Concept | Open Code | Final Category
3. The "Hesitate" Argument: Draft a paragraph deriving the "Hesitate" category from the data. If the provided papers do not support "Hesitate" explicitly, state: "The uploaded literature does not explicitly cover hesitation signals. This represents a gap in the current corpus."
4. **References Section**: Generate a bibliography in this format:
   [Author1, Author2, Year] Title. Journal/Venue.

REMINDER: You are analyzing ${papers.length} specific papers. Do not reference anything outside this list.
`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.3, // LOWER temperature to reduce hallucination risk
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("No response text from AI Provider");
    }

    // Append paper metadata for easy reference
    const citationList = papers.map(p =>
      `- [${p.authors?.join(", ") || "Unknown"}, ${p.year || "N/A"}] ${p.title}${p.doi ? ` DOI: ${p.doi}` : ""}${p.url ? ` URL: ${p.url}` : ""}`
    ).join("\n");

    const fullOutput = `${text}\n\n---\n\n## Paper Metadata (for your records)\n${citationList}`;

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
  const prompt = `
You are evaluating if a research paper is relevant to a CHI paper about:
"Semantic Telepresence via an Avatar Robot controlled by a VLM-driven Text to Motion system"

PROJECT CONTEXT:
The paper has 4 main sections that need literature support:
1. Introduction & Concept (15 papers target)
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
   - Goal: Show methodology for comparing Avatar vs AR systems

EVALUATION CRITERIA:
Analyze the paper text below and determine:
1. **Relevance Score (0-100)**: How useful is this paper?
2. **Matched Sections**: Which of the 4 sections does it support? (can be multiple)
3. **Reasoning**: Brief explanation of why it's relevant (or not)
4. **Recommendation**: Should the researcher KEEP or SKIP this paper?

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
    const response = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("No response from AI");
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Relevance Check Error:", error);
    throw error;
  }
};

