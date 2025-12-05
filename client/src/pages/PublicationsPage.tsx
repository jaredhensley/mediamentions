import { useEffect, useState } from 'react';
import { Button, Card, CardContent, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchPublications, createPublication, updatePublication, deletePublication } from '../api';
import { Publication } from '../data';
import PublicationFormModal, { PublicationFormData } from '../components/PublicationFormModal';
import { useToast } from '../hooks/useToast';

export default function PublicationsPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { showError } = useToast();

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

      <Card>
        <CardContent>
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
                  <TableCell>{pub.website || 'N/A'}</TableCell>
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
