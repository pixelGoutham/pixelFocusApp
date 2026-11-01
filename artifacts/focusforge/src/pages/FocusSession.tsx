import React, {useState, useEffect} from 'react';
import { motion, useAnimation, PanInfo, PanHandler} from 'framer-motion';
import { useLocation } from 'wouter';
import {Play, Pause, X} from 'lucide-react';
import { off } from 'node:cluster';
import { format } from 'node:path';

const SPRING_SMOOTH = {type: 'spring', bounce: 0, duration: 0.4} as const;
const SPRING_MOMENTUM = {type: 'spring', bounce: 0.2, duration: 0.4} as const;

export default function FocusSession () {
    const [, setLocation] = useLocation();
    const controls = useAnimation();
    const [timeLeft, setTimeLeft] = useState(25*60);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft((t) => t-1), 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
        }
        return() => clearInterval(interval);
    }, [isActive, timeLeft]);

    const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { offset, velocity } = info;
        const decelerationRate = 0.998;
        const projectedEndpoint = offset.y + ((velocity.y / 1000) * decelerationRate) / ( 1- decelerationRate);
        if (projectedEndpoint > 300 || velocity.y > 600) {
            await controls.start({
                y: '100vh',
                opacity: 0,
                transition: {type: 'spring', bounce: 0, velocity: velocity.y }
            });
            setLocation('/pomodoro');
        } else {
            controls.start({
                y: 0,
                transition: SPRING_SMOOTH
            });
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds/60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    return (
        <motion.div
            initial= {{y: '100%', opacity: 0}}
            animate={{y: 0, opacity: 1}}
            exit={{y: '100%', opacity: 0}}
            transition={SPRING_SMOOTH}
            className='fixed inset-0 z-100 flex flex-col bg-background/95  backdrop-blur-3xl saturate-180 overflow-hidden'
        >
            <motion.div
                drag='y'
                dragConstraints= {{ top: 0, bottom: 0}}
                dragElastic={0.4}
                onDragEnd = {handleDragEnd}
                animate={controls}
                className='flex-1 flex flex-col items-center justify-center relative w-full h-full cursor-grab active:cursor-grabbing'
            >
                <div className='absolute top-6 w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20 ' />
                <motion.div 
                    layout
                    className='flex flex-col items-center pointer-events-none'
                >
                    <h1 
                        className='font-medium tabular-nums tracking-[-0.03em] leading-none text-foreground'
                        style={{
                            fontSize: 'clamp(5rem, 20vw, 16rem)',
                            fontOpticalSizing: 'auto'
                        }}
                    >
                        {formatTime(timeLeft)}
                    </h1>
                    <motion.p
                        layout
                        className='text-lg sm:text-2xl text-zinc-500 dark:text-zinc-400 mt-4 font-medium tracking-wide'
                    >
                        {isActive ? 'Deep Work' : 'Paused'}
                    </motion.p>
                </motion.div>
            </motion.div>
            <motion.div
                initial={{y: 40, opacity: 0}}
                animate={{ y:0, opacity:1 }}
                transition={{ ...SPRING_MOMENTUM, delay: 0.1}}
                className='absolute bottom-12 inset-x-0 mx-auto max-w-sm flex items-center justify-between p-4 rounded-4xl bg-white/60 dark:bg-white/8 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/12 shadow-2xl'
            >
                <button
                    onClick={async () => {
                        await controls.start({ y: '100vh', opacity: 0, transition: SPRING_SMOOTH});
                        setLocation('/pomodoro')
                    }}
                    className='p-4 rounded-full text-zinc-500 hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-white/10 active:scale-95 transition-all focus-visible:bg-white dark:focus-visible:bg-white/8 focus-visible:ring-zinc-400'
                    aria-label='End Session'
                >
                    <X className='w-6 h-6' />
                </button>

                <button 
                    onClick={() => setIsActive(!isActive)}
                    className='flex items-center justify-center w-20 h-20 rounded-full bg-foreground text-background active:scale-[0.92] transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-400/30'
                    aria-label={isActive ? "Pause" : "Play"}
                >
                    {isActive ? (
                        <Pause className='w-8 h-8 fill-current' />
                    ) : (
                        <Play className='w-8 h-8 fill-current ml-1' />
                    )}
                </button>
            </motion.div>
        </motion.div>
    );
}