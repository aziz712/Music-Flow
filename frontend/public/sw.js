// Service Worker disabled to resolve ChunkLoadError and caching issues in production.
// It will unregister itself if still active.

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        self.registration.unregister()
            .then(() => self.clients.matchAll())
            .then(clients => {
                clients.forEach(client => client.navigate(client.url));
            })
    );
});
