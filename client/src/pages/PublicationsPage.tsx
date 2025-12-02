import { useEffect, useState } from 'react';
import { Button, Card, CardContent, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchPublications } from '../api';
import { Publication } from '../data';
import PublicationFormModal, { PublicationFormData } from '../components/PublicationFormModal';

export default function PublicationsPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublications()
      .then(setPublications)
      .catch((err) => setError(err.message));
  }, []);

  const editingPublication = publications.find((p) => p.id === editingId);

  const handleSave = (data: PublicationFormData) => {
    if (editingId) {
      setPublications((prev) => prev.map((pub) => (pub.id === editingId ? { ...pub, ...data } : pub)));
    } else {
      const nextId = publications.length ? Math.max(...publications.map((p) => p.id)) + 1 : 1;
      setPublications((prev) => [...prev, { ...data, id: nextId }]);
    }
  };

  const handleDelete = (id: number) => {
    setPublications((prev) => prev.filter((pub) => pub.id !== id));
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Publications</Typography>
        <Button
          variant="contained"
          onClick={() => {
            setEditingId(null);
            setModalOpen(true);
          }}
        >
          New publication
        </Button>
      </Stack>

      {error && <Typography color="error">{error}</Typography>}

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Website</TableCell>
                <TableCell>Client ID</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {publications.map((pub) => (
                <TableRow key={pub.id}>
                  <TableCell>{pub.name}</TableCell>
                  <TableCell>{pub.website || 'N/A'}</TableCell>
                  <TableCell>{pub.clientId ?? 'N/A'}</TableCell>
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
        </CardContent>
      </Card>

      <PublicationFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={
          editingPublication
            ? {
                name: editingPublication.name,
                website: editingPublication.website || '',
                clientId: editingPublication.clientId ?? null,
              }
            : undefined
        }
      />
    </Stack>
  );
}
