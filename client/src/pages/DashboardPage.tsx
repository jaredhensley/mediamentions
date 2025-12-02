import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Grid, Link, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { fetchClients, fetchMentions } from '../api';
import { Client, Mention } from '../data';
import { formatDisplayDate, formatRelativeTime } from '../utils/format';

export default function DashboardPage() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMentions()
      .then(setMentions)
      .catch((err) => setError(err.message));
    fetchClients()
      .then(setClients)
      .catch((err) => setError(err.message));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const sortedMentions = useMemo(() => {
    return [...mentions].sort((a, b) => new Date(b.mentionDate).getTime() - new Date(a.mentionDate).getTime());
  }, [mentions]);
  const todaysMentions = useMemo(
    () => sortedMentions.filter((mention) => mention.mentionDate.slice(0, 10) === today),
    [sortedMentions, today],
  );
  const clientNameById = useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client.name])),
    [clients],
  );

  const quickStats = [
    { label: 'Total mentions', value: mentions.length },
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
          <Typography variant="h6" gutterBottom>
            Recent mentions
          </Typography>
          {error && <Typography color="error">{error}</Typography>}
          {sortedMentions.length === 0 ? (
            <Typography color="text.secondary">No mentions recorded yet.</Typography>
          ) : (
            <List>
              {sortedMentions.map((mention) => (
                <ListItem key={mention.id} divider>
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
                        <Typography component="span" color="text.primary" sx={{ mr: 1 }}>
                          {formatDisplayDate(mention.mentionDate)}
                          {formatRelativeTime(mention.mentionDate)
                            ? ` • ${formatRelativeTime(mention.mentionDate)}`
                            : ''}
                        </Typography>
                        <Link
                          component="button"
                          type="button"
                          underline="hover"
                          onClick={() => navigate(`/clients?clientId=${mention.clientId}`)}
                        >
                          {clientNameById[mention.clientId] || `Client #${mention.clientId}`}
                        </Link>
                        {mention.subjectMatter ? ` • ${mention.subjectMatter}` : ''}
                      </>
                    }
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
