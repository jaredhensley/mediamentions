import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useState } from 'react';

export default function SettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Settings</Typography>
      <FormControlLabel
        control={<Switch checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />}
        label="Email alerts for new mentions"
      />
      <FormControlLabel control={<Switch checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />} label="Enable dark mode" />
      <Typography color="text.secondary">These toggles are local-only for demo purposes.</Typography>
    </Stack>
  );
}
