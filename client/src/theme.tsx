import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider, PaletteMode, createTheme } from '@mui/material';

const ColorModeContext = createContext<{ mode: PaletteMode; toggle: () => void }>({ mode: 'light', toggle: () => {} });

export function useColorMode() {
  return useContext(ColorModeContext);
}

export function ColorModeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<PaletteMode>(() => (localStorage.getItem('color-mode') as PaletteMode) || 'light');

  useEffect(() => {
    localStorage.setItem('color-mode', mode);
  }, [mode]);

  const toggle = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#9c27b0',
          },
        },
      }),
    [mode],
  );

  const value = useMemo(() => ({ mode, toggle }), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
