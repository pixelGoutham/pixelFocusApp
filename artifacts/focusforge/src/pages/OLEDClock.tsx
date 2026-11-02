import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { useLocation } from 'wouter';
import { IndianRupee, X } from 'lucide-react';
import { set } from 'date-fns';

const SPRING_SMOOOTH = { type: 'spring', bounce: 0, duration: 0.6} as const;

const AnimatedDigit = ({ digit }: { digit: string }) => {
    return (
        <div className='relative inline-flex flex-col justify-center overflow-hidden h-[1.1em] w-[0.6em]'>
            <AnimatePresence mode='popLayout'>
                <motion.span
                    key={digit}
                    initial={{ y: '80%', opacity: 0, scale: 0.9}}
                    animate={{ y: '0%', opacity: 1, scale: 1}}
                    exit={{ y: '-80%', opacity:0, scale: 1.1}}
                    transition={{ type: 'spring', bounce: 0, duration: 0.5}}
                    className='absolute inset-0 flex items-center justify-center'
                >
                    {digit}
                </motion.span>
            </AnimatePresence>
        </div>
    );
};

export default function OLEDClock() {
    const [, setLocation ] = useLocation();
    const controls = useAnimation();
    const [time, setTime] = useState(new Date());

    const [isIdle, setIsIdle ] = useState(false);
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const resetIdleTimer = () => {
            setIsIdle(false);
            clearTimeout(timeout);
            timeout = setTimeout(() => setIsIdle(true), 3000);
        };

        window.addEventListener('mousemove', resetIdleTimer);
        window.addEventListener('keydown', resetIdleTimer);
        window.addEventListener('touchstart', resetIdleTimer);

        resetIdleTimer();
        return () => {
            window.removeEventListener('mousemove', resetIdleTimer);
            window.removeEventListener('keydown', resetIdleTimer);
            window.removeEventListener('touchstart', resetIdleTimer);
        };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                await controls.start({opacity: 0, y:50, transition: SPRING_SMOOOTH});
                setLocation('/')
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return() => window.removeEventListener('keydown', handleKeyDown);
    }, [controls, setLocation]);

    let hours = time.getHours();
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hoursStr = hours.toString().padStart(2, '0');

    const handleDragEnd = async (event: any, info: PanInfo) => {
        const { offset, velocity } = info;
        const decelerationRate = 0.998;
        const projectedEndpoint = offset.y + ((velocity.y  / 1000) * decelerationRate) /(1-decelerationRate);

        if (projectedEndpoint > 200 || velocity.y > 500) {
            await controls.start({
                y: '100vh',
                opacity: 0,
                transition: {type: 'spring', bounce: 0, velocity: velocity.y}
            });
            setLocation('/');
        } else {
            controls.start({y:0, transition: SPRING_SMOOOTH});
        }
    };

    return (
        <motion.div
            initial= {{ opacity: 0}}
            animate = {{ opacity: 1}}
            exit={{ opacity: 0}}
            transition={{ duration: 1}}
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden ${isIdle ? 'cursor-none' : 'cursor-auto'}`}
        >
            <motion.div
                drag = 'y'
                dragConstraints={{ top: 0, bottom: 0}}
                dragElastic={0.4}
                onDragEnd={handleDragEnd}
                animate={controls}
                className='flex-1 flex flex-col items-center justify-center w-full h-full active:cursor-grabbing'
            >
                {/*Lissajous curve drift to prevent za burn in */}
                <motion.div
                    animate={{
                        x: ['0vw', '12vw', '-8vw', '6vw', '-10vw', '0vw'],
                        y: ['0vh', '-10vh', '8vh', '-6vh', '12vh', '0vh']
                    }}
                    transition={{
                        x: {repeat:Infinity, duration: 127, ease: 'easeInOut'},
                        y: {repeat:Infinity, duration:113, ease: 'easeInOut'}
                    }}
                    className='flex flex-col items-center text-zinc-300'
                >
                    <div className='flex items-baseline font-medium tabular-nums tracking-[-0.04em] leading-none'
                        style={{ fontSize: 'clamp(5rem, 18vw, 15rem)', fontOpticalSizing: 'auto'}}>

                            <AnimatedDigit digit={hoursStr[0]}/>
                            <AnimatedDigit digit={hoursStr[1]}/>

                            <motion.span
                                animate={{ opacity: [1, 0.2, 1]}}
                                transition={{ repeat: Infinity, duration: 2, ease:'linear'}}
                                className='mx-1 sm:mx-4 pb-4'
                            >
                                :
                            </motion.span>

                            <AnimatedDigit digit={minutes[0]}/>
                            <AnimatedDigit digit={minutes[1]}/>
                        </div>

                        <div className='flex items-center justify-between w-full mt-8 px-4 sm:px-12 text-zinc-500 font-medium tracking-widest uppercase'
                            style={{fontSize: 'clamp(1rem, 2vw, 1.5rem)'}}>
                                <div className='flex items-center gap-2'>
                                    <span className='tabular-nums text-zinc-400'>{seconds}</span>
                                    <span>SEC</span>
                                </div>

                                <div>
                                    {time.toLocaleDateString('en-US', {weekday: 'short', month: 'long', day: 'numeric'})}
                                </div>

                                <div className='text-zinc-400'>
                                    {ampm}
                                </div>
                            </div>
                </motion.div>
                </motion.div>

                <AnimatePresence>
                    {!isIdle && (
                        <motion.button
                            initial={{opacity: 0, scale: 0.9}}
                            animate={{opacity: 0.3, scale:1}}
                            exit={{opacity: 1, scale:1.05}}
                            whileHover={{opacity:1, scale:1.05}}
                            whileTap={{scale: 0.95}}
                            onClick={async () => {
                                await controls.start({opacity: 0, y:50, transition: SPRING_SMOOOTH})
                                setLocation('/');
                            }}
                            className='absolute top-12 left-12 p-4 rounded-full bg-white/10 border border-white/20 transition-colors backdrop-blur-md text-white'
                            aria-label='Exit Clock'
                        >
                            <X className='w-6 h-6'/>
                        </motion.button>
                    )}
                </AnimatePresence>
        </motion.div>
    );
}