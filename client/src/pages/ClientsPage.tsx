import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSearchParams } from 'react-router-dom';
import {
  fetchClients,
  fetchMentions,
  fetchPublications,
  deleteMention,
  exportClientMentions,
  updateClient,
  createClient,
  deleteClient
} from '../api';
import { Client, Mention, Publication } from '../data';
import MentionFormModal, { MentionFormData } from '../components/MentionFormModal';
import RssFeedModal from '../components/RssFeedModal';
import MentionCard from '../components/MentionCard';
import { formatDisplayDate } from '../utils/format';
import { useToast } from '../hooks/useToast';

type SortColumn = 'title' | 'source' | 'sentiment' | 'date';
type SortDirection = 'asc' | 'desc';

export default function ClientsPage() {
  const [clientList, setClientList] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [publicationList, setPublicationList] = useState<Publication[]>([]);
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [mentionModalOpen, setMentionModalOpen] = useState(false);
  const [rssModalOpen, setRssModalOpen] = useState(false);
  const [rssModalClient, setRssModalClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', notes: '' });
  const [mobileTab, setMobileTab] = useState(0); // 0 = clients, 1 = mentions
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchClients()
      .then((data) => {
        setClientList(data);
      })
      .catch((err) => showError(err.message));
    fetchMentions()
      .then(setMentions)
      .catch((err) => showError(err.message));
    fetchPublications()
      .then(setPublicationList)
      .catch((err) => showError(err.message));
  }, [showError]);

  useEffect(() => {
    if (!clientList.length) return;

    const paramIdRaw = searchParams.get('clientId');
    const paramId = paramIdRaw ? Number(paramIdRaw) : null;
    const validParamId = paramId && clientList.some((c) => c.id === paramId) ? paramId : null;
    const fallbackId = clientList[0]?.id || '';
    const nextId = validParamId || fallbackId;

    if (nextId && selectedClientId !== nextId) {
      setSelectedClientId(nextId);
    }

    if (!validParamId && nextId) {
      setSearchParams({ clientId: String(nextId) }, { replace: true });
    }
  }, [clientList, searchParams, selectedClientId, setSearchParams]);

  const selectedClient = clientList.find((c) => c.id === selectedClientId);

  const clientMentions = useMemo(() => {
    const filtered = mentions.filter((mention) => {
      return (
        mention.verified === 1 &&
        mention.clientId === selectedClientId &&
        (sentimentFilter === 'all' || mention.sentiment === sentimentFilter)
      );
    });

    // Sort the filtered mentions
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      const getSource = (m: Mention) =>
        m.source || publicationList.find((p) => p.id === m.publicationId)?.name || '';

      switch (sortColumn) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'source':
          comparison = getSource(a).localeCompare(getSource(b));
          break;
        case 'sentiment':
          comparison = (a.sentiment || '').localeCompare(b.sentiment || '');
          break;
        case 'date':
          comparison = new Date(a.mentionDate).getTime() - new Date(b.mentionDate).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [mentions, selectedClientId, sentimentFilter, sortColumn, sortDirection, publicationList]);

  const mentionCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    mentions.forEach((mention) => {
      // Only count verified mentions
      if (mention.verified === 1) {
        counts[mention.clientId] = (counts[mention.clientId] || 0) + 1;
      }
    });
    return counts;
  }, [mentions]);

  const handleMentionSave = (data: MentionFormData) => {
    setMentions((prev) => [...prev, { ...data, id: prev.length + 1 }]);
  };

  const handleClientSave = async () => {
    const trimmedName = clientForm.name.trim();
    if (!trimmedName) {
      return;
    }

    try {
      const newClient = await createClient({
        name: trimmedName,
        contactEmail: '',
        notes: clientForm.notes.trim()
      });
      setClientList((prev) => [...prev, newClient]);
      setClientForm({ name: '', notes: '' });
      setSelectedClientId(newClient.id);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create client');
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClientId || !selectedClient) return;

    const mentionCount = mentionCounts[selectedClientId] || 0;
    const message =
      mentionCount > 0
        ? `Are you sure you want to delete "${selectedClient.name}"? This will also delete ${mentionCount} mention(s).`
        : `Are you sure you want to delete "${selectedClient.name}"?`;

    if (!confirm(message)) {
      return;
    }

    try {
      await deleteClient(selectedClientId);
      setClientList((prev) => prev.filter((c) => c.id !== selectedClientId));
      setMentions((prev) => prev.filter((m) => m.clientId !== selectedClientId));
      const remaining = clientList.filter((c) => c.id !== selectedClientId);
      if (remaining.length > 0) {
        setSelectedClientId(remaining[0].id);
        setSearchParams({ clientId: String(remaining[0].id) }, { replace: true });
      } else {
        setSelectedClientId('');
        setSearchParams({}, { replace: true });
      }
      // On mobile, go back to client list after deletion
      if (isMobile) {
        setMobileTab(0);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  const handleDeleteMention = async (id: number) => {
    if (!confirm('Are you sure you want to delete this mention?')) {
      return;
    }

    try {
      await deleteMention(id);
      setMentions((prev) => prev.filter((mention) => mention.id !== id));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete mention');
    }
  };

  const handleExport = async () => {
    if (!selectedClientId) return;
    try {
      await exportClientMentions(selectedClientId, selectedClient?.name || 'mentions');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to export mentions');
    }
  };

  const handleRssIconClick = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setRssModalClient(client);
    setRssModalOpen(true);
  };

  const handleRssFeedSave = async (url: string | null) => {
    if (!rssModalClient) return;

    const updatedClient = await updateClient(rssModalClient.id, { alertsRssFeedUrl: url });
    setClientList((prev) =>
      prev.map((c) =>
        c.id === rssModalClient.id ? { ...c, alertsRssFeedUrl: updatedClient.alertsRssFeedUrl } : c
      )
    );
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  };

  const handleSelectClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setSearchParams({ clientId: String(clientId) }, { replace: true });
    // On mobile, switch to mentions tab when client is selected
    if (isMobile) {
      setMobileTab(1);
    }
  };

  // Client List component (used in both mobile and desktop)
  const ClientListContent = (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Client list
        </Typography>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Client name"
            value={clientForm.name}
            onChange={(e) => setClientForm((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
            size={isMobile ? 'small' : 'medium'}
          />
          <TextField
            label="Notes"
            value={clientForm.notes}
            onChange={(e) => setClientForm((prev) => ({ ...prev, notes: e.target.value }))}
            fullWidth
            size={isMobile ? 'small' : 'medium'}
          />
          <Button variant="contained" onClick={handleClientSave} disabled={!clientForm.name.trim()}>
            Add client
          </Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clientList.map((client) => (
              <TableRow
                key={client.id}
                hover
                selected={client.id === selectedClientId}
                sx={{ cursor: 'pointer' }}
                onClick={() => handleSelectClient(client.id)}
              >
                <TableCell>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    width="100%"
                  >
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <span>{client.name}</span>
                      <Badge
                        badgeContent={mentionCounts[client.id] || 0}
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    <Tooltip
                      title={client.alertsRssFeedUrl ? 'RSS feed active' : 'Set up RSS feed'}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => handleRssIconClick(client, e)}
                        sx={{
                          color: client.alertsRssFeedUrl ? 'warning.main' : 'action.disabled',
                          '&:hover': {
                            color: client.alertsRssFeedUrl ? 'warning.dark' : 'warning.main'
                          }
                        }}
                      >
                        <RssFeedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  // Mentions content component
  const MentionsContent = (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {/* Mobile: Back button and client name */}
        {isMobile && (
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <IconButton size="small" onClick={() => setMobileTab(0)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {selectedClient?.name}
            </Typography>
          </Box>
        )}

        {/* Desktop: Client header */}
        {!isMobile && (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h6">{selectedClient?.name}</Typography>
              <Typography color="text.secondary">{selectedClient?.notes}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setMentionModalOpen(true)}>
                Add mention
              </Button>
              <Button variant="outlined" color="error" onClick={handleDeleteClient}>
                Delete client
              </Button>
            </Stack>
          </Stack>
        )}

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Mentions
        </Typography>
        {selectedClient && (
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <Select
                size="small"
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                displayEmpty
                fullWidth={isMobile}
              >
                <MenuItem value="all">All sentiments</MenuItem>
                <MenuItem value="positive">Positive</MenuItem>
                <MenuItem value="neutral">Neutral</MenuItem>
                <MenuItem value="negative">Negative</MenuItem>
              </Select>
              <Button variant="outlined" onClick={handleExport} fullWidth={isMobile}>
                Export to Excel
              </Button>
            </Stack>

            {/* Mobile: Action buttons */}
            {isMobile && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setMentionModalOpen(true)}
                  fullWidth
                >
                  Add mention
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleDeleteClient}
                  fullWidth
                >
                  Delete client
                </Button>
              </Stack>
            )}

            {/* Mobile: Card-based view */}
            {isMobile ? (
              <Stack spacing={1.5}>
                {clientMentions.map((mention) => (
                  <MentionCard
                    key={mention.id}
                    mention={mention}
                    sourceName={
                      mention.source ||
                      publicationList.find((p) => p.id === mention.publicationId)?.name
                    }
                    onDelete={handleDeleteMention}
                    showSource
                    showSentiment
                  />
                ))}
                {clientMentions.length === 0 && (
                  <Typography color="text.secondary">No mentions match the filters.</Typography>
                )}
              </Stack>
            ) : (
              /* Desktop: Table view */
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={sortColumn === 'title'}
                          direction={sortColumn === 'title' ? sortDirection : 'asc'}
                          onClick={() => handleSort('title')}
                        >
                          Title
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortColumn === 'source'}
                          direction={sortColumn === 'source' ? sortDirection : 'asc'}
                          onClick={() => handleSort('source')}
                        >
                          Source
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortColumn === 'sentiment'}
                          direction={sortColumn === 'sentiment' ? sortDirection : 'asc'}
                          onClick={() => handleSort('sentiment')}
                        >
                          Sentiment
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortColumn === 'date'}
                          direction={sortColumn === 'date' ? sortDirection : 'desc'}
                          onClick={() => handleSort('date')}
                        >
                          Date
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clientMentions.map((mention) => (
                      <TableRow key={mention.id}>
                        <TableCell>
                          {mention.link ? (
                            <a href={mention.link} target="_blank" rel="noreferrer noopener">
                              {mention.title}
                            </a>
                          ) : (
                            mention.title
                          )}
                        </TableCell>
                        <TableCell>
                          {mention.source ||
                            publicationList.find((p) => p.id === mention.publicationId)?.name}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={mention.sentiment || 'N/A'}
                            color={mention.sentiment === 'positive' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDisplayDate(mention.mentionDate)}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleDeleteMention(mention.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {clientMentions.length === 0 && (
                  <Typography color="text.secondary">No mentions match the filters.</Typography>
                )}
              </>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Stack spacing={isMobile ? 2 : 3}>
      <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        Clients
      </Typography>

      {/* Mobile: Tabbed view */}
      {isMobile ? (
        <>
          <Tabs
            value={mobileTab}
            onChange={(_, newValue) => setMobileTab(newValue)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Clients" />
            <Tab label="Mentions" disabled={!selectedClientId} />
          </Tabs>
          {mobileTab === 0 ? ClientListContent : MentionsContent}
        </>
      ) : (
        /* Desktop: Side-by-side grid */
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            {ClientListContent}
          </Grid>
          <Grid item xs={12} md={8}>
            {MentionsContent}
          </Grid>
        </Grid>
      )}

      <MentionFormModal
        open={mentionModalOpen}
        onClose={() => setMentionModalOpen(false)}
        onSave={handleMentionSave}
        publicationOptions={publicationList}
      />
      <RssFeedModal
        open={rssModalOpen}
        onClose={() => {
          setRssModalOpen(false);
          setRssModalClient(null);
        }}
        onSave={handleRssFeedSave}
        client={rssModalClient}
      />
    </Stack>
  );
}
