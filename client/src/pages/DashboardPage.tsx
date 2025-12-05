import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { fetchClients, fetchMentions, deleteMention } from '../api';
import { Client, Mention } from '../data';
import { formatDisplayDate, formatRelativeTime } from '../utils/format';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';

type DateFilter = '1d' | '3d' | '1w' | '30d' | 'all' | 'custom';

export default function DashboardPage() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const navigate = useNavigate();

  // Handle WebSocket messages for real-time updates
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'mention_verified') {
      // Update the verified status of a mention
      setMentions((prev) =>
        prev.map((mention) =>
          mention.id === message.mentionId
            ? { ...mention, verified: message.verified ?? mention.verified }
            : mention
        )
      );
    } else if (message.type === 'new_mention' && message.mention) {
      // Add new mention to the list
      setMentions((prev) => {
        const newMention = message.mention as Mention;
        // Avoid duplicates
        if (prev.some((m) => m.id === newMention.id)) {
          return prev;
        }
        return [newMention, ...prev];
      });
    }
  }, []);

  useWebSocket(handleWebSocketMessage);

  useEffect(() => {
    fetchMentions()
      .then(setMentions)
      .catch((err) => setError(err.message));
    fetchClients()
      .then(setClients)
      .catch((err) => setError(err.message));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const getDateThreshold = (filter: DateFilter): Date | null => {
    const now = new Date();
    switch (filter) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '3d':
        return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      case '1w':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'all':
        return null;
      case 'custom':
        return null; // Custom handled separately
      default:
        return null;
    }
  };

  const sortedMentions = useMemo(() => {
    // Only show verified mentions (verified = 1)
    const verifiedMentions = mentions.filter((mention) => mention.verified === 1);
    return [...verifiedMentions].sort((a, b) => new Date(b.mentionDate).getTime() - new Date(a.mentionDate).getTime());
  }, [mentions]);

  const filteredMentions = useMemo(() => {
    if (dateFilter === 'custom') {
      return sortedMentions.filter((mention) => {
        const mentionDate = mention.mentionDate.slice(0, 10);
        const afterStart = !customStartDate || mentionDate >= customStartDate;
        const beforeEnd = !customEndDate || mentionDate <= customEndDate;
        return afterStart && beforeEnd;
      });
    }

    const threshold = getDateThreshold(dateFilter);
    if (!threshold) return sortedMentions;

    return sortedMentions.filter((mention) => {
      const mentionDate = new Date(mention.mentionDate);
      return mentionDate >= threshold;
    });
  }, [sortedMentions, dateFilter, customStartDate, customEndDate]);

  const todaysMentions = useMemo(
    () => sortedMentions.filter((mention) => mention.mentionDate.slice(0, 10) === today),
    [sortedMentions, today],
  );
  const clientNameById = useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client.name])),
    [clients],
  );

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this mention?')) {
      return;
    }

    try {
      await deleteMention(id);
      setMentions((prev) => prev.filter((mention) => mention.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mention');
    }
  };

  const verifiedCount = useMemo(() => mentions.filter((m) => m.verified === 1).length, [mentions]);
  const unverifiedCount = useMemo(() => mentions.filter((m) => m.verified === 0).length, [mentions]);

  const quickStats = [
    { label: 'Verified mentions', value: verifiedCount },
    { label: 'False positives', value: unverifiedCount },
    { label: 'Today', value: todaysMentions.length },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Dashboard</Typography>
      <Grid container spacing={2}>
        {quickStats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card>
              <CardContent>
                <Typography variant="overline">{stat.label}</Typography>
                <Typography variant="h5">{stat.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Typography variant="h6">Recent mentions</Typography>
              <Chip label={`${filteredMentions.length} results`} color="primary" variant="outlined" />
            </Box>

            <Box display="flex" flexDirection="column" gap={2}>
              <ButtonGroup size="small" variant="outlined">
                <Button
                  variant={dateFilter === '1d' ? 'contained' : 'outlined'}
                  onClick={() => setDateFilter('1d')}
                >
                  Last 24h
                </Button>
                <Button
                  variant={dateFilter === '3d' ? 'contained' : 'outlined'}
                  onClick={() => setDateFilter('3d')}
                >
                  Last 3 days
                </Button>
                <Button
                  variant={dateFilter === '1w' ? 'contained' : 'outlined'}
                  onClick={() => setDateFilter('1w')}
                >
                  Last week
                </Button>
                <Button
                  variant={dateFilter === '30d' ? 'contained' : 'outlined'}
                  onClick={() => setDateFilter('30d')}
                >
                  Last 30 days
                </Button>
                <Button
                  variant={dateFilter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setDateFilter('all')}
                >
                  All time
                </Button>
                <Button
                  variant={dateFilter === 'custom' ? 'contained' : 'outlined'}
                  onClick={() => setDateFilter('custom')}
                >
                  Custom
                </Button>
              </ButtonGroup>

              {dateFilter === 'custom' && (
                <Box display="flex" gap={2} flexWrap="wrap">
                  <TextField
                    label="Start date"
                    type="date"
                    size="small"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="End date"
                    type="date"
                    size="small"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              )}
            </Box>

            {error && <Typography color="error">{error}</Typography>}
            {filteredMentions.length === 0 ? (
              <Typography color="text.secondary">
                {mentions.length === 0 ? 'No mentions recorded yet.' : 'No mentions in selected date range.'}
              </Typography>
            ) : (
              <List>
                {filteredMentions.map((mention) => (
                <ListItem
                  key={mention.id}
                  divider
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(mention.id)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={
                      mention.link ? (
                        <Link href={mention.link} target="_blank" rel="noreferrer noopener" underline="hover">
                          {mention.title}
                        </Link>
                      ) : (
                        mention.title
                      )
                    }
                    secondary={
                      <>
                        <Typography component="span" display="block" color="text.primary">
                          {formatDisplayDate(mention.mentionDate)}
                          {formatRelativeTime(mention.mentionDate)
                            ? ` • ${formatRelativeTime(mention.mentionDate)}`
                            : ''}
                          {' • '}
                          <Link
                            component="button"
                            type="button"
                            underline="hover"
                            onClick={() => navigate(`/clients?clientId=${mention.clientId}`)}
                          >
                            {clientNameById[mention.clientId] || `Client #${mention.clientId}`}
                          </Link>
                        </Typography>
                        {mention.subjectMatter && (
                          <Typography component="span" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                            {mention.subjectMatter}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
