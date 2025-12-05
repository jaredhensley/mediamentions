import { Button, Divider, FormControlLabel, Stack, Switch, Typography, useTheme } from '@mui/material';
import { Download } from '@mui/icons-material';
import { useColorMode } from '../theme';
import { exportFalsePositives } from '../api';
import { useToast } from '../hooks/useToast';
import PendingReviewList from '../components/PendingReviewList';

export default function SettingsPage() {
  const { toggle } = useColorMode();
  const theme = useTheme();
  const { showError } = useToast();

  const handleDownloadFalsePositives = async () => {
    try {
      await exportFalsePositives();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to download false positives');
    }
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

      <Stack spacing={3}>
        <Typography variant="h5">Admin Tools</Typography>

        <PendingReviewList />

        <Stack spacing={1}>
          <Typography variant="h6">False Positives Export</Typography>
          <Typography color="text.secondary">
            Download a CSV file of all rejected mentions (verified = 0). These are mentions that failed verification.
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
  );
}
