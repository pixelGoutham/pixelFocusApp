import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/StoreContext';
import { X } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const QuickCapture: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [extractedCount, setExtractedCount] = useState(0);
  const { setTasks } = useStore();

  // Hide capture window when Escape is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // @ts-ignore: electronAPI is exposed via preload.js
        window.electronAPI.hideCaptureWindow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    try {
      // @ts-ignore: electronAPI is exposed via preload.js
      const result = await window.electronAPI.proposeTasks(input);
      if (result.success) {
        const tasks = result.data as Array<{
          task: string;
          subject: string;
          priority: 'High' | 'Medium' | 'Low';
          date: string | null;
          startTime: string | null;
          endTime: string | null;
          isAmbiguousDate: boolean;
        }>;

        // Add tasks to store
        const now = new Date();
        const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

        const taskObjects = tasks.map(t => ({
          // @ts-ignore: crypto.randomUUID is available
          id: crypto.randomUUID(),
          task: t.task,
          subject: t.subject,
          priority: t.priority,
          date: t.date ?? today,
          startTime: t.startTime ?? '00:00',
          endTime: t.endTime ?? '00:00',
          quadrant: 'urgent-important',
          completed: false,
          pomodoroSessions: 0,
          createdAt: now.toISOString(),
        }));

        setTasks(prev => [...prev, ...taskObjects]);
        setConfirmation(`${tasks.length} Tasks Extracted: ${tasks.map(t => t.subject).join(', ')}`);
        setExtractedCount(tasks.length);

        // Auto-hide after 2 seconds
        setTimeout(() => {
          // @ts-ignore: electronAPI is exposed via preload.js
          window.electronAPI.hideCaptureWindow();
        }, 2000);
      } else {
        // Handle error - for now just reset
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error extracting tasks:', err);
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 170
      }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm pointer-events-none"
    >
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{
          type: 'spring',
          damping: 18,
          stiffness: 160
        }}
        className="relative pointer-events-all bg-zinc-900/70 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl w-[600px] max-w-[90vw] mx-4"
      >
        <div className="flex flex-col items-center p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-bold text-white">
              Pixel Flow Capture
            </h2>
            <button
              onClick={() => {
                // @ts-ignore: electronAPI is exposed via preload.js
                window.electronAPI.hideCaptureWindow();
              }}
              className="text-white/60 hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Input or Confirmation */}
          {!confirmation && !isLoading ? (
            <div className="w-full space-y-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
                placeholder="Type your tasks here... (e.g., 'Finish physics report by Friday, start web dev project Monday')"
                className="w-full px-5 py-3 bg-zinc-800/50 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                autoFocus
              />
              <p className="text-xs text-white/50 w-full text-center">
                Hit Enter to extract tasks • Escape to close
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white/50 rounded-full animate-spin" />
              <p className="text-sm text-white/70">Extracting tasks...</p>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-6 py-3">
                <p className="text-green-400 font-medium">{confirmation}</p>
              </div>
              <p className="text-xs text-white/50">
                Window will close automatically...
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuickCapture;