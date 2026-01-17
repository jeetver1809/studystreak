import { useState, useRef, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export const useTimer = (initialDurationSeconds = 25 * 60) => {
    const [timeLeft, setTimeLeft] = useState(initialDurationSeconds);
    const [isActive, setIsActive] = useState(false);
    const endTimeRef = useRef<number | null>(null);

    // TODO: Handle background state more robustly with timestamp calculation
    // implementation_plan.md says "Prevent instant completion" 

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) return 0;
                    return prev - 1;
                });
            }, 1000);
        } else if (timeLeft <= 0) {
            setIsActive(false);
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    // Allow updating duration if timer is not active
    useEffect(() => {
        if (!isActive) {
            setTimeLeft(initialDurationSeconds);
        }
    }, [initialDurationSeconds, isActive]);

    const startTimer = () => setIsActive(true);
    const pauseTimer = () => setIsActive(false);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(initialDurationSeconds);
    };

    const setDuration = (seconds: number) => {
        if (!isActive) {
            setTimeLeft(seconds);
        }
    };

    return { timeLeft, isActive, startTimer, pauseTimer, resetTimer, setDuration };
};
