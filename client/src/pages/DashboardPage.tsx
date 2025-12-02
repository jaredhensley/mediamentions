import { Card, CardContent, Grid, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { mentions } from '../data';

export default function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const todaysMentions = mentions.filter((mention) => mention.date === today);

  const quickStats = [
    { label: 'Total mentions', value: mentions.length },
    { label: 'Today', value: todaysMentions.length },
    { label: 'Positive', value: mentions.filter((m) => m.sentiment === 'positive').length },
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
          {todaysMentions.length === 0 ? (
            <Typography color="text.secondary">No mentions logged today.</Typography>
          ) : (
            <List>
              {todaysMentions.map((mention) => (
                <ListItem key={mention.id} divider>
                  <ListItemText primary={mention.title} secondary={`Sentiment: ${mention.sentiment} • Status: ${mention.status}`} />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
