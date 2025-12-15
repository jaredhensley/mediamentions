import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { Client } from '../data';

interface RssFeedModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (url: string | null) => Promise<void>;
  client: Client | null;
}

export default function RssFeedModal({ open, onClose, onSave, client }: RssFeedModalProps) {
  const [feedUrl, setFeedUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && client) {
      setFeedUrl(client.alertsRssFeedUrl || '');
      setError(null);
    }
  }, [open, client]);

  const handleSave = async () => {
    const trimmedUrl = feedUrl.trim();

    // Validate URL if provided
    if (trimmedUrl) {
      try {
        new URL(trimmedUrl);
      } catch {
        setError('Please enter a valid URL');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(trimmedUrl || null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save RSS feed URL');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove the RSS feed subscription?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove RSS feed');
    } finally {
      setSaving(false);
    }
  };

  const hasExistingFeed = Boolean(client?.alertsRssFeedUrl);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {hasExistingFeed ? 'Manage RSS Feed' : 'Subscribe to RSS Feed'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Enter a Google Alerts RSS feed URL to automatically import mentions for{' '}
            <strong>{client?.name}</strong>. The feed will be polled every 2 hours.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="RSS Feed URL"
            placeholder="https://www.google.com/alerts/feeds/..."
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            fullWidth
            disabled={saving}
            helperText="Paste your Google Alerts RSS feed URL here"
          />

          {hasExistingFeed && (
            <Alert severity="info" sx={{ mt: 1 }}>
              This client already has an RSS feed configured. You can update the URL or remove the subscription.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {hasExistingFeed && (
          <Button
            onClick={handleRemove}
            color="error"
            disabled={saving}
            sx={{ mr: 'auto' }}
          >
            Remove Feed
          </Button>
        )}
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
