"use client";

import React, { useState, useMemo, useCallback } from 'react';
import {
  Palette,
  Clock,
  Zap,
  ChevronsRight,
  Calculator,
  GanttChart,
  ListPlus,
  Trash2,
  Play,
  LucideIcon,
} from 'lucide-react';

// --- Theme Definitions and Types ---
const themeColors = {
  orange: { accent: 'orange', code: 'FF5722' },
  sky: { accent: 'sky', code: '0EA5E9' },
  emerald: { accent: 'emerald', code: '10B981' },
  rose: { accent: 'rose', code: 'F43F5E' },
};
type ThemeKey = keyof typeof themeColors;

// --- Data Interfaces ---
interface Process {
  id: number;
  name: string;
  arrival: number;
  burst: number;
  // Calculated metrics
  completion?: number;
  turnaround?: number;
  waiting?: number;
  start?: number;
}

interface ProcessInput {
  name: string;
  arrival: string;
  burst: string;
}

// --- Dynamic Styling Helpers ---
const useThemeStyles = (currentTheme: ThemeKey) => {
  const themeAccent = useMemo(() => themeColors[currentTheme].accent, [currentTheme]);

  // Explicit class maps for complex/failing dynamic classes (Fixes Tailwind JIT issues)
  const themeClasses = useMemo(() => {
    const bgMap: Record<ThemeKey, string> = {
        orange: 'bg-orange-800',
        sky: 'bg-sky-800',
        emerald: 'bg-emerald-800',
        rose: 'bg-rose-800',
    };
    const headerBgMap: Record<ThemeKey, string> = {
        orange: 'bg-orange-700',
        sky: 'bg-sky-700',
        emerald: 'bg-emerald-700',
        rose: 'bg-rose-700',
    };
    const accentColorMap: Record<ThemeKey, string> = {
      orange: 'text-orange-400',
      sky: 'text-sky-400',
      emerald: 'text-emerald-400',
      rose: 'text-rose-400',
    };
    const buttonBgMap: Record<ThemeKey, string> = {
      orange: 'bg-orange-600 hover:bg-orange-700',
      sky: 'bg-sky-600 hover:bg-sky-700',
      emerald: 'bg-emerald-600 hover:bg-emerald-700',
      rose: 'bg-rose-600 hover:bg-rose-700',
    };

    return {
        mainBg: `bg-gray-900`,
        headerBg: headerBgMap[currentTheme] || headerBgMap.orange,
        accentText: accentColorMap[currentTheme] || accentColorMap.orange,
        button: buttonBgMap[currentTheme] || buttonBgMap.orange,
        footerBg: bgMap[currentTheme] || bgMap.orange,
        border: `border-${themeAccent}-600`,
        icon: `text-${themeAccent}-600`,
    };
  }, [currentTheme, themeAccent]);

  return { themeAccent, themeClasses };
};

// --- Sub-Components ---

const ThemeSelector: React.FC<{ currentTheme: ThemeKey, setTheme: (theme: ThemeKey) => void }> = ({ currentTheme, setTheme }) => (
  <div className="fixed top-4 right-4 z-50">
    <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded-full shadow-2xl border border-gray-700">
      <Palette className="w-5 h-5 text-gray-400" />
      {Object.entries(themeColors).map(([key, theme]) => (
        <button
          key={key}
          onClick={() => setTheme(key as ThemeKey)}
          className={`w-8 h-8 rounded-full shadow-md transition transform hover:scale-110 border-2 ${
            currentTheme === key ? `border-white scale-110` : 'border-transparent'
          } focus:outline-none`}
          style={{ backgroundColor: `#${theme.code}` }}
          title={`${theme.accent.charAt(0).toUpperCase() + theme.accent.slice(1)} Theme`}
        ></button>
      ))}
    </div>
  </div>
);

const SectionHeader: React.FC<{ icon: LucideIcon, title: string, theme: string }> = ({ icon: Icon, title, theme }) => {
  const iconColor = `text-${theme}-600`;
  const borderColor = `border-${theme}-600/50`;
  return (
    <div className={`flex items-center space-x-3 mb-6 border-b ${borderColor} pb-2`}>
      <Icon className={`w-6 h-6 ${iconColor}`} />
      <h2 className="text-2xl font-extrabold text-white uppercase tracking-wider">
        {title}
      </h2>
    </div>
  );
}

// --- FCFS Scheduling Logic ---

const calculateFCFS = (inputProcesses: Process[]): Process[] => {
  if (inputProcesses.length === 0) return [];

  // 1. Sort processes by Arrival Time (AT) first, then by Process ID (for tie-breaking)
  const sortedProcesses = [...inputProcesses].sort((a, b) => {
    if (a.arrival !== b.arrival) {
      return a.arrival - b.arrival;
    }
    return a.id - b.id;
  });

  let currentTime = 0;
  const scheduledProcesses: Process[] = [];

  for (const process of sortedProcesses) {
    // Determine Start Time (ST): Max of current time or the process's arrival time
    const start = Math.max(currentTime, process.arrival);

    // Completion Time (CT): ST + Burst Time (BT)
    const completion = start + process.burst;

    // Turnaround Time (TAT): CT - AT
    const turnaround = completion - process.arrival;

    // Waiting Time (WT): TAT - BT
    const waiting = turnaround - process.burst;

    scheduledProcesses.push({
      ...process,
      start,
      completion,
      turnaround,
      waiting,
    });

    // Update current time for the next process
    currentTime = completion;
  }

  return scheduledProcesses;
};

// --- Main Component ---

const FCFSScheduler: React.FC = () => {
  const [currentTheme, setTheme] = useState<ThemeKey>('orange');
  const { themeAccent, themeClasses } = useThemeStyles(currentTheme);

  const [processes, setProcesses] = useState<Process[]>([]);
  const [newProcess, setNewProcess] = useState<ProcessInput>({ name: '', arrival: '', burst: '' });
  const [error, setError] = useState<string | null>(null);

  // Auto-calculated scheduled results
  const scheduledProcesses = useMemo(() => calculateFCFS(processes), [processes]);

  // Calculated Averages
  const averages = useMemo(() => {
    if (scheduledProcesses.length === 0) {
      return { avgTAT: 0, avgWT: 0 };
    }
    const totalTAT = scheduledProcesses.reduce((sum, p) => sum + (p.turnaround || 0), 0);
    const totalWT = scheduledProcesses.reduce((sum, p) => sum + (p.waiting || 0), 0);

    return {
      avgTAT: totalTAT / scheduledProcesses.length,
      avgWT: totalWT / scheduledProcesses.length,
    };
  }, [scheduledProcesses]);

  // Input Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setError(null);
    setNewProcess(prev => ({ ...prev, [name]: value }));
  };

  const addProcess = useCallback(() => {
    const name = newProcess.name || `P${processes.length + 1}`;
    const arrival = parseInt(newProcess.arrival, 10);
    const burst = parseInt(newProcess.burst, 10);

    if (isNaN(arrival) || isNaN(burst) || arrival < 0 || burst <= 0) {
      setError('Please ensure Arrival Time is non-negative and Burst Time is positive.');
      return;
    }

    const process: Process = {
      id: processes.length + 1,
      name,
      arrival,
      burst,
    };

    setProcesses(prev => [...prev, process]);
    setNewProcess({ name: '', arrival: '', burst: '' });
    setError(null);
  }, [newProcess, processes.length]);

  const removeProcess = (id: number) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
  };

  const clearProcesses = () => {
    setProcesses([]);
    setNewProcess({ name: '', arrival: '', burst: '' });
    setError(null);
  };

  // --- Render Components ---

  const renderProcessInput = () => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
      <SectionHeader icon={ListPlus} title="Add New Process" theme={themeAccent} />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end mb-4">
        {/* Process Name */}
        <InputField
          label="Name (Optional)"
          name="name"
          value={newProcess.name}
          onChange={handleInputChange}
          placeholder={`P${processes.length + 1}`}
          theme={themeAccent}
        />
        {/* Arrival Time */}
        <InputField
          label="Arrival Time (AT)"
          name="arrival"
          value={newProcess.arrival}
          onChange={handleInputChange}
          type="number"
          min="0"
          theme={themeAccent}
        />
        {/* Burst Time */}
        <InputField
          label="Burst Time (BT)"
          name="burst"
          value={newProcess.burst}
          onChange={handleInputChange}
          type="number"
          min="1"
          theme={themeAccent}
        />
        {/* Action Button */}
        <button
          onClick={addProcess}
          className={`flex items-center justify-center p-3 text-white font-bold rounded-lg transition transform hover:scale-[1.02] ${themeClasses.button}`}
        >
          <ListPlus className="w-5 h-5 mr-2" />
          Add Process
        </button>
      </div>
      {error && <p className="text-rose-500 text-sm mt-2">{error}</p>}
    </div>
  );

  const renderGanttChart = () => {
    if (scheduledProcesses.length === 0) return null;

    const totalTime = scheduledProcesses.reduce((max, p) => Math.max(max, p.completion || 0), 0);

    // Generate unique background colors for each process
    const processColors: Record<number, string> = {};
    const colorPalette = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9', '#A855F7']; // Indigo, Emerald, Amber, Red, Sky, Violet
    scheduledProcesses.forEach((p, index) => {
      if (p.id !== undefined) {
        processColors[p.id] = colorPalette[index % colorPalette.length];
      }
    });

    // Create the Gantt chart bars
    const chartBars = scheduledProcesses.map((p) => {
      const widthPercentage = ((p.completion || 0) - (p.start || 0)) / totalTime * 100;
      return (
        <div
          key={p.id}
          className="relative h-12 flex items-center justify-center text-xs font-bold text-white shadow-lg overflow-hidden transition-all duration-500"
          style={{
            width: `${widthPercentage}%`,
            backgroundColor: processColors[p.id],
            minWidth: '20px', // Ensure visibility even for short bursts
            borderRadius: '4px',
          }}
          title={`Process: ${p.name}, Start: ${p.start}, Burst: ${p.burst}`}
        >
          {p.name}
        </div>
      );
    });

    // Create the timeline markers
    const timelineMarkers = scheduledProcesses.map((p, index) => ({
      time: p.start || 0,
      label: p.start === 0 && index === 0 ? '0' : String(p.start),
    })).concat([
      { time: totalTime, label: String(totalTime) }
    ]).filter((v, i, a) => a.findIndex(t => t.time === v.time) === i); // Remove duplicates

    const timeline = timelineMarkers.sort((a, b) => a.time - b.time).map((marker, index) => {
        const leftPercentage = (marker.time / totalTime) * 100;
        return (
            <div 
                key={index} 
                className="absolute top-full h-3 flex flex-col items-center" 
                style={{ left: `${leftPercentage}%`, transform: 'translateX(-50%)' }}
            >
                <div className="w-px h-2 bg-gray-500"></div>
                <span className="text-xs text-gray-300 mt-1">{marker.label}</span>
            </div>
        );
    });

    return (
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg mt-8 border border-gray-700">
        <SectionHeader icon={GanttChart} title="Gantt Chart (FCFS)" theme={themeAccent} />
        <div className="relative pt-4 pb-8">
          <div className="flex w-full space-x-1.5 border-t-2 border-b-2 border-gray-700 py-1">
            {chartBars}
          </div>
          <div className="relative">
            {timeline}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${themeClasses.mainBg} min-h-screen font-sans antialiased text-white pb-20`}>
      <ThemeSelector currentTheme={currentTheme} setTheme={setTheme} />

      {/* Header/Title */}
      <div className={`${themeClasses.headerBg} py-5 text-center shadow-2xl mb-12`}>
        <h1 className="text-3xl font-extrabold tracking-tight">
          FCFS CPU SCHEDULING SIMULATOR
        </h1>
        <p className="text-sm text-gray-200 mt-1">First-Come, First-Served Algorithm</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Input Area */}
        {renderProcessInput()}

        {/* Process List and Actions */}
        {processes.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                    <ChevronsRight className={`w-5 h-5 mr-2 ${themeClasses.icon}`} />
                    Processes ({processes.length})
                </h2>
                <button
                    onClick={clearProcesses}
                    className="flex items-center text-sm px-3 py-1 bg-rose-700 hover:bg-rose-800 rounded-lg transition"
                >
                    <Trash2 className="w-4 h-4 mr-1" /> Clear All
                </button>
            </div>
            
            {/* Using ProcessTableFixed and passing removeProcess handler */}
            <ProcessTableFixed processes={scheduledProcesses} theme={themeAccent} onDelete={removeProcess} />

            {/* Results */}
            <div className="mt-6 flex justify-end space-x-6">
                <ResultBox 
                    icon={Calculator} 
                    title="Avg Turnaround Time" 
                    value={averages.avgTAT.toFixed(2)} 
                    unit="units" 
                    theme={themeAccent} 
                />
                <ResultBox 
                    icon={Calculator} 
                    title="Avg Waiting Time" 
                    value={averages.avgWT.toFixed(2)} 
                    unit="units" 
                    theme={themeAccent} 
                />
            </div>
          </div>
        )}

        {/* Gantt Chart Display */}
        {renderGanttChart()}

        {/* Legend/Formulas */}
        <div className="mt-12">
            <SectionHeader icon={Play} title="Formulas & Legend" theme={themeAccent} />
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-3">
                    <p className="text-sm text-gray-300">
                        $$Turnaround Time = Completion Time - Arrival Time$$
                    </p>
                    <p className="text-sm text-gray-300">
                        $$Waiting Time = Turnaround Time - Burst Time$$
                    </p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <p className="text-sm font-bold text-white mb-2">Legend:</p>
                    <ul className="text-sm text-gray-400 space-y-1">
                        <li><span className={`font-semibold ${themeClasses.accentText}`}>AT:</span> Arrival Time</li>
                        <li><span className={`font-semibold ${themeClasses.accentText}`}>BT:</span> Burst Time (CPU Time)</li>
                        <li><span className={`font-semibold ${themeClasses.accentText}`}>CT:</span> Completion Time</li>
                        <li><span className={`font-semibold ${themeClasses.accentText}`}>TAT:</span> Turnaround Time</li>
                        <li><span className={`font-semibold ${themeClasses.accentText}`}>WT:</span> Waiting Time</li>
                    </ul>
                </div>
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`${themeClasses.footerBg} py-4 text-center text-xs text-gray-200 mt-16`}>
        FCFS Scheduler implemented in React/Next.js with Tailwind CSS
      </footer>
    </div>
  );
};

export default FCFSScheduler;

// --- Helper Components for FCFSScheduler ---

const InputField: React.FC<{
  label: string;
  name: keyof ProcessInput;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  theme: string;
}> = ({ label, name, value, onChange, placeholder, type = 'text', min = '0', theme }) => {
  const focusBorder = `focus:border-${theme}-500`;
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        className={`bg-gray-700 text-white p-2 rounded-lg border border-gray-600 ${focusBorder} focus:ring-0 outline-none transition`}
      />
    </div>
  );
};

// REMOVED THE INCORRECTLY STRUCTURED ProcessTable component

const ProcessTableFixed: React.FC<{ processes: Process[], theme: string, onDelete: (id: number) => void }> = ({ processes, theme, onDelete }) => {
  const headerBgMap: Record<string, string> = {
    orange: 'bg-orange-700',
    sky: 'bg-sky-700',
    emerald: 'bg-emerald-700',
    rose: 'bg-rose-700',
  };
  const headerBg = headerBgMap[theme] || headerBgMap.orange;

  // FIXED: Added className prop to the Th component definition
  const Th: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${headerBg} ${className}`}>
      {children}
    </th>
  );
  
  const tatColor = `text-${theme}-400`;
  const wtColor = `text-rose-400`;

  return (
    <div className="overflow-x-auto rounded-xl shadow-2xl border border-gray-700">
      <table className="min-w-full divide-y divide-gray-700">
        <thead>
          <tr>
            <Th>Process</Th>
            <Th><Clock className="inline w-4 h-4 mr-1 mb-0.5" /> AT</Th>
            <Th><Zap className="inline w-4 h-4 mr-1 mb-0.5" /> BT</Th>
            <Th><ChevronsRight className="inline w-4 h-4 mr-1 mb-0.5" /> ST</Th>
            <Th><Play className="inline w-4 h-4 mr-1 mb-0.5" /> CT</Th>
            <Th className={tatColor}><Calculator className="inline w-4 h-4 mr-1 mb-0.5" /> TAT</Th>
            <Th className={wtColor}><Calculator className="inline w-4 h-4 mr-1 mb-0.5" /> WT</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {processes.map((p) => (
            <tr key={p.id} className="hover:bg-gray-700 transition">
              <td className="px-4 py-3 whitespace-nowrap font-semibold text-white">{p.name}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-300">{p.arrival}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-300">{p.burst}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-300">{p.start}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-300">{p.completion}</td>
              <td className={`px-4 py-3 whitespace-nowrap font-medium ${tatColor}`}>{p.turnaround?.toFixed(2)}</td>
              <td className={`px-4 py-3 whitespace-nowrap font-medium ${wtColor}`}>{p.waiting?.toFixed(2)}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <button
                  onClick={() => onDelete(p.id)}
                  className="text-gray-400 hover:text-rose-500 transition"
                  title="Remove Process"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Helper for displaying results
const ResultBox: React.FC<{ icon: LucideIcon, title: string, value: string, unit: string, theme: string }> = ({ icon: Icon, title, value, unit, theme }) => {
    const iconColor = `text-${theme}-400`;
    const borderColor = `border-${theme}-600`;
    return (
        <div className={`bg-gray-800 p-4 rounded-xl shadow-lg border-t-4 ${borderColor} flex items-center w-1/2 md:w-auto`}>
            <Icon className={`w-8 h-8 mr-4 ${iconColor}`} />
            <div>
                <p className="text-sm text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-white">
                    {value}
                    <span className="text-sm font-normal ml-1">{unit}</span>
                </p>
            </div>
        </div>
    );
};
