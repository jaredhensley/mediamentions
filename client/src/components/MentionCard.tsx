import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  IconButton,
  Link,
  Stack,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Mention } from '../data';
import { formatDisplayDate } from '../utils/format';

interface MentionCardProps {
  mention: Mention;
  clientName?: string;
  sourceName?: string;
  selected?: boolean;
  onSelect?: (id: number, checked: boolean) => void;
  onDelete?: (id: number) => void;
  onClientClick?: (clientId: number) => void;
  showClient?: boolean;
  showSource?: boolean;
  showSentiment?: boolean;
}

export default function MentionCard({
  mention,
  clientName,
  sourceName,
  selected = false,
  onSelect,
  onDelete,
  onClientClick,
  showClient = false,
  showSource = false,
  showSentiment = false
}: MentionCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        transition: 'all 0.2s ease',
        ...(selected && {
          borderColor: 'primary.main',
          bgcolor: 'action.selected'
        })
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          {/* Header row with checkbox and actions */}
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Box display="flex" alignItems="flex-start" gap={1} flex={1} minWidth={0}>
              {onSelect && (
                <Checkbox
                  size="small"
                  checked={selected}
                  onChange={(e) => onSelect(mention.id, e.target.checked)}
                  sx={{ mt: -0.5, ml: -0.5 }}
                />
              )}
              <Box flex={1} minWidth={0}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {mention.title}
                </Typography>
              </Box>
            </Box>
            {onDelete && (
              <IconButton size="small" onClick={() => onDelete(mention.id)} sx={{ ml: 1 }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* Meta info row */}
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
            {showClient && clientName && (
              <Chip
                label={clientName}
                size="small"
                variant="outlined"
                color="primary"
                onClick={onClientClick ? () => onClientClick(mention.clientId) : undefined}
                sx={{ cursor: onClientClick ? 'pointer' : 'default' }}
              />
            )}
            {showSource && sourceName && (
              <Chip label={sourceName} size="small" variant="outlined" />
            )}
            {showSentiment && mention.sentiment && (
              <Chip
                label={mention.sentiment}
                size="small"
                color={mention.sentiment === 'positive' ? 'success' : 'default'}
              />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {formatDisplayDate(mention.mentionDate)}
            </Typography>
          </Stack>

          {/* Link */}
          {mention.link && (
            <Link
              href={mention.link}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '0.8125rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              View article <OpenInNewIcon sx={{ fontSize: 14 }} />
            </Link>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
