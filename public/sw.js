const cacheName = 'assets-sashavilla-v2';
const files = [
    'http://localhost:3000/static/media/room.ad481e0d.jpeg'
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
                    caches.delete(cacheName);
                }
            })
        })    
    )
})

self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('room.ad481e0d')) {
        e.respondWith(
            caches.match(e.request)
                .then(response => {
                    if (response) {
                        console.log('found in cache');
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