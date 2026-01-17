export const theme = {
    colors: {
        background: '#FFFFFF',
        surface: '#F8F9FA',
        surfaceHighlight: '#FFFFFF',
        primary: '#4F46E5', // Electric Indigo
        primaryForeground: '#FFFFFF',
        secondary: '#E0E7FF',
        secondaryForeground: '#4F46E5',
        accent: '#10B981', // Neo-Mint
        text: {
            primary: '#111827',
            secondary: '#6B7280',
            disabled: '#9CA3AF',
            inverse: '#FFFFFF'
        },
        border: '#E5E7EB',
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
    },
    gradients: {
        primary: ['#4F46E5', '#7C3AED'], // Indigo to Violet
        success: ['#10B981', '#059669'], // Emerald to Green
        fire: ['#F59E0B', '#EF4444'],    // Amber to Red
        surface: ['#FFFFFF', '#F8F9FA'],
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
        xxl: 48,
    },
    borderRadius: {
        s: 8,
        m: 12,
        l: 16,
        xl: 24,
        round: 9999,
    },
    text: {
        h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
        h2: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
        h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
        body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
        caption: { fontSize: 14, fontWeight: '400', lineHeight: 20, color: '#6B7280' },
        button: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
    },
    shadows: {
        small: {
            shadowColor: "#4F46E5",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
        },
        medium: {
            shadowColor: "#4F46E5",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 4,
        },
        large: {
            shadowColor: "#4F46E5",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 30,
            elevation: 8,
        },
    }
} as const;

export type Theme = typeof theme;
