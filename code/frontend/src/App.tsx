import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import {ReactComponent as Logo } from './assets/logo.svg';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline helps with consistent baseline styles across browsers */}
      <CssBaseline />
      <BrowserRouter>
        <AppRoutes />
        <h1>Welcome to the order App</h1>
        <Logo style={{ width: '100px', height: '100px' }} />
        {/* The AppRoutes component contains all the routes for the application */}
      </BrowserRouter>
      {/* The BrowserRouter component enables routing in the application */}
    </ThemeProvider>
  );
}

export default App;