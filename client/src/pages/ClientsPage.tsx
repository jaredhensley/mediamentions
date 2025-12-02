import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
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
import { fetchClients, fetchMentions, fetchPressReleases, fetchPublications } from '../api';
import { Client, Mention, PressRelease, Publication } from '../data';
import MentionFormModal, { MentionFormData } from '../components/MentionFormModal';
import PressReleaseFormModal, { PressReleaseFormData } from '../components/PressReleaseFormModal';
import { formatDisplayDate } from '../utils/format';

export default function ClientsPage() {
  const [clientList, setClientList] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [tab, setTab] = useState<'press' | 'mentions'>('press');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [pressReleases, setPressReleases] = useState<PressRelease[]>([]);
  const [publicationList, setPublicationList] = useState<Publication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mentionModalOpen, setMentionModalOpen] = useState(false);
  const [pressModalOpen, setPressModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', industry: '', notes: '' });

  useEffect(() => {
    fetchClients()
      .then((data) => {
        setClientList(data);
        setSelectedClientId(data[0]?.id || '');
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
          (sentimentFilter === 'all' || mention.sentiment === sentimentFilter) &&
          (statusFilter === 'all' || mention.status === statusFilter)
        );
      }),
    [mentions, selectedClientId, sentimentFilter, statusFilter],
  );

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
      industry: clientForm.industry.trim() || 'General',
      notes: clientForm.notes.trim(),
    };

    setClientList((prev) => [...prev, newClient]);
    setClientForm({ name: '', industry: '', notes: '' });
    setSelectedClientId(newClient.id);
  };

  const handleExport = async () => {
    const endpoint = `/api/clients/${selectedClientId}/mentions/export`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      alert('Export failed');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedClient?.name || 'mentions'}.xlsx`;
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
                  label="Industry"
                  value={clientForm.industry}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, industry: e.target.value }))}
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
                    <TableCell>Industry</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientList.map((client) => (
                    <TableRow
                      key={client.id}
                      hover
                      selected={client.id === selectedClientId}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{client.industry || 'N/A'}</TableCell>
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
                <Tab value="press" label="Press releases" />
                <Tab value="mentions" label="Mentions" />
              </Tabs>

              <Divider sx={{ my: 2 }} />

              {tab === 'press' && (
                <Stack spacing={2}>
                  {clientPressReleases.map((pr) => (
                    <Card key={pr.id} variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1">{pr.title}</Typography>
                        <Typography color="text.secondary">{pr.date || pr.releaseDate}</Typography>
                        <Chip size="small" label={pr.status || 'draft'} sx={{ mt: 1 }} />
                        <Typography sx={{ mt: 1 }}>{pr.body || pr.content}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                  {clientPressReleases.length === 0 && (
                    <Typography color="text.secondary">No press releases yet.</Typography>
                  )}
                </Stack>
              )}

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
                    <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} displayEmpty>
                      <MenuItem value="all">All statuses</MenuItem>
                      <MenuItem value="new">New</MenuItem>
                      <MenuItem value="in-review">In review</MenuItem>
                      <MenuItem value="published">Published</MenuItem>
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
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
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
                          <TableCell>{mention.status}</TableCell>
                          <TableCell>{formatDisplayDate(mention.mentionDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {clientMentions.length === 0 && <Typography color="text.secondary">No mentions match the filters.</Typography>}
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
