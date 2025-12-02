import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { Publication } from '../data';

export type PublicationFormData = Omit<Publication, 'id'>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: PublicationFormData) => void;
  initial?: PublicationFormData;
}

export default function PublicationFormModal({ open, onClose, onSave, initial }: Props) {
  const [formState, setFormState] = useState<PublicationFormData>(
    initial || { name: '', url: '', region: '' },
  );

  const handleChange = (key: keyof PublicationFormData, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(formState);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit publication' : 'Create publication'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={formState.name} onChange={(e) => handleChange('name', e.target.value)} fullWidth />
          <TextField label="URL" value={formState.url} onChange={(e) => handleChange('url', e.target.value)} fullWidth />
          <TextField label="Region" value={formState.region} onChange={(e) => handleChange('region', e.target.value)} fullWidth />
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
