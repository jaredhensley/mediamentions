import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface Toast {
  message: string;
  severity: AlertColor;
}

interface ToastContextValue {
  showToast: (message: string, severity?: AlertColor) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [open, setOpen] = useState(false);

  const showToast = useCallback((message: string, severity: AlertColor = 'info') => {
    // Parse error messages to make them more user-friendly
    let displayMessage = message;

    if (message.includes('401') && message.toLowerCase().includes('unauthorized')) {
      displayMessage = 'Authentication failed. Please check your API key configuration.';
    } else if (message.includes('403')) {
      displayMessage = 'Access denied. You do not have permission to perform this action.';
    } else if (message.includes('404')) {
      displayMessage = 'The requested resource was not found.';
    } else if (message.includes('500')) {
      displayMessage = 'Server error. Please try again later.';
    } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      displayMessage = 'Unable to connect to server. Please check your connection.';
    }

    setToast({ message: displayMessage, severity });
    setOpen(true);
  }, []);

  const showError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={toast?.severity || 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
