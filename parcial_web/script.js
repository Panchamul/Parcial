// SISTEMA CRUD CON INDEXEDDB:
// - CREATE: Agrega una nueva canción al DB con ID único.
// - READ: Lee todas las canciones del DB y las renderiza/filtra.
// - UPDATE: Actualiza una canción existente por ID en el DB.
// - DELETE: Elimina una canción por ID del DB.

class IndexedDBManager {
    constructor(dbName = 'MusicPlaylistDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('songs')) {
                    const store = db.createObjectStore('songs', { keyPath: 'id' });
                    store.createIndex('title', 'title', { unique: false });
                    store.createIndex('artist', 'artist', { unique: false });
                    store.createIndex('genre', 'genre', { unique: false });
                }
            };
        });
    }

    // CREATE: Insertar nueva canción
    async addSong(song) {
        const transaction = this.db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        return new Promise((resolve, reject) => {
            const request = store.add(song);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // READ: Leer todas las canciones
    async getAllSongs() {
        const transaction = this.db.transaction(['songs'], 'readonly');
        const store = transaction.objectStore('songs');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // UPDATE: Actualizar canción por ID
    async updateSong(song) {
        const transaction = this.db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        return new Promise((resolve, reject) => {
            const request = store.put(song);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // DELETE: Eliminar canción por ID
    async deleteSong(id) {
        const transaction = this.db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

class MusicPlaylistManager {
    constructor() {
        this.dbManager = new IndexedDBManager();
        this.songs = [];
        this.filteredSongs = [];
        this.editingId = null;
        this.searchTerm = '';
        this.chart = null;
        this.initializeDB().then(() => {
            this.initializeEventListeners();
            this.loadSongs();
        });
    }

    async initializeDB() {
        try {
            await this.dbManager.init();
        } catch (error) {
            console.error('Error initializing IndexedDB:', error);
            this.showNotification('Error al inicializar la base de datos', 'error');
        }
    }

    initializeEventListeners() {
        document.getElementById('songForm').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelEdit());
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToJSON());
    }

    async handleSubmit(e) {
        e.preventDefault();
        const formData = this.getFormData();

        if (!this.validateForm(formData)) {
            return;
        }

        try {
            if (this.editingId) {
                // UPDATE: Actualizar canción existente
                await this.dbManager.updateSong({ ...formData, id: this.editingId });
                this.showNotification('Canción actualizada exitosamente', 'success');
                this.cancelEdit();
            } else {
                // CREATE: Insertar nueva canción
                const newSong = { ...formData, id: Date.now() };
                await this.dbManager.addSong(newSong);
                this.showNotification('Canción agregada exitosamente', 'success');
            }

            await this.loadSongs();
            document.getElementById('songForm').reset();
        } catch (error) {
            console.error('Error saving song:', error);
            this.showNotification('Error al guardar la canción', 'error');
        }
    }

    getFormData() {
        return {
            title: document.getElementById('songTitle').value.trim(),
            artist: document.getElementById('artist').value.trim(),
            album: document.getElementById('album').value.trim() || 'Sin álbum',
            genre: document.getElementById('genre').value,
            duration: document.getElementById('duration').value.trim() || '0:00',
            url: document.getElementById('url').value.trim() || '',
            rating: parseInt(document.getElementById('rating').value)
        };
    }

    validateForm(data) {
        if (!data.title || !data.artist || !data.genre) {
            this.showNotification('Título, artista y género son obligatorios', 'error');
            return false;
        }
        if (data.duration && !/^\d+:\d{2}$/.test(data.duration)) {
            this.showNotification('Formato de duración inválido (ej: 3:45)', 'error');
            return false;
        }
        return true;
    }

    async editSong(id) {
        const song = this.songs.find(s => s.id === id);
        if (!song) return;

        this.editingId = id;

        document.getElementById('songTitle').value = song.title;
        document.getElementById('artist').value = song.artist;
        document.getElementById('album').value = song.album === 'Sin álbum' ? '' : song.album;
        document.getElementById('genre').value = song.genre;
        document.getElementById('duration').value = song.duration;
        document.getElementById('url').value = song.url;
        document.getElementById('rating').value = song.rating;

        document.getElementById('submitBtn').innerHTML = '<span>💾</span> Actualizar Canción';
        document.getElementById('cancelBtn').style.display = 'block';

        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }

    cancelEdit() {
        this.editingId = null;
        document.getElementById('submitBtn').innerHTML = '<span>➕</span> Agregar Canción';
        document.getElementById('cancelBtn').style.display = 'none';
        document.getElementById('songForm').reset();
    }

    async deleteSong(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta canción?')) return;

        try {
            // DELETE: Eliminar canción por ID
            await this.dbManager.deleteSong(id);
            this.showNotification('Canción eliminada', 'success');
            await this.loadSongs();
        } catch (error) {
            console.error('Error deleting song:', error);
            this.showNotification('Error al eliminar la canción', 'error');
        }
    }

    async loadSongs() {
        try {
            // READ: Leer todas las canciones del DB
            this.songs = await this.dbManager.getAllSongs();
            this.applyFilters();
        } catch (error) {
            console.error('Error loading songs:', error);
            this.showNotification('Error al cargar las canciones', 'error');
        }
    }

    handleSearch(e) {
        this.searchTerm = e.target.value.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        if (!this.searchTerm) {
            this.filteredSongs = [...this.songs];
        } else {
            this.filteredSongs = this.songs.filter(song =>
                song.title.toLowerCase().includes(this.searchTerm) ||
                song.artist.toLowerCase().includes(this.searchTerm) ||
                song.genre.toLowerCase().includes(this.searchTerm)
            );
        }
        this.renderPlaylist();
        this.updateStats();
        this.updateChart();
    }

    renderPlaylist() {
        const container = document.getElementById('playlistContainer');

        if (this.filteredSongs.length === 0) {
            container.innerHTML = this.songs.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon">🎼</div>
                    <h3>Tu playlist está vacía</h3>
                    <p>Agrega tu primera canción para comenzar</p>
                </div>
            ` : `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>No se encontraron canciones</h3>
                    <p>Prueba con otros términos de búsqueda</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredSongs.map((song) => `
            <div class="song-card fade-in">
                <div class="song-artwork">
                    ${song.title.charAt(0).toUpperCase()}
                </div>
                <div class="song-info">
                    <div class="song-title">${song.title}</div>
                    <div class="song-details">
                        <span>🎤 ${song.artist}</span>
                        <span>💿 ${song.album}</span>
                        <span>🎵 ${song.genre}</span>
                        <span>⏱️ ${song.duration}</span>
                    </div>
                    <div class="song-rating">
                        ${'⭐'.repeat(song.rating)}
                    </div>
                </div>
                <div class="song-actions">
                    ${song.url ? `<button class="btn-icon" onclick="window.open('${song.url}', '_blank')" title="Abrir enlace">🔗</button>` : ''}
                    <button class="btn-icon" onclick="playlistManager.editSong(${song.id})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="playlistManager.deleteSong(${song.id})" title="Eliminar">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        const totalSongs = this.songs.length;
        const totalMinutes = this.songs.reduce((total, song) => {
            const [minutes, seconds] = song.duration.split(':').map(Number);
            return total + (minutes || 0) + ((seconds || 0) / 60);
        }, 0);

        document.getElementById('totalSongs').textContent = `${totalSongs} canción${totalSongs !== 1 ? 'es' : ''}`;
        document.getElementById('totalDuration').textContent = `${Math.floor(totalMinutes)}:${String(Math.floor((totalMinutes % 1) * 60)).padStart(2, '0')}`;
    }

    updateChart() {
        const ctx = document.getElementById('genreChart').getContext('2d');
        const genreCounts = {};

        this.songs.forEach(song => {
            genreCounts[song.genre] = (genreCounts[song.genre] || 0) + 1;
        });

        const labels = Object.keys(genreCounts);
        const data = Object.values(genreCounts);

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#4BC0C0', '#FF6384', '#36A2EB'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    exportToJSON() {
        const dataStr = JSON.stringify(this.songs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'playlist.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('Playlist exportada como JSON', 'success');
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

const playlistManager = new MusicPlaylistManager();
