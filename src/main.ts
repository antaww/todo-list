import './app.css';
import App from './App.svelte';

// Global error handler
window.onerror = function(msg, url, line, col, error) {
  console.error('Global error:', { msg, url, line, col, error });
  return false;
};

// Global promise rejection handler
window.onunhandledrejection = function(event) {
  console.error('Unhandled promise rejection:', event.reason);
};

let app;

try {
  app = new App({
    target: document.getElementById('app')!,
  });
} catch (error) {
  console.error('Error initializing app:', error);
  const errorDiv = document.createElement('div');
  errorDiv.className = 'p-4 bg-red-100 text-red-700 rounded-lg';
  errorDiv.textContent = 'An error occurred while loading the application. Please refresh the page.';
}

export default app;