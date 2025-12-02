import { PropsWithChildren } from 'react';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import ArticleIcon from '@mui/icons-material/Article';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import SettingsIcon from '@mui/icons-material/Settings';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { Link, useLocation } from 'react-router-dom';
import { useColorMode } from '../theme';

const drawerWidth = 240;

const navItems = [
  { label: 'Dashboard', to: '/', icon: <DashboardIcon /> },
  { label: 'Clients', to: '/clients', icon: <PersonIcon /> },
  { label: 'Press Releases', to: '/press-releases', icon: <ArticleIcon /> },
  { label: 'Publications', to: '/publications', icon: <NewspaperIcon /> },
  { label: 'Settings', to: '/settings', icon: <SettingsIcon /> },
];

export default function Layout({ children }: PropsWithChildren) {
  const location = useLocation();
  const theme = useTheme();
  const { toggle } = useColorMode();

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Media Mentions Monitor
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton color="inherit" onClick={toggle} aria-label="Toggle color mode">
            {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.to} disablePadding>
              <ListItemButton component={Link} to={item.to} selected={location.pathname === item.to}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
