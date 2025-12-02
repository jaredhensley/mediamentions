import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { fetchMentions, fetchPublications } from '../api';
import { Mention, Publication } from '../data';
import MentionFormModal, { MentionFormData } from '../components/MentionFormModal';

export default function MentionsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [publicationFilter, setPublicationFilter] = useState<'all' | number>('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [rows, setRows] = useState<Mention[]>([]);
  const [publicationList, setPublicationList] = useState<Publication[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMentions()
      .then(setRows)
      .catch((err) => setError(err.message));
    fetchPublications()
      .then(setPublicationList)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((mention) => {
        return (
          (statusFilter === 'all' || mention.status === statusFilter) &&
          (publicationFilter === 'all' || mention.publicationId === publicationFilter) &&
          (sentimentFilter === 'all' || mention.sentiment === sentimentFilter) &&
          mention.title.toLowerCase().includes(search.toLowerCase())
        );
      }),
    [rows, statusFilter, publicationFilter, sentimentFilter, search],
  );

  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Title', flex: 1 },
    {
      field: 'publicationId',
      headerName: 'Publication',
      flex: 1,
      valueGetter: (params) => publicationList.find((p) => p.id === params.value)?.name || params.value,
    },
    { field: 'mentionDate', headerName: 'Date', width: 130 },
    {
      field: 'sentiment',
      headerName: 'Sentiment',
      width: 140,
      renderCell: (params) => <Chip label={params.value || 'N/A'} color={params.value === 'positive' ? 'success' : 'default'} size="small" />,
    },
    { field: 'status', headerName: 'Status', width: 140 },
  ];

  const handleSave = (data: MentionFormData) => {
    setRows((prev) => [...prev, { ...data, id: prev.length + 1 }]);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Mentions</Typography>
        <Chip label={`Total: ${filtered.length}`} color="primary" />
        <Box>
          <MentionFormModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
            publicationOptions={publicationList}
          />
        </Box>
      </Stack>

      {error && <Typography color="error">{error}</Typography>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField label="Search" value={search} onChange={(e) => setSearch(e.target.value)} size="small" />
        <TextField select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small">
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="new">New</MenuItem>
          <MenuItem value="in-review">In review</MenuItem>
          <MenuItem value="published">Published</MenuItem>
        </TextField>
        <TextField
          select
          label="Publication"
          value={publicationFilter}
          onChange={(e) => setPublicationFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          size="small"
        >
          <MenuItem value="all">All</MenuItem>
          {publicationList.map((pub) => (
            <MenuItem key={pub.id} value={pub.id}>
              {pub.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Sentiment"
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
          size="small"
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="positive">Positive</MenuItem>
          <MenuItem value="neutral">Neutral</MenuItem>
          <MenuItem value="negative">Negative</MenuItem>
        </TextField>
        <Button variant="contained" onClick={() => setModalOpen(true)}>
          New mention
        </Button>
      </Stack>

      <div style={{ height: 520, width: '100%' }}>
        <DataGrid rows={filtered} columns={columns} pageSizeOptions={[5, 10, 20]} initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }} />
      </div>
    </Stack>
  );
}
