import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import { Client, PressRelease } from '../data';

export type PressReleaseFormData = Omit<PressRelease, 'id'>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: PressReleaseFormData) => void;
  initial?: PressReleaseFormData;
  clients: Client[];
}

export default function PressReleaseFormModal({ open, onClose, onSave, initial, clients }: Props) {
  const [formState, setFormState] = useState<PressReleaseFormData>(() => ({
    clientId: initial?.clientId || clients[0]?.id || 0,
    title: initial?.title || '',
    releaseDate: initial?.releaseDate || new Date().toISOString().slice(0, 10),
    content: initial?.content || '',
  }));

  useEffect(() => {
    if (initial) return;
    setFormState((prev) => ({ ...prev, clientId: prev.clientId || clients[0]?.id || 0 }));
  }, [clients, initial]);

  const handleChange = (key: keyof PressReleaseFormData, value: string | number) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(formState);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit press release' : 'Create press release'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="client-label">Client</InputLabel>
            <Select
              labelId="client-label"
              label="Client"
              value={formState.clientId}
              onChange={(e) => handleChange('clientId', Number(e.target.value))}
            >
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Title" fullWidth value={formState.title} onChange={(e) => handleChange('title', e.target.value)} />
          <TextField
            type="date"
            label="Release Date"
            InputLabelProps={{ shrink: true }}
            value={formState.releaseDate}
            onChange={(e) => handleChange('releaseDate', e.target.value)}
            fullWidth
          />
          <TextField
            label="Content"
            multiline
            minRows={3}
            value={formState.content || ''}
            onChange={(e) => handleChange('content', e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
