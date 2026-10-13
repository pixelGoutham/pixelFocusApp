import React, { useState } from 'react';
import { useStore } from '../../lib/StoreContext';
import { X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

const PixelFlowCapture: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [proposals, setProposals] = useState<Array<{
    id: string;
    task: string;
    subject: string;
    priority: 'High' | 'Medium' | 'Low';
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    quadrant: 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'neither';
    completed: boolean;
    pomodoroSessions: number;
    createdAt: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTasks } = useStore();

  // Generate a UUID using crypto API (available in Electron renderer)
  const generateId = () => {
    // @ts-ignore: crypto.randomUUID is available in modern browsers and Node.js
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback to pseudo-random ID
    return Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);
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
        const now = new Date();
        const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

        const taskObjects: typeof proposals[0][] = tasks.map(t => ({
          id: generateId(),
          task: t.task,
          subject: t.subject,
          priority: t.priority,
          date: t.date ?? today, // if null, use today
          startTime: t.startTime ?? '00:00',
          endTime: t.endTime ?? '00:00',
          quadrant: 'urgent-important', // default quadrant as per instruction
          completed: false,
          pomodoroSessions: 0,
          createdAt: now.toISOString(),
        }));
        setProposals(taskObjects);
      } else {
        // Extract error message safely to avoid raw JSON display
        const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error
          ? (result.error as { message: string }).message
          : String(result.error || 'Unknown error');
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = (task: typeof proposals[0]) => {
    // Add the approved task to the store
    setTasks(prev => [...prev, task]);
    // Remove from proposals
    setProposals(prev => prev.filter(t => t.id !== task.id));
  };

  // Apple Design inspired spring animation
  const modalVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 20,     // Apple-like damping (critically damped)
        stiffness: 170,  // Corresponds to response ~0.3s
        velocity: 0
      }
    },
    exit: {
      scale: 0.95,
      opacity: 0,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 170,
        velocity: 0
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={modalVariants}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="relative w-[400px] max-w-[90vh]">
          {/* Apple-style backdrop with blur */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>

          {/* Main card with Apple Design materials */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 18,
              stiffness: 160
            }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full"
          >
            <div className="flex justify-between items-start p-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Pixel Flow AI Capture
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-5">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type or paste your tasks here..."
                  className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 h-24 resize-y bg-gray-50 dark:bg-gray-700"
                  rows={4}
                />
              </div>
              <div className="flex justify-between items-center">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !input.trim()}
                  className={`px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 transition-all
                    ${isLoading ? 'bg-gray-400 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? 'Processing...' : 'Extract Tasks'}
                </button>
                {error && (
                  <span className="text-red-400 text-sm ml-3">{error}</span>
                )}
              </div>
            </div>

            {proposals.length > 0 && (
              <div className="mt-5">
                <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">Proposals:</h3>
                <div className="space-y-3">
                  {proposals.map((task, index) => (
                    <div key={task.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{task.task}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {task.subject} • {task.priority} • {task.date} • {task.startTime}-{task.endTime}
                          </p>
                        </div>
                        <button
                          onClick={() => handleApprove(task)}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PixelFlowCapture;