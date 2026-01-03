import {
  Button,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { useColorMode } from '../theme';
import { exportFalsePositives, exportDeletedMentions } from '../api';
import { useToast } from '../hooks/useToast';
import PendingReviewList from '../components/PendingReviewList';

export default function SettingsPage() {
  const { toggle } = useColorMode();
  const theme = useTheme();
  const { showError } = useToast();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDownloadFalsePositives = async () => {
    try {
      await exportFalsePositives();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to download false positives');
    }
  };

  const handleDownloadDeletedMentions = async () => {
    try {
      await exportDeletedMentions();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to download deleted mentions');
    }
  };

  return (
    <Stack spacing={isMobile ? 3 : 4}>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Settings
        </Typography>
        <FormControlLabel
          control={<Switch checked={theme.palette.mode === 'dark'} onChange={toggle} />}
          label="Enable dark mode"
        />
        <Typography variant="body2" color="text.secondary">
          Theme preference is saved locally in your browser.
        </Typography>
      </Stack>

      <Divider />

      <Stack spacing={3}>
        <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Admin Tools
        </Typography>

        <PendingReviewList />

        <Stack spacing={1}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            False Positives Export
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Download a CSV file of all rejected mentions (verified = 0). These are mentions that
            failed verification.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleDownloadFalsePositives}
            fullWidth={isMobile}
            sx={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}
          >
            Download False Positives CSV
          </Button>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Deleted Mentions Export
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Download a CSV file of all mentions that have been deleted. Use this to analyze patterns
            and improve filtering logic.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleDownloadDeletedMentions}
            fullWidth={isMobile}
            sx={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}
          >
            Download Deleted Mentions CSV
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
