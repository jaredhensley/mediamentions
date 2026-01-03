import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { fetchPublications, createPublication, updatePublication, deletePublication } from '../api';
import { Publication } from '../data';
import PublicationFormModal, { PublicationFormData } from '../components/PublicationFormModal';
import { useToast } from '../hooks/useToast';

export default function PublicationsPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { showError } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchPublications()
      .then(setPublications)
      .catch((err) => showError(err.message));
  }, [showError]);

  const editingPublication = publications.find((p) => p.id === editingId);

  const handleSave = async (data: PublicationFormData) => {
    try {
      if (editingId) {
        const updated = await updatePublication(editingId, data);
        setPublications((prev) => prev.map((pub) => (pub.id === editingId ? updated : pub)));
      } else {
        const created = await createPublication(data);
        setPublications((prev) => [...prev, created]);
      }
      setModalOpen(false);
      setEditingId(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save publication');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this publication?')) {
      return;
    }

    try {
      await deletePublication(id);
      setPublications((prev) => prev.filter((pub) => pub.id !== id));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete publication');
    }
  };

  return (
    <Stack spacing={isMobile ? 2 : 3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
      >
        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Publications
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setEditingId(null);
            setModalOpen(true);
          }}
          fullWidth={isMobile}
        >
          New publication
        </Button>
      </Stack>

      {/* Mobile: Card-based view */}
      {isMobile ? (
        <Stack spacing={1.5}>
          {publications.map((pub) => (
            <Card key={pub.id} variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1} minWidth={0}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {pub.name}
                    </Typography>
                    {pub.website ? (
                      <Link
                        href={pub.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: '0.875rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        {pub.website} <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </Link>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No website
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingId(pub.id);
                        setModalOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(pub.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          ))}
          {publications.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No publications yet. Add one to get started.
            </Typography>
          )}
        </Stack>
      ) : (
        /* Desktop: Table view */
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Website</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {publications.map((pub) => (
                    <TableRow key={pub.id}>
                      <TableCell>{pub.name}</TableCell>
                      <TableCell>
                        {pub.website ? (
                          <Link
                            href={pub.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5
                            }}
                          >
                            {pub.website} <OpenInNewIcon sx={{ fontSize: 14 }} />
                          </Link>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => {
                            setEditingId(pub.id);
                            setModalOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(pub.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <PublicationFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={
          editingPublication
            ? {
                name: editingPublication.name,
                website: editingPublication.website || ''
              }
            : undefined
        }
      />
    </Stack>
  );
}
