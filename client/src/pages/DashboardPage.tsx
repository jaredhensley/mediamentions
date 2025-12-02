import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Grid, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { fetchMentions } from '../api';
import { Mention } from '../data';

export default function DashboardPage() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMentions()
      .then(setMentions)
      .catch((err) => setError(err.message));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todaysMentions = useMemo(
    () => mentions.filter((mention) => mention.mentionDate.slice(0, 10) === today),
    [mentions, today]
  );

  const quickStats = [
    { label: 'Total mentions', value: mentions.length },
    { label: 'Today', value: todaysMentions.length },
    { label: 'Published', value: mentions.filter((m) => m.status === 'published').length },
    { label: 'In review', value: mentions.filter((m) => m.status === 'in-review').length },
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
          <Typography variant="h6" gutterBottom>
            Today&apos;s mentions
          </Typography>
          {error && <Typography color="error">{error}</Typography>}
          {todaysMentions.length === 0 ? (
            <Typography color="text.secondary">No mentions logged today.</Typography>
          ) : (
            <List>
              {todaysMentions.map((mention) => (
                <ListItem key={mention.id} divider>
                  <ListItemText
                    primary={mention.title}
                    secondary={`Subject: ${mention.subjectMatter || 'N/A'} • Status: ${mention.status || 'N/A'}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
