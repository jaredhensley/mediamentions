import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid,
  Link,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { ResponsiveBar } from '@nivo/bar';
import { useNavigate } from 'react-router-dom';
import { fetchClients, fetchMentions, deleteMention } from '../api';
import { Client, Mention } from '../data';
import { formatDisplayDate } from '../utils/format';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import { useToast } from '../hooks/useToast';
import MentionCard from '../components/MentionCard';

type DateFilter = '1d' | '3d' | '1w' | '30d' | 'all' | 'custom';
type SortColumn = 'client' | 'title' | 'date';
type SortDirection = 'asc' | 'desc';

export default function DashboardPage() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const navigate = useNavigate();
  const { showError } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
      .catch((err) => showError(err.message));
    fetchClients()
      .then(setClients)
      .catch((err) => showError(err.message));
  }, [showError]);

  const today = new Date().toISOString().slice(0, 10);

  const clientNameById = useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client.name])),
    [clients]
  );

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

    return [...verifiedMentions].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'client':
          comparison = (clientNameById[a.clientId] || '').localeCompare(
            clientNameById[b.clientId] || ''
          );
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'date':
          comparison = new Date(a.mentionDate).getTime() - new Date(b.mentionDate).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [mentions, sortColumn, sortDirection, clientNameById]);

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

  const ITEMS_PER_PAGE = isMobile ? 5 : 10;
  const totalPages = Math.ceil(filteredMentions.length / ITEMS_PER_PAGE);
  const paginatedMentions = useMemo(
    () => filteredMentions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filteredMentions, page, ITEMS_PER_PAGE]
  );

  const todaysMentions = useMemo(
    () => sortedMentions.filter((mention) => mention.mentionDate.slice(0, 10) === today),
    [sortedMentions, today]
  );

  // Reset selection and page when filter changes
  useEffect(() => {
    setSelectedIds(new Set());
    setPage(1);
  }, [dateFilter, customStartDate, customEndDate]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
    setPage(1); // Reset to first page when sorting changes
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredMentions.map((m) => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} mention(s)?`)) {
      return;
    }

    try {
      await Promise.all([...selectedIds].map((id) => deleteMention(id)));
      setMentions((prev) => prev.filter((mention) => !selectedIds.has(mention.id)));
      setSelectedIds(new Set());
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete mentions');
    }
  };

  const handleDeleteMention = async (id: number) => {
    if (!confirm('Are you sure you want to delete this mention?')) return;
    try {
      await deleteMention(id);
      setMentions((prev) => prev.filter((m) => m.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete mention');
    }
  };

  const verifiedCount = useMemo(() => mentions.filter((m) => m.verified === 1).length, [mentions]);
  const unverifiedCount = useMemo(
    () => mentions.filter((m) => m.verified === 0).length,
    [mentions]
  );

  const quickStats = [
    { label: 'Verified', value: verifiedCount },
    { label: 'False positives', value: unverifiedCount },
    { label: 'Today', value: todaysMentions.length }
  ];

  // Prepare bar chart data - mentions by client, stacked by publication
  const { chartData, publicationKeys } = useMemo(() => {
    // Count mentions per source (publication)
    const sourceCounts: Record<string, number> = {};
    sortedMentions.forEach((mention) => {
      const source = mention.source || 'Unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    // Get top 5 publications, rest become "Other"
    const sortedSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
    const topSources = sortedSources.slice(0, 5).map(([name]) => name);
    const hasOther = sortedSources.length > 5;

    // Build publication keys for the chart
    const keys = hasOther ? [...topSources, 'Other'] : topSources;

    // Group mentions by client and publication
    const clientData: Record<number, Record<string, number>> = {};

    sortedMentions.forEach((mention) => {
      if (!clientData[mention.clientId]) {
        clientData[mention.clientId] = {};
        keys.forEach((key) => {
          clientData[mention.clientId][key] = 0;
        });
      }

      const source = mention.source || 'Unknown';
      const key = topSources.includes(source) ? source : 'Other';
      if (clientData[mention.clientId][key] !== undefined) {
        clientData[mention.clientId][key]++;
      }
    });

    // Convert to Nivo bar format
    const data = Object.entries(clientData).map(([clientId, pubs]) => ({
      client: clientNameById[Number(clientId)] || `Client #${clientId}`,
      ...pubs
    }));

    return { chartData: data, publicationKeys: keys };
  }, [sortedMentions, clientNameById]);

  return (
    <Stack
      sx={{
        height: isMobile ? 'auto' : 'calc(100vh - 112px)',
        overflow: isMobile ? 'visible' : 'hidden'
      }}
    >
      <Typography
        variant="h4"
        sx={{ flexShrink: 0, mb: 1, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
      >
        Dashboard
      </Typography>

      {/* Quick Stats */}
      <Grid container spacing={1} sx={{ flexShrink: 0, mb: 1 }}>
        {quickStats.map((stat) => (
          <Grid item xs={4} sm={6} md={3} key={stat.label}>
            <Card>
              <CardContent sx={{ py: 1, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: 1 } }}>
                <Typography
                  variant="overline"
                  sx={{ lineHeight: 1.2, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                >
                  {stat.label}
                </Typography>
                <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid
        container
        spacing={1}
        sx={{ flex: isMobile ? 'none' : 1, minHeight: 0, height: isMobile ? 'auto' : '100%' }}
      >
        {/* Mentions List */}
        <Grid
          item
          xs={12}
          md={7}
          sx={{ display: 'flex', minHeight: 0, maxHeight: isMobile ? 'none' : '100%' }}
        >
          <Card
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              maxHeight: isMobile ? 'none' : '100%',
              overflow: 'hidden'
            }}
          >
            <CardContent
              sx={{
                py: 1.5,
                px: { xs: 1.5, sm: 2 },
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              <Stack spacing={1} sx={{ flex: 1, minHeight: 0 }}>
                {/* Header */}
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                >
                  <Typography variant="subtitle1">Recent mentions</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {selectedIds.size > 0 && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleBulkDelete}
                      >
                        Delete ({selectedIds.size})
                      </Button>
                    )}
                    <Chip
                      label={`${filteredMentions.length} results`}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                </Box>

                {/* Date Filters */}
                <Box display="flex" flexDirection="column" gap={1}>
                  <ToggleButtonGroup
                    size="small"
                    value={dateFilter}
                    exclusive
                    onChange={(_, value) => value && setDateFilter(value)}
                    sx={{
                      flexWrap: 'wrap',
                      '& .MuiToggleButton-root': {
                        px: { xs: 1.5, sm: 2 },
                        py: 0.5,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }
                    }}
                  >
                    <ToggleButton value="1d">24h</ToggleButton>
                    <ToggleButton value="3d">3d</ToggleButton>
                    <ToggleButton value="1w">1w</ToggleButton>
                    <ToggleButton value="30d">30d</ToggleButton>
                    <ToggleButton value="all">All</ToggleButton>
                    <ToggleButton value="custom">Custom</ToggleButton>
                  </ToggleButtonGroup>

                  {dateFilter === 'custom' && (
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <TextField
                        label="Start date"
                        type="date"
                        size="small"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 140 }}
                      />
                      <TextField
                        label="End date"
                        type="date"
                        size="small"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 140 }}
                      />
                    </Box>
                  )}
                </Box>

                {/* Mentions Content */}
                {filteredMentions.length === 0 ? (
                  <Typography color="text.secondary">
                    {mentions.length === 0
                      ? 'No mentions recorded yet.'
                      : 'No mentions in selected date range.'}
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      overflow: 'auto'
                    }}
                  >
                    {/* Mobile: Card-based view */}
                    {isMobile ? (
                      <Stack spacing={1.5}>
                        {paginatedMentions.map((mention) => (
                          <MentionCard
                            key={mention.id}
                            mention={mention}
                            clientName={clientNameById[mention.clientId]}
                            selected={selectedIds.has(mention.id)}
                            onSelect={handleSelectOne}
                            onDelete={handleDeleteMention}
                            onClientClick={(clientId) => navigate(`/clients?clientId=${clientId}`)}
                            showClient
                          />
                        ))}
                      </Stack>
                    ) : (
                      /* Desktop: Table view */
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={
                                  filteredMentions.length > 0 &&
                                  filteredMentions.every((m) => selectedIds.has(m.id))
                                }
                                indeterminate={
                                  filteredMentions.some((m) => selectedIds.has(m.id)) &&
                                  !filteredMentions.every((m) => selectedIds.has(m.id))
                                }
                                onChange={(e) => handleSelectAll(e.target.checked)}
                              />
                            </TableCell>
                            <TableCell sx={{ px: 1 }}>
                              <TableSortLabel
                                active={sortColumn === 'client'}
                                direction={sortColumn === 'client' ? sortDirection : 'asc'}
                                onClick={() => handleSort('client')}
                              >
                                Client
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ px: 1 }}>
                              <TableSortLabel
                                active={sortColumn === 'title'}
                                direction={sortColumn === 'title' ? sortDirection : 'asc'}
                                onClick={() => handleSort('title')}
                              >
                                Title
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ px: 1 }}>
                              <TableSortLabel
                                active={sortColumn === 'date'}
                                direction={sortColumn === 'date' ? sortDirection : 'desc'}
                                onClick={() => handleSort('date')}
                              >
                                Date
                              </TableSortLabel>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedMentions.map((mention) => (
                            <TableRow key={mention.id} selected={selectedIds.has(mention.id)}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  size="small"
                                  checked={selectedIds.has(mention.id)}
                                  onChange={(e) => handleSelectOne(mention.id, e.target.checked)}
                                />
                              </TableCell>
                              <TableCell sx={{ px: 1 }}>
                                <Chip
                                  label={
                                    clientNameById[mention.clientId] ||
                                    `Client #${mention.clientId}`
                                  }
                                  size="small"
                                  variant="outlined"
                                  onClick={() => navigate(`/clients?clientId=${mention.clientId}`)}
                                  sx={{ cursor: 'pointer' }}
                                />
                              </TableCell>
                              <TableCell sx={{ px: 1 }}>
                                <Box sx={{ maxWidth: 280 }}>
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
                              <TableCell sx={{ px: 1, whiteSpace: 'nowrap' }}>
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  {formatDisplayDate(mention.mentionDate)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    {totalPages > 1 && (
                      <Box display="flex" justifyContent="center" pt={1}>
                        <Pagination
                          count={totalPages}
                          page={page}
                          onChange={(_, value) => setPage(value)}
                          size="small"
                        />
                      </Box>
                    )}
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Chart */}
        <Grid item xs={12} md={5} sx={{ display: 'flex', minHeight: isMobile ? 280 : 300 }}>
          <Card
            variant="outlined"
            sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 'inherit' }}
          >
            <CardContent
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                py: 1.5,
                px: { xs: 1, sm: 2 },
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              <Typography variant="subtitle1" sx={{ flexShrink: 0 }} gutterBottom>
                Mentions by Client
              </Typography>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <ResponsiveBar
                  data={chartData}
                  keys={publicationKeys}
                  indexBy="client"
                  margin={{
                    top: 10,
                    right: isMobile ? 20 : 100,
                    bottom: 50,
                    left: isMobile ? 40 : 60
                  }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={(bar) =>
                    bar.id === 'Other'
                      ? '#9e9e9e'
                      : ['#e8c1a0', '#f47560', '#f1e15b', '#e8a838', '#61cdbb'][
                          publicationKeys.indexOf(bar.id as string) % 5
                        ]
                  }
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -25,
                    truncateTickAt: isMobile ? 8 : 12
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  legends={
                    isMobile
                      ? []
                      : [
                          {
                            dataFrom: 'keys',
                            anchor: 'bottom-right',
                            direction: 'column',
                            justify: false,
                            translateX: 100,
                            translateY: 0,
                            itemsSpacing: 2,
                            itemWidth: 90,
                            itemHeight: 20,
                            itemDirection: 'left-to-right',
                            itemOpacity: 0.85,
                            symbolSize: 12,
                            effects: [
                              {
                                on: 'hover',
                                style: {
                                  itemOpacity: 1
                                }
                              }
                            ]
                          }
                        ]
                  }
                  tooltip={({ id, value, color, indexValue }) => (
                    <Box
                      sx={{
                        background: 'white',
                        padding: '8px 12px',
                        border: '1px solid #ccc',
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="body2">
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 12,
                            height: 12,
                            backgroundColor: color,
                            mr: 1
                          }}
                        />
                        <strong>{indexValue}</strong> - {id}: {value}
                      </Typography>
                    </Box>
                  )}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
