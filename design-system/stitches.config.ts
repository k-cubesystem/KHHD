import { createStitches } from '@stitches/react';

export const {
    styled,
    css,
    globalCss,
    keyframes,
    getCssText,
    theme,
    createTheme,
    config,
} = createStitches({
    theme: {
        colors: {
            primary: '#ecb613', // Vitality Gold
            primaryHover: '#C5A028',
            background: '#FAf8f6', // Light mode base
            backgroundDark: '#1A1A1A', // Deep Ink Black
            surface: '#1E1E1E',
            text: '#1A1A1A',
            textDark: '#FFFFFF',
            royalIndigo: '#1e2130',
            mutedGold: '#C5A059',
            border: '#2A2A2A',
        },
        fonts: {
            system: 'system-ui',
            body: '"Noto Sans", "Noto Sans KR", sans-serif',
            heading: '"Noto Serif", "Noto Serif KR", serif',
            display: '"Noto Serif", "Noto Serif KR", serif',
        },
        fontSizes: {
            1: '12px',
            2: '14px',
            3: '16px',
            4: '20px',
            5: '24px',
            6: '32px',
        },
        space: {
            1: '4px',
            2: '8px',
            3: '16px',
            4: '24px',
            5: '32px',
            6: '64px',
        },
        radii: {
            1: '4px',
            2: '8px',
            3: '12px',
            round: '9999px',
        },
    },
    media: {
        bp1: '(min-width: 640px)',
        bp2: '(min-width: 768px)',
        bp3: '(min-width: 1024px)',
    },
});
