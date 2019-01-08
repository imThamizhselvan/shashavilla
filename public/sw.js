const cacheName = 'assets-sashavilla-v1';
const files = [
    '/static/media/room.f840cf20.jpeg'
];

self.addEventListener('install', (e) => {
    // console.log('install from sw');
    e.waitUntil(
        caches.open(cacheName)
            .then((cache) => {
                return cache.addAll(files);
            })
    )
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(names => {
            names.forEach((item) => {
                if (item !== cacheName) {
                    caches.delete(item);
                }
            })
        })    
    )
})

self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('room.f840cf20')) {
        e.respondWith(
            caches.match(e.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(e.request);
                })
                .catch(err => {
                    console.log('error in matching with cache');
                })
        )
    }
});