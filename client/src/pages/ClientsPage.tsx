import { useMemo, useState } from 'react';
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
import { clients, mentions as initialMentions, pressReleases as initialPressReleases, publications } from '../data';
import MentionFormModal, { MentionFormData } from '../components/MentionFormModal';
import PressReleaseFormModal, { PressReleaseFormData } from '../components/PressReleaseFormModal';

export default function ClientsPage() {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [tab, setTab] = useState<'press' | 'mentions'>('press');
  const [mentions, setMentions] = useState(initialMentions);
  const [pressReleases, setPressReleases] = useState(initialPressReleases);
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mentionModalOpen, setMentionModalOpen] = useState(false);
  const [pressModalOpen, setPressModalOpen] = useState(false);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

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
    setMentions((prev) => [...prev, { ...data, id: `mention-${prev.length + 1}` }]);
  };

  const handlePressSave = (data: PressReleaseFormData) => {
    setPressReleases((prev) => [...prev, { ...data, id: `pr-${prev.length + 1}` }]);
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
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Client list
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Industry</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow
                      key={client.id}
                      hover
                      selected={client.id === selectedClientId}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{client.industry}</TableCell>
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
                        <Typography color="text.secondary">{pr.date}</Typography>
                        <Chip size="small" label={pr.status} sx={{ mt: 1 }} />
                        <Typography sx={{ mt: 1 }}>{pr.body}</Typography>
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
                        <TableCell>Publication</TableCell>
                        <TableCell>Sentiment</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {clientMentions.map((mention) => (
                        <TableRow key={mention.id}>
                          <TableCell>{mention.title}</TableCell>
                          <TableCell>{publications.find((p) => p.id === mention.publicationId)?.name}</TableCell>
                          <TableCell>
                            <Chip label={mention.sentiment} color={mention.sentiment === 'positive' ? 'success' : 'default'} size="small" />
                          </TableCell>
                          <TableCell>{mention.status}</TableCell>
                          <TableCell>{mention.date}</TableCell>
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

      <MentionFormModal open={mentionModalOpen} onClose={() => setMentionModalOpen(false)} onSave={handleMentionSave} />
      <PressReleaseFormModal
        open={pressModalOpen}
        onClose={() => setPressModalOpen(false)}
        onSave={handlePressSave}
        clients={clients}
      />
    </Stack>
  );
}
