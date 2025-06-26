self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

// A simple fetch listener to make the app installable.
// A real-world app would have more robust caching strategies.
self.addEventListener('fetch', (event) => {
  // No caching logic for now to keep it simple.
});
