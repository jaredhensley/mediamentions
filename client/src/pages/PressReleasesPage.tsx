import { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Grid, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { clients, mentions, pressReleases as initialPressReleases } from '../data';
import PressReleaseFormModal, { PressReleaseFormData } from '../components/PressReleaseFormModal';

export default function PressReleasesPage() {
  const [pressReleases, setPressReleases] = useState(initialPressReleases);
  const [selectedId, setSelectedId] = useState(initialPressReleases[0]?.id || '');
  const [modalOpen, setModalOpen] = useState(false);

  const selected = pressReleases.find((pr) => pr.id === selectedId);
  const relatedMentions = mentions.filter((mention) => mention.pressReleaseId === selectedId);

  const handleSave = (data: PressReleaseFormData) => {
    const newRelease = { ...data, id: `pr-${pressReleases.length + 1}` };
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
                    <ListItemText primary={pr.title} secondary={`${pr.date} • ${clients.find((c) => c.id === pr.clientId)?.name}`} />
                    <Chip label={pr.status} size="small" />
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
                    <Typography color="text.secondary">{selected.date}</Typography>
                    <Chip label={selected.status} size="small" sx={{ mt: 1 }} />
                  </Box>
                  <Typography>{selected.body}</Typography>
                  <DividerHeading title="Related mentions" />
                  {relatedMentions.length === 0 ? (
                    <Typography color="text.secondary">No related mentions.</Typography>
                  ) : (
                    <List>
                      {relatedMentions.map((mention) => (
                        <ListItem key={mention.id} divider>
                          <ListItemText primary={mention.title} secondary={mention.summary} />
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
        clients={clients}
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
