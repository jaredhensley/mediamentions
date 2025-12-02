import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Grid, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { fetchClients, fetchMentions, fetchPressReleases } from '../api';
import { Client, Mention, PressRelease } from '../data';
import PressReleaseFormModal, { PressReleaseFormData } from '../components/PressReleaseFormModal';

export default function PressReleasesPage() {
  const [pressReleases, setPressReleases] = useState<PressRelease[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [mentionsList, setMentionsList] = useState<Mention[]>([]);

  useEffect(() => {
    fetchPressReleases()
      .then((data) => {
        setPressReleases(data);
        setSelectedId(data[0]?.id || '');
      })
      .catch(() => {});
    fetchClients()
      .then(setClientsList)
      .catch(() => {});
    fetchMentions()
      .then(setMentionsList)
      .catch(() => {});
  }, []);

  const selected = pressReleases.find((pr) => pr.id === selectedId);
  const relatedMentions = mentionsList.filter((mention) => mention.pressReleaseId === selectedId);

  const handleSave = (data: PressReleaseFormData) => {
    const newRelease = { ...data, id: pressReleases.length + 1 };
    setPressReleases((prev) => [...prev, newRelease]);
    setSelectedId(newRelease.id);
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Press Releases</Typography>
        <Button variant="contained" onClick={() => setModalOpen(true)}>
          New press release
        </Button>
      </Stack>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                All releases
              </Typography>
              <List>
                {pressReleases.map((pr) => (
                  <ListItem key={pr.id} divider button onClick={() => setSelectedId(pr.id)} selected={pr.id === selectedId}>
                    <ListItemText
                      primary={pr.title}
                      secondary={`${pr.date || pr.releaseDate} • ${clientsList.find((c) => c.id === pr.clientId)?.name || 'N/A'}`}
                    />
                    <Chip label={pr.status || 'draft'} size="small" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              {selected ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6">{selected.title}</Typography>
                    <Typography color="text.secondary">{selected.date || selected.releaseDate}</Typography>
                    <Chip label={selected.status || 'draft'} size="small" sx={{ mt: 1 }} />
                  </Box>
                  <Typography>{selected.body || selected.content}</Typography>
                  <DividerHeading title="Related mentions" />
                  {relatedMentions.length === 0 ? (
                    <Typography color="text.secondary">No related mentions.</Typography>
                  ) : (
                    <List>
                      {relatedMentions.map((mention) => (
                        <ListItem key={mention.id} divider>
                          <ListItemText primary={mention.title} secondary={mention.subjectMatter} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Stack>
              ) : (
                <Typography>Select a press release to see details.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <PressReleaseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        clients={clientsList}
      />
    </Stack>
  );
}

function DividerHeading({ title }: { title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="subtitle1">{title}</Typography>
    </Box>
  );
}
