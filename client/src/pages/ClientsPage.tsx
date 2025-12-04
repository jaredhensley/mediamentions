import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSearchParams } from 'react-router-dom';
import { fetchClients, fetchMentions, fetchPressReleases, fetchPublications, deleteMention } from '../api';
import { Client, Mention, PressRelease, Publication } from '../data';
import MentionFormModal, { MentionFormData } from '../components/MentionFormModal';
import PressReleaseFormModal, { PressReleaseFormData } from '../components/PressReleaseFormModal';
import { formatDisplayDate } from '../utils/format';

export default function ClientsPage() {
  const [clientList, setClientList] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [tab, setTab] = useState<'press' | 'mentions'>('mentions');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [pressReleases, setPressReleases] = useState<PressRelease[]>([]);
  const [publicationList, setPublicationList] = useState<Publication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [mentionModalOpen, setMentionModalOpen] = useState(false);
  const [pressModalOpen, setPressModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', notes: '' });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchClients()
      .then((data) => {
        setClientList(data);
      })
      .catch((err) => setError(err.message));
    fetchMentions()
      .then(setMentions)
      .catch((err) => setError(err.message));
    fetchPressReleases()
      .then(setPressReleases)
      .catch((err) => setError(err.message));
    fetchPublications()
      .then(setPublicationList)
      .catch((err) => setError(err.message));
  }, []);

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

  const clientPressReleases = useMemo(
    () => pressReleases.filter((pr) => pr.clientId === selectedClientId),
    [pressReleases, selectedClientId],
  );

  const clientMentions = useMemo(
    () =>
      mentions.filter((mention) => {
        return (
          mention.clientId === selectedClientId &&
          (sentimentFilter === 'all' || mention.sentiment === sentimentFilter)
        );
      }),
    [mentions, selectedClientId, sentimentFilter],
  );

  const mentionCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    mentions.forEach((mention) => {
      counts[mention.clientId] = (counts[mention.clientId] || 0) + 1;
    });
    return counts;
  }, [mentions]);

  const handleMentionSave = (data: MentionFormData) => {
    setMentions((prev) => [...prev, { ...data, id: prev.length + 1 }]);
  };

  const handlePressSave = (data: PressReleaseFormData) => {
    setPressReleases((prev) => [...prev, { ...data, id: prev.length + 1 }]);
  };

  const handleClientSave = () => {
    const trimmedName = clientForm.name.trim();
    if (!trimmedName) {
      return;
    }

    const nextId = clientList.length ? Math.max(...clientList.map((c) => c.id)) + 1 : 1;
    const newClient = {
      id: nextId,
      name: trimmedName,
      notes: clientForm.notes.trim(),
    };

    setClientList((prev) => [...prev, newClient]);
    setClientForm({ name: '', notes: '' });
    setSelectedClientId(newClient.id);
  };

  const handleDeleteMention = async (id: number) => {
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

  const handleExport = async () => {
    const endpoint = `/clients/${selectedClientId}/mentions/export`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      alert('Export failed');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedClient?.name || 'mentions'}.xls`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Clients</Typography>
      {error && <Typography color="error">{error}</Typography>}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
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
                />
                <TextField
                  label="Notes"
                  value={clientForm.notes}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, notes: e.target.value }))}
                  fullWidth
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
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setSearchParams({ clientId: String(client.id) }, { replace: true });
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <span>{client.name}</span>
                          <Badge badgeContent={mentionCounts[client.id] || 0} color="primary" sx={{ ml: 1 }} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Box>
                  <Typography variant="h6">{selectedClient?.name}</Typography>
                  <Typography color="text.secondary">{selectedClient?.notes}</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={() => setMentionModalOpen(true)}>
                    Add mention
                  </Button>
                  <Button variant="contained" onClick={() => setPressModalOpen(true)}>
                    Add press release
                  </Button>
                </Stack>
              </Stack>

              <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mt: 2 }}>
                <Tab value="mentions" label="Mentions" />
                <Tab value="press" label="Press releases" />
              </Tabs>

              <Divider sx={{ my: 2 }} />

              {tab === 'mentions' && (
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Select
                      size="small"
                      value={sentimentFilter}
                      onChange={(e) => setSentimentFilter(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="all">All sentiments</MenuItem>
                      <MenuItem value="positive">Positive</MenuItem>
                      <MenuItem value="neutral">Neutral</MenuItem>
                      <MenuItem value="negative">Negative</MenuItem>
                    </Select>
                    <Button variant="outlined" onClick={handleExport}>
                      Export to Excel
                    </Button>
                  </Stack>

                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Sentiment</TableCell>
                        <TableCell>Date</TableCell>
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
                          <TableCell>{mention.source || publicationList.find((p) => p.id === mention.publicationId)?.name}</TableCell>
                          <TableCell>
                            <Chip label={mention.sentiment || 'N/A'} color={mention.sentiment === 'positive' ? 'success' : 'default'} size="small" />
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
                  {clientMentions.length === 0 && <Typography color="text.secondary">No mentions match the filters.</Typography>}
                </Stack>
              )}

              {tab === 'press' && (
                <Stack spacing={2}>
                  {clientPressReleases.map((pr) => (
                    <Card key={pr.id} variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1">{pr.title}</Typography>
                        <Typography color="text.secondary">{pr.releaseDate}</Typography>
                        <Typography sx={{ mt: 1 }}>{pr.content}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                  {clientPressReleases.length === 0 && (
                    <Typography color="text.secondary">No press releases yet.</Typography>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <MentionFormModal
        open={mentionModalOpen}
        onClose={() => setMentionModalOpen(false)}
        onSave={handleMentionSave}
        publicationOptions={publicationList}
      />
      <PressReleaseFormModal
        open={pressModalOpen}
        onClose={() => setPressModalOpen(false)}
        onSave={handlePressSave}
        clients={clientList}
      />
    </Stack>
  );
}
