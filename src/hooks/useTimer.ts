import { useState, useRef, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export const useTimer = (initialDurationSeconds = 25 * 60) => {
    const [timeLeft, setTimeLeft] = useState(initialDurationSeconds);
    const [isActive, setIsActive] = useState(false);
    const endTimeRef = useRef<number | null>(null);
    const pausedTimeLeftRef = useRef<number>(initialDurationSeconds);

    // Sync state to ref for resume calculation
    useEffect(() => {
        if (!isActive) {
            pausedTimeLeftRef.current = timeLeft;
        }
    }, [isActive, timeLeft]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive) {
            // If starting/resuming, set the target end time
            if (!endTimeRef.current) {
                endTimeRef.current = Date.now() + (pausedTimeLeftRef.current * 1000);
            }

            interval = setInterval(() => {
                if (!endTimeRef.current) return;

                const now = Date.now();
                const secondsRemaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));

                setTimeLeft(secondsRemaining);

                if (secondsRemaining <= 0) {
                    setIsActive(false);
                    endTimeRef.current = null;
                    pausedTimeLeftRef.current = 0;
                    clearInterval(interval);
                }
            }, 500); // Check more frequently to avoid "off-by-one" visual lag
        } else {
            // When paused, clear the end time target so next start re-calculates it
            endTimeRef.current = null;
        }

        return () => clearInterval(interval);
    }, [isActive]);

    // Handle initial duration change
    useEffect(() => {
        if (!isActive) {
            setTimeLeft(initialDurationSeconds);
            pausedTimeLeftRef.current = initialDurationSeconds;
        }
    }, [initialDurationSeconds]);

    const startTimer = () => {
        setIsActive(true);
    };

    const pauseTimer = () => {
        setIsActive(false);
        // pausedTimeLeftRef is updated by the useEffect above
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(initialDurationSeconds);
        pausedTimeLeftRef.current = initialDurationSeconds;
        endTimeRef.current = null;
    };

    const setDuration = (seconds: number) => {
        if (!isActive) {
            setTimeLeft(seconds);
            pausedTimeLeftRef.current = seconds;
        }
    };

    return { timeLeft, isActive, startTimer, pauseTimer, resetTimer, setDuration };
};
