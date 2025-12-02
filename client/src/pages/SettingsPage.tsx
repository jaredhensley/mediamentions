import { FormControlLabel, Stack, Switch, Typography, useTheme } from '@mui/material';
import { useColorMode } from '../theme';

export default function SettingsPage() {
  const { toggle } = useColorMode();
  const theme = useTheme();

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Settings</Typography>
      <FormControlLabel
        control={<Switch checked={theme.palette.mode === 'dark'} onChange={toggle} />}
        label="Enable dark mode"
      />
      <Typography color="text.secondary">Theme preference is saved locally in your browser.</Typography>
    </Stack>
  );
}
