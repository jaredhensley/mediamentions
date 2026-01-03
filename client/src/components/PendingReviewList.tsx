import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  fetchPendingReview,
  acceptPendingReview,
  rejectPendingReview,
  PendingReviewMention
} from '../api';
import { useToast } from '../hooks/useToast';

export default function PendingReviewList() {
  const [mentions, setMentions] = useState<PendingReviewMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const { showError, showSuccess } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const loadMentions = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingReview();
      setMentions(data);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMentions();
  }, []);

  const handleAccept = async (id: number) => {
    setProcessing(id);
    try {
      await acceptPendingReview(id);
      setMentions((prev) => prev.filter((m) => m.id !== id));
      showSuccess('Mention verified');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to accept mention');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessing(id);
    try {
      await rejectPendingReview(id);
      setMentions((prev) => prev.filter((m) => m.id !== id));
      showSuccess('Mention rejected');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to reject mention');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">Loading pending reviews...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (mentions.length === 0) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography color="text.secondary">No mentions pending review</Typography>
            <IconButton onClick={loadMentions} size="small">
              <RefreshIcon />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ px: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Pending Review
            <Chip label={mentions.length} size="small" color="warning" sx={{ ml: 1 }} />
          </Typography>
          <IconButton onClick={loadMentions} size="small">
            <RefreshIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2}>
          These mentions could not be automatically verified. Please review each one and accept or
          reject.
        </Typography>

        {/* Mobile: Card-based view */}
        {isMobile ? (
          <Stack spacing={2}>
            {mentions.map((mention) => (
              <Card key={mention.id} variant="outlined">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={1.5}>
                    {/* Title */}
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {mention.title}
                    </Typography>

                    {/* Meta row */}
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      alignItems="center"
                      useFlexGap
                    >
                      <Chip
                        label={mention.clientName}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                      {mention.source && (
                        <Chip label={mention.source} size="small" variant="outlined" />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {new Date(mention.mentionDate).toLocaleDateString()}
                      </Typography>
                    </Stack>

                    {/* Link */}
                    {mention.link && (
                      <Link
                        href={mention.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: '0.8125rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        View article <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </Link>
                    )}

                    {/* Actions */}
                    <Stack direction="row" spacing={1} pt={0.5}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckIcon />}
                        onClick={() => handleAccept(mention.id)}
                        disabled={processing === mention.id}
                        fullWidth
                      >
                        Accept
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CloseIcon />}
                        onClick={() => handleReject(mention.id)}
                        disabled={processing === mention.id}
                        fullWidth
                      >
                        Reject
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          /* Desktop: Table view */
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mentions.map((mention) => (
                <TableRow key={mention.id}>
                  <TableCell>
                    <Chip label={mention.clientName} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ maxWidth: 300 }}>
                      <Tooltip title={mention.title}>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {mention.title}
                        </Typography>
                      </Tooltip>
                      {mention.link && (
                        <Link
                          href={mention.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          View article <OpenInNewIcon sx={{ fontSize: 12 }} />
                        </Link>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {mention.source || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(mention.mentionDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Accept - Mark as verified">
                        <span>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleAccept(mention.id)}
                            disabled={processing === mention.id}
                            sx={{ minWidth: 'auto', px: 1 }}
                          >
                            <CheckIcon fontSize="small" />
                          </Button>
                        </span>
                      </Tooltip>
                      <Tooltip title="Reject - Mark as false positive">
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleReject(mention.id)}
                            disabled={processing === mention.id}
                            sx={{ minWidth: 'auto', px: 1 }}
                          >
                            <CloseIcon fontSize="small" />
                          </Button>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
