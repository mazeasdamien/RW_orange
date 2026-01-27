import { PaperAnalysis } from '../types';

export const convertPapersToCSV = (papers: PaperAnalysis[]): string => {
    const headers = [
        // Meta
        "Citation Key", "Title",
        // Category A
        "Core Problem", "The Villain", "Gap Claim", "Key Definitions",
        // Category B
        "Interaction Paradigm", "Embodiment Type", "Input Modality", "Autonomy Level",
        // Category C
        "Algorithm/Model", "Hardware Specs", "Latency/Performance", "Safety Mechanisms",
        // Category D
        "Study Design", "Sample Size", "Task Description", "Independent Variables", "Dependent Variables",
        // Category E
        "Key Finding", "Unexpected Results", "Limitations", "Future Work", "Relevance to Telementoring"
    ];

    const rows = papers.map(paper => [
        paper.citationKey,
        paper.title,
        // Cat A
        paper.categoryA.coreProblem,
        paper.categoryA.theVillain,
        paper.categoryA.gapClaim,
        paper.categoryA.keyDefinitions,
        // Cat B
        paper.categoryB.interactionParadigm,
        paper.categoryB.embodimentType,
        paper.categoryB.inputModality,
        paper.categoryB.autonomyLevel,
        // Cat C
        paper.categoryC.algorithmModel,
        paper.categoryC.hardwareSpecs,
        paper.categoryC.latencyPerformance,
        paper.categoryC.safetyMechanisms,
        // Cat D
        paper.categoryD.studyDesign,
        paper.categoryD.sampleSize,
        paper.categoryD.taskDescription,
        paper.categoryD.independentVariables,
        paper.categoryD.dependentVariables,
        // Cat E
        paper.categoryE.keyFinding,
        paper.categoryE.unexpectedResults,
        paper.categoryE.limitations,
        paper.categoryE.futureWork,
        paper.categoryE.relevanceToTelementoring,
    ]);

    // Escape special characters and wrap in quotes
    const escapeCsvField = (field: string) => {
        if (!field) return '""';
        const stringField = String(field);
        if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsvField).join(','))
    ].join('\n');

    return csvContent;
};

export const convertPapersToRIS = (papers: PaperAnalysis[]): string => {
    let risContent = "";

    papers.forEach(paper => {
        risContent += "TY  - JOUR\n";

        // Abstract
        if (paper.abstract) {
            // Strip minimal HTML tags if present (CrossRef sometimes sends p tags)
            const cleanAbstract = paper.abstract.replace(/<[^>]*>?/gm, '');
            risContent += `AB  - ${cleanAbstract}\n`;
        }

        // Authors - assuming input is string[] or possibly dirty string
        if (Array.isArray(paper.authors)) {
            paper.authors.forEach(author => {
                risContent += `AU  - ${author}\n`;
            });
        } else if (typeof paper.authors === 'string') {
            // Fallback if AI returns a single string
            risContent += `AU  - ${paper.authors}\n`;
        }

        // Date / Year
        if (paper.year) {
            risContent += `DA  - ${paper.year}///\n`; // YYYY/MM/DD format, approximated
            risContent += `PY  - ${paper.year}\n`;
        }

        // DOI
        if (paper.doi) risContent += `DO  - ${paper.doi.replace(/^doi:/i, '')}\n`;

        // Issue & Volume
        if (paper.issue) risContent += `IS  - ${paper.issue}\n`;
        if (paper.volume) risContent += `VL  - ${paper.volume}\n`;

        // Title
        risContent += `TI  - ${paper.title}\n`;

        // Journal
        if (paper.journal) risContent += `T2  - ${paper.journal}\n`;

        // Start/End pages (we don't extract these reliably yet, but keeping placeholder logic)
        // risContent += `SP  - \nEP  - \n`;

        // AI extracted notes
        const notes = [
            `Core Problem: ${paper.categoryA.coreProblem}`,
            `Gap: ${paper.categoryA.gapClaim}`,
            `Paradigm: ${paper.categoryB.interactionParadigm}`,
            `Embodiment: ${paper.categoryB.embodimentType}`,
            `Findings: ${paper.categoryE.keyFinding}`
        ].join(' | ');
        risContent += `N1  - ${notes}\n`;

        risContent += "ER  - \n\n";
    });

    return risContent;
}

export const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
