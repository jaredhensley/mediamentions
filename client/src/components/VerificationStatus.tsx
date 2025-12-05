import { useEffect, useState, useCallback } from 'react';
import { Box, CircularProgress, Typography, Tooltip, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import { fetchVerificationStatus, VerificationStatusData } from '../api';

export default function VerificationStatus() {
  const [status, setStatus] = useState<VerificationStatusData | null>(null);
  const [error, setError] = useState<boolean>(false);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'verification_status' && message.status) {
      const s = message.status;
      setStatus(prev => ({
        isRunning: s.isRunning ?? prev?.isRunning ?? false,
        phase: s.phase ?? prev?.phase ?? 'idle',
        total: s.total ?? prev?.total ?? 0,
        processed: s.processed ?? prev?.processed ?? 0,
        verified: s.verified ?? prev?.verified ?? 0,
        failed: s.failed ?? prev?.failed ?? 0,
        startedAt: prev?.startedAt || null,
        completedAt: s.phase === 'complete' ? new Date().toISOString() : null,
      }));
    } else if (message.type === 'verification_phase') {
      setStatus(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: message.phase as VerificationStatusData['phase'],
          isRunning: message.phase !== 'idle' && message.phase !== 'complete',
          completedAt: message.phase === 'complete' ? new Date().toISOString() : prev.completedAt,
        };
      });
    }
  }, []);

  useWebSocket(handleWebSocketMessage);

  useEffect(() => {
    // Initial fetch only - WebSocket handles updates
    fetchVerificationStatus()
      .then(data => {
        setStatus(data);
        setError(false);
      })
      .catch(() => {
        setError(true);
      });
  }, []);

  if (error || !status) {
    return null;
  }

  // Don't show anything if idle
  if (status.phase === 'idle') {
    return null;
  }

  // Show searching state
  if (status.phase === 'searching') {
    return (
      <Tooltip title="Searching for mentions across all clients">
        <Chip
          icon={<SearchIcon sx={{ fontSize: 16 }} />}
          label="Searching..."
          size="small"
          sx={{
            mr: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            color: 'inherit',
            '& .MuiChip-icon': {
              color: 'inherit',
            },
          }}
        />
      </Tooltip>
    );
  }

  // Show verifying state with spinner
  if (status.phase === 'verifying' && status.isRunning) {
    const progressText = status.total > 0
      ? `Verifying mentions (${status.processed}/${status.total})`
      : 'Verifying mentions...';

    return (
      <Tooltip title={`${status.verified} verified, ${status.failed} failed so far`}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
          <CircularProgress size={16} thickness={4} sx={{ color: 'inherit', mr: 1 }} />
          <Typography variant="caption" sx={{ color: 'inherit', whiteSpace: 'nowrap' }}>
            {progressText}
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  // Show completed state
  if (status.phase === 'complete') {
    const completedTime = status.completedAt ? new Date(status.completedAt) : null;
    const timeSinceCompletion = completedTime
      ? Math.floor((Date.now() - completedTime.getTime()) / 1000 / 60)
      : 0;

    // Hide after 5 minutes
    if (timeSinceCompletion > 5) {
      return null;
    }

    return (
      <Tooltip title={`${status.verified} verified, ${status.failed} failed`}>
        <Chip
          icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
          label="Verified"
          size="small"
          color="success"
          variant="outlined"
          sx={{
            mr: 1,
            borderColor: 'rgba(76, 175, 80, 0.5)',
            color: '#81c784',
            '& .MuiChip-icon': {
              color: '#81c784',
            },
          }}
        />
      </Tooltip>
    );
  }

  return null;
}
