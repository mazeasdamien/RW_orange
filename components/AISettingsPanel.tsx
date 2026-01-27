import React, { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';

interface AISettings {
    provider: 'claude' | 'gemini';
    orangeApiKey: string;
    geminiApiKey: string;
    projectTitle: string;
    projectDescription: string;
    researchFocus: string;
    conferenceTarget: string;
    paperSections: string;
    citationGoal: number;
}

interface AISettingsPanelProps {
    onClose: () => void;
}

export const AISettingsPanel: React.FC<AISettingsPanelProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<AISettings>(() => {
        const saved = localStorage.getItem('aiSettings');
        return saved ? JSON.parse(saved) : {
            provider: 'claude',
            orangeApiKey: '',
            geminiApiKey: '',
            projectTitle: 'Semantic Telepresence via an Avatar Robot controlled by a VLM-driven Text to Motion system',
            projectDescription: 'This research explores using Vision-Language Models (VLMs) to control avatar robots for telepresence applications. The system translates natural language commands into robot motions, reducing cognitive load and fatigue in teleoperation. Key focus areas include: (1) reducing operator fatigue through semantic control, (2) improving natural interaction through social signals and gestures, (3) comparing AR vs Avatar robot interfaces, and (4) evaluating trust and workload using NASA-TLX metrics.',
            researchFocus: 'VLM for robotics, teleoperation, avatar robots, text-to-motion, social signals, hesitation communication, gesture taxonomy, cognitive load, fatigue reduction, semantic telepresence, GPT control, human-robot interaction, embodiment, AR vs Avatar comparison, NASA-TLX, trust metrics',
            conferenceTarget: 'CHI (Computer-Human Interaction)',
            paperSections: '1. Introduction & Concept (15 papers): problem motivation, cognitive load, teleoperation challenges, VLM justification\n2. Design Space & Taxonomy (15 papers): social signals, interaction paradigms, embodiment types, gesture taxonomy\n3. System Implementation (20 papers): VLM for robotics, text-to-motion, GPT control, hardware specs, latency, safety\n4. User Study & Evaluation (20 papers): AR vs Avatar, NASA-TLX, trust metrics, sample size, task description',
            citationGoal: 70
        };
    });

    const handleSave = () => {
        localStorage.setItem('aiSettings', JSON.stringify(settings));
        // Dispatch custom event to notify Dashboard
        window.dispatchEvent(new Event('settingsChanged'));
        alert(`Settings saved! Total citation target: ${settings.citationGoal}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Settings size={24} className="text-indigo-600" />
                        <h3 className="text-xl font-bold text-slate-900">AI Model Settings</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">AI Provider</label>
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-50"
                                style={{ borderColor: settings.provider === 'claude' ? '#4F46E5' : '#E2E8F0' }}>
                                <input
                                    type="radio"
                                    name="provider"
                                    checked={settings.provider === 'claude'}
                                    onChange={() => setSettings({ ...settings, provider: 'claude' })}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-900">Claude 4 Sonnet (via Orange)</div>
                                    <div className="text-sm text-slate-500">Uses Orange LLM Proxy - No API key needed</div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-50"
                                style={{ borderColor: settings.provider === 'gemini' ? '#4F46E5' : '#E2E8F0' }}>
                                <input
                                    type="radio"
                                    name="provider"
                                    checked={settings.provider === 'gemini'}
                                    onChange={() => setSettings({ ...settings, provider: 'gemini' })}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-900">Gemini 3.0 Flash (via Google)</div>
                                    <div className="text-sm text-slate-500">Direct Google API - Requires your API key</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {settings.provider === 'claude' && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Orange LLM Proxy API Key</label>
                            <input
                                type="password"
                                value={settings.orangeApiKey}
                                onChange={(e) => setSettings({ ...settings, orangeApiKey: e.target.value })}
                                placeholder="sk-..."
                                className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-xs text-slate-600 mt-2">
                                Your Orange internal API key for Claude access
                            </p>
                        </div>
                    )}

                    {settings.provider === 'gemini' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Google AI API Key</label>
                            <input
                                type="password"
                                value={settings.geminiApiKey}
                                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                                placeholder="AIzaSy..."
                                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            />
                            <p className="text-xs text-slate-600 mt-2">
                                Get your key at: <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-600 underline">aistudio.google.com</a>
                            </p>
                        </div>
                    )}

                    {/* Project Context */}
                    <div className="pt-6 border-t border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700 mb-4">📝 Your Research Project</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Paper Title</label>
                                <input
                                    type="text"
                                    value={settings.projectTitle}
                                    onChange={(e) => setSettings({ ...settings, projectTitle: e.target.value })}
                                    placeholder="e.g., Semantic Telepresence via Avatar Robot..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Project Description</label>
                                <textarea
                                    value={settings.projectDescription}
                                    onChange={(e) => setSettings({ ...settings, projectDescription: e.target.value })}
                                    placeholder="Brief description of your research focus..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Research Keywords (comma-separated)</label>
                                <input
                                    type="text"
                                    value={settings.researchFocus}
                                    onChange={(e) => setSettings({ ...settings, researchFocus: e.target.value })}
                                    placeholder="e.g., VLM, robotics, teleoperation, HRI..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    These keywords tune the AI to find relevant papers for your research
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Conference/Journal</label>
                                <input
                                    type="text"
                                    value={settings.conferenceTarget}
                                    onChange={(e) => setSettings({ ...settings, conferenceTarget: e.target.value })}
                                    placeholder="e.g., CHI, ICRA, HRI..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Total Citation Goal</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={settings.citationGoal}
                                    onChange={(e) => setSettings({ ...settings, citationGoal: parseInt(e.target.value) || 70 })}
                                    placeholder="70"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    How many total papers you aim to cite in your literature review
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Paper Structure & Citation Goals</label>
                                <textarea
                                    value={settings.paperSections}
                                    onChange={(e) => setSettings({ ...settings, paperSections: e.target.value })}
                                    placeholder="List your paper sections with citation targets..."
                                    rows={5}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Define your paper sections and what each should cover
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={
                            (settings.provider === 'gemini' && !settings.geminiApiKey) ||
                            (settings.provider === 'claude' && !settings.orangeApiKey)
                        }
                        className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};
