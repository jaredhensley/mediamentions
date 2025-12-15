import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { Publication } from '../data';

export type PublicationFormData = Omit<Publication, 'id'>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: PublicationFormData) => void;
  initial?: PublicationFormData;
}

const defaultState: PublicationFormData = { name: '', website: '' };

export default function PublicationFormModal({ open, onClose, onSave, initial }: Props) {
  const [formState, setFormState] = useState<PublicationFormData>(defaultState);

  useEffect(() => {
    setFormState(initial || defaultState);
  }, [initial]);

  const handleSave = () => {
    onSave({
      ...formState,
      website: formState.website?.trim() || null,
      name: formState.name.trim(),
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit publication' : 'Create publication'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={formState.name}
            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Website"
            value={formState.website ?? ''}
            onChange={(e) => setFormState((prev) => ({ ...prev, website: e.target.value }))}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!formState.name.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
