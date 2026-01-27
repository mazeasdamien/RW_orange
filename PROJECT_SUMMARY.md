# RW_orange - Research Paper Analysis Tool

## Overview
An intelligent paper analysis tool designed for CHI paper writing. It helps filter, analyze, and organize your literature review with AI-powered relevance checking and taxonomy extraction.

## Key Features

### 1. **Smart Relevance Check (NEW!)**
When you upload a PDF:
- AI analyzes first 3 pages instantly
- Scores relevance (0-100) against your project
- Shows which sections it supports
- Accept/Reject before full analysis
- **Saves time & API costs**

### 2. **Automated Paper Analysis**
Extracts structured data:
- Title, Authors, Year, Abstract
- Core Problem & Research Gap
- Social Gestures & Motion Generation
- Technical Approach & Algorithms
- Study Design & Variables
- Key Findings & Future Work

### 3. **Citation Strategy Dashboard**
- Tracks progress toward 70-citation goal
- **4 targeted sections:**
  - Intro & Concept (15 papers)
  - Design & Taxonomy (15 papers)
  - Implementation (20 papers)
  - Evaluation (20 papers)
- One-click search queries for gaps
- Visual indicators for incomplete sections

### 4. **Taxonomy Extraction Assistant**
- Generates "Design Space" section content
- **Strict mode**: NO synthetic data
- Uses ONLY uploaded papers
- Includes proper citations [Author, Year]
- Auto-saves drafts
- Download as .md file
- Shows "Draft Outdated" when new papers added

### 5. **Export Options**
- CSV format
- RIS format (Zotero, Mendeley compatible)

## Project Context
**Your CHI Paper**: "Semantic Telepresence via an Avatar Robot controlled by a VLM-driven Text to Motion system"

**Taxonomy Categories**:
1. Show (Directing attention/demonstrating)
2. Alert (Signaling risk/stopping)
3. Encourage (Socio-emotional support)
4. Hesitate (Expressing uncertainty/inviting checks)

## Data Storage
- Papers: Browser localStorage (`hri_papers`)
- Taxonomy Draft: Browser localStorage (`taxonomyDraft`)
- Auto-saves on every change

## AI Model
- Provider: Orange LLM Proxy
- Model: `vertex_ai/claude4-sonnet`
- Temp: 0.3 (for taxonomy/relevance) | 0.2 (for strict checks)

## How Taxonomy Updates
1. Upload a new paper → Relevance check
2. If accepted → Full analysis runs
3. Paper count increases
4. Dashboard shows "Draft Outdated" warning
5. Click "Extract Taxonomy from Papers"
6. New draft generated with ALL papers
7. Auto-saved to localStorage

## Recent Fixes (2026-01-27)
- ✅ Fixed model authentication (claude4-sonnet)
- ✅ Fixed PDF.js worker CDN URL (https)
- ✅ Added relevance pre-screening
- ✅ Added citation metadata to taxonomy output
- ✅ Added download/save functionality
- ✅ Added stale draft detection
