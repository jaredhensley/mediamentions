import { useState } from 'react';
import { Button, Card, CardContent, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { publications as initialPublications } from '../data';
import PublicationFormModal, { PublicationFormData } from '../components/PublicationFormModal';

export default function PublicationsPage() {
  const [publications, setPublications] = useState(initialPublications);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingPublication = publications.find((p) => p.id === editingId);

  const handleSave = (data: PublicationFormData) => {
    if (editingId) {
      setPublications((prev) => prev.map((pub) => (pub.id === editingId ? { ...pub, ...data } : pub)));
    } else {
      setPublications((prev) => [...prev, { ...data, id: `pub-${prev.length + 1}` }]);
    }
  };

  const handleDelete = (id: string) => {
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

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Region</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {publications.map((pub) => (
                <TableRow key={pub.id}>
                  <TableCell>{pub.name}</TableCell>
                  <TableCell>{pub.url}</TableCell>
                  <TableCell>{pub.region}</TableCell>
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
        initial={editingPublication ? { name: editingPublication.name, url: editingPublication.url, region: editingPublication.region } : undefined}
      />
    </Stack>
  );
}
