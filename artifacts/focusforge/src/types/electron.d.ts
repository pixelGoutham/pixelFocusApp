interface ElectronAPI {
    platform: NodeJS.Platform;
    toggleFullscreen: () => Promise<void>;
    onEnterFullscreen: (callback: () => void) => () => void;
    onLeaveFullscreen: (callback: () => void) => () => void;
    setDiscordActivity: (activity: {
        details?: string;
        state?: string;
        startTimestamp?: number;
    }) => void;
    clearDiscordActivity: () => void;
    proposeTasks: (text: string) => Promise<{success: boolean; data?: any[]; error?: string }>;
    hideCaptureWindow: () => void;
    scheduleTaskNotification: (task: {
        id: string;
        date: string;
        startTime: string;
        endTime: string;
        subject: string;
        task:string;
        completed: boolean;
    }) => Promise<{success: boolean; error?: string }>;
    cancelTaskNotification: (taskId: string) => Promise<{success: boolean; error?: string }>;
    rescheduleAllNotifications: (tasks: Array <{
        id: string;
        date: string;
        startTime: string;
        endTime: string;
        subject: string;
        task: string;
        completed: boolean;
    }>) => Promise<{success: boolean; error?: string}>;
    getScheduledNotifications: () => Promise<{success: boolean; data?: Array<{
        taskId: string;
        title: string;
        body: string;
        scheduledTime: string;
    }>; error?: string }>;
    onTaskNotification: (callback: (data: {
        taskId: string;
        title: string;
        subject: string;
        startTime: string;
        endTime: string;
    }) => void) => () => void;
}

interface Window {
    electronAPI: ElectronAPI
}