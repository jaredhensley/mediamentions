import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { Mention, Publication } from '../data';

export type MentionFormData = Omit<Mention, 'id'>;

interface MentionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: MentionFormData) => void;
  initial?: MentionFormData;
  publicationOptions: Publication[];
}

export default function MentionFormModal({ open, onClose, onSave, initial, publicationOptions }: MentionFormModalProps) {
  const [formState, setFormState] = useState<MentionFormData>(
    initial || {
      title: '',
      mentionDate: new Date().toISOString().slice(0, 10),
      publicationId: publicationOptions[0]?.id || 0,
      sentiment: 'neutral',
      status: 'new',
      subjectMatter: '',
      clientId: 0,
      link: '',
      reMentionDate: null,
    },
  );

  const handleChange = (key: keyof MentionFormData, value: string | number | null) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(formState);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit mention' : 'Create mention'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={formState.title}
            onChange={(e) => handleChange('title', e.target.value)}
            fullWidth
          />
          <TextField
            type="date"
            label="Date"
            InputLabelProps={{ shrink: true }}
            value={formState.mentionDate}
            onChange={(e) => handleChange('mentionDate', e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="publication-label">Publication</InputLabel>
            <Select
              labelId="publication-label"
              label="Publication"
              value={formState.publicationId}
              onChange={(e) => handleChange('publicationId', Number(e.target.value))}
            >
              {publicationOptions.map((pub) => (
                <MenuItem key={pub.id} value={pub.id}>
                  {pub.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="sentiment-label">Sentiment</InputLabel>
            <Select
              labelId="sentiment-label"
              label="Sentiment"
              value={formState.sentiment}
              onChange={(e) => handleChange('sentiment', e.target.value)}
            >
              <MenuItem value="positive">Positive</MenuItem>
              <MenuItem value="neutral">Neutral</MenuItem>
              <MenuItem value="negative">Negative</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="status-label">Status</InputLabel>
            <Select labelId="status-label" label="Status" value={formState.status} onChange={(e) => handleChange('status', e.target.value)}>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="in-review">In review</MenuItem>
              <MenuItem value="published">Published</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Subject matter"
            multiline
            minRows={3}
            value={formState.subjectMatter || ''}
            onChange={(e) => handleChange('subjectMatter', e.target.value)}
            fullWidth
          />
          <TextField
            label="Link"
            value={formState.link || ''}
            onChange={(e) => handleChange('link', e.target.value)}
            fullWidth
          />
          <TextField
            label="Client ID (optional)"
            value={formState.clientId || ''}
            onChange={(e) => handleChange('clientId', Number(e.target.value) || 0)}
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
