import { useState } from 'react';
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
  const [formState, setFormState] = useState<PressReleaseFormData>(
    initial || {
      clientId: clients[0]?.id || '',
      title: '',
      date: new Date().toISOString().slice(0, 10),
      status: 'draft',
      body: '',
    },
  );

  const handleChange = (key: keyof PressReleaseFormData, value: string) => {
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
              onChange={(e) => handleChange('clientId', e.target.value)}
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
            label="Date"
            InputLabelProps={{ shrink: true }}
            value={formState.date}
            onChange={(e) => handleChange('date', e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="status-label">Status</InputLabel>
            <Select labelId="status-label" label="Status" value={formState.status} onChange={(e) => handleChange('status', e.target.value)}>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="sent">Sent</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Body"
            multiline
            minRows={3}
            value={formState.body}
            onChange={(e) => handleChange('body', e.target.value)}
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
