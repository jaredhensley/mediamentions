import { Button, Divider, FormControlLabel, Stack, Switch, Typography, useTheme } from '@mui/material';
import { Download } from '@mui/icons-material';
import { useColorMode } from '../theme';

export default function SettingsPage() {
  const { toggle } = useColorMode();
  const theme = useTheme();

  const handleDownloadFalsePositives = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || '';
    window.open(`${apiBaseUrl}/admin/false-positives/export`, '_blank');
  };

  return (
    <Stack spacing={4}>
      <Stack spacing={2}>
        <Typography variant="h4">Settings</Typography>
        <FormControlLabel
          control={<Switch checked={theme.palette.mode === 'dark'} onChange={toggle} />}
          label="Enable dark mode"
        />
        <Typography color="text.secondary">Theme preference is saved locally in your browser.</Typography>
      </Stack>

      <Divider />

      <Stack spacing={2}>
        <Typography variant="h5">Admin Tools</Typography>
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Typography variant="h6">False Positives Export</Typography>
            <Typography color="text.secondary">
              Download a CSV file of all unverified mentions (verified = 0). These are likely false positives
              that failed verification.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadFalsePositives}
              sx={{ alignSelf: 'flex-start' }}
            >
              Download False Positives CSV
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}
