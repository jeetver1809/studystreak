export const getTodayStr = () => {
    // Return YYYY-MM-DD in local time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const isStudyCompletedToday = (lastStudyDate: string) => {
    return lastStudyDate === getTodayStr();
};

export const getMotivationalMessage = (streak: number) => {
    const messages = [
        "Every day counts!",
        "Keep the fire burning!",
        "Consistency is key.",
        "You're doing great!",
        "One more step towards mastery."
    ];
    return messages[streak % messages.length];
};
