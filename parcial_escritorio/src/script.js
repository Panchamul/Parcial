// Importar Electron IPC para comunicación con el proceso principal
const { ipcRenderer } = require('electron');

class AuthManager {
    constructor() {
        this.users = [];
        this.currentUser = null;
    }

    async loadUsers() {
        try {
            // Cargar usuarios desde archivo JSON usando Electron IPC
            const users = await ipcRenderer.invoke('read-json-file', 'users.json');
            this.users = users || [];
            
            // Si no hay usuarios, crear algunos por defecto
            if (this.users.length === 0) {
                this.users = [
                    { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
                    { id: 2, username: 'user', password: 'user123', role: 'user' }
                ];
                await this.saveUsers();
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Error al cargar usuarios', 'error');
            // Usuarios por defecto en caso de error
            this.users = [
                { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
                { id: 2, username: 'user', password: 'user123', role: 'user' }
            ];
        }
    }

    async saveUsers() {
        try {
            await ipcRenderer.invoke('write-json-file', 'users.json', this.users);
        } catch (error) {
            console.error('Error saving users:', error);
        }
    }

    async login(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password);
        if (user) {
            this.currentUser = user;
            // Guardar sesión actual
            await this.saveCurrentSession();
            this.showLoginSuccess();
            return true;
        } else {
            this.showNotification('Credenciales inválidas', 'error');
            return false;
        }
    }

    async saveCurrentSession() {
        try {
            const sessionData = {
                currentUser: this.currentUser,
                loginTime: new Date().toISOString()
            };
            await ipcRenderer.invoke('write-json-file', 'session.json', sessionData);
        } catch (error) {
            console.error('Error saving session:', error);
        }
    }

    async loadCurrentSession() {
        try {
            const sessionData = await ipcRenderer.invoke('read-json-file', 'session.json');
            if (sessionData && sessionData.currentUser) {
                this.currentUser = sessionData.currentUser;
                return true;
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }
        return false;
    }

    async logout() {
        this.currentUser = null;
        // Limpiar sesión
        await ipcRenderer.invoke('write-json-file', 'session.json', {});
        
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginForm').reset();
        this.showNotification('Sesión cerrada', 'success');
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    showLoginSuccess() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
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

class JSONStorageManager {
    constructor(userId) {
        this.userId = userId;
        this.songsFileName = `playlist_songs_${userId}.json`;
    }

    // CREATE: Agregar canción
    async addSong(song) {
        const songs = await this.getAllSongs();
        songs.push(song);
        await this.saveSongs(songs);
        return song.id;
    }

    // READ: Obtener todas las canciones
    async getAllSongs() {
        try {
            const songs = await ipcRenderer.invoke('read-json-file', this.songsFileName);
            return songs || [];
        } catch (error) {
            console.error('Error loading songs:', error);
            return [];
        }
    }

    // UPDATE: Actualizar canción por ID
    async updateSong(updatedSong) {
        const songs = await this.getAllSongs();
        const index = songs.findIndex(s => s.id === updatedSong.id);
        if (index !== -1) {
            songs[index] = updatedSong;
            await this.saveSongs(songs);
            return true;
        }
        return false;
    }

    // DELETE: Eliminar canción por ID
    async deleteSong(id) {
        const songs = await this.getAllSongs();
        const filtered = songs.filter(s => s.id !== id);
        await this.saveSongs(filtered);
        return true;
    }

    async saveSongs(songs) {
        try {
            await ipcRenderer.invoke('write-json-file', this.songsFileName, songs);
        } catch (error) {
            console.error('Error saving songs:', error);
            throw error;
        }
    }

    // Export to file usando Electron
    async exportToJSON() {
        try {
            const songs = await this.getAllSongs();
            const success = await ipcRenderer.invoke('export-playlist', songs);
            
            if (success) {
                this.showNotification('Playlist exportada exitosamente', 'success');
            } else {
                this.showNotification('Error al exportar playlist', 'error');
            }
        } catch (error) {
            console.error('Error exporting playlist:', error);
            this.showNotification('Error al exportar playlist', 'error');
        }
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

class MusicPlaylistManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.storageManager = new JSONStorageManager(authManager.currentUser.id);
        this.songs = [];
        this.filteredSongs = [];
        this.editingId = null;
        this.searchTerm = '';
        this.chart = null;

        if (this.authManager.isLoggedIn()) {
            this.initializeApp();
        }
    }

    async initializeApp() {
        this.initializeEventListeners();
        await this.loadSongs();
    }

    initializeEventListeners() {
        document.getElementById('songForm').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelEdit());
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('exportBtn').addEventListener('click', () => this.storageManager.exportToJSON());
        document.getElementById('logoutBtn').addEventListener('click', () => this.authManager.logout());
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
                const updatedSong = { ...formData, id: this.editingId };
                await this.storageManager.updateSong(updatedSong);
                this.showNotification('Canción actualizada exitosamente', 'success');
                this.cancelEdit();
            } else {
                // CREATE: Insertar nueva canción
                const newSong = { 
                    ...formData, 
                    id: Date.now(),
                    createdAt: new Date().toISOString(),
                    userId: this.authManager.currentUser.id
                };
                await this.storageManager.addSong(newSong);
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

    editSong(id) {
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
            await this.storageManager.deleteSong(id);
            this.showNotification('Canción eliminada', 'success');
            await this.loadSongs();
        } catch (error) {
            console.error('Error deleting song:', error);
            this.showNotification('Error al eliminar la canción', 'error');
        }
    }

    async loadSongs() {
        try {
            // READ: Leer todas las canciones del storage
            this.songs = await this.storageManager.getAllSongs();
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
                    <div class="song-title">${this.escapeHtml(song.title)}</div>
                    <div class="song-details">
                        <span>🎤 ${this.escapeHtml(song.artist)}</span>
                        <span>💿 ${this.escapeHtml(song.album)}</span>
                        <span>🎵 ${this.escapeHtml(song.genre)}</span>
                        <span>⏱️ ${this.escapeHtml(song.duration)}</span>
                    </div>
                    <div class="song-rating">
                        ${'⭐'.repeat(song.rating)}
                    </div>
                </div>
                <div class="song-actions">
                    ${song.url ? `<button class="btn-icon" onclick="playlistManager.openUrl('${this.escapeHtml(song.url)}')" title="Abrir enlace">🔗</button>` : ''}
                    <button class="btn-icon" onclick="playlistManager.editSong(${song.id})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="playlistManager.deleteSong(${song.id})" title="Eliminar">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    // Función para escapar HTML y prevenir XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Función segura para abrir URLs externas
    async openUrl(url) {
        try {
            await ipcRenderer.invoke('open-external-url', url);
        } catch (error) {
            console.error('Error opening URL:', error);
            this.showNotification('Error al abrir el enlace', 'error');
        }
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

        if (labels.length === 0) {
            // Si no hay datos, mostrar gráfico vacío
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
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

// Inicialización con autenticación
const authManager = new AuthManager();

document.addEventListener('DOMContentLoaded', async () => {
    // Cargar usuarios al iniciar
    await authManager.loadUsers();
    
    // Verificar si hay una sesión guardada
    const hasSession = await authManager.loadCurrentSession();
    
    if (hasSession) {
        // Si hay sesión, inicializar directamente la aplicación
        authManager.showLoginSuccess();
        const playlistManager = new MusicPlaylistManager(authManager);
        window.playlistManager = playlistManager; // Para acceso global en onclick
    }

    // Manejar el formulario de login
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (await authManager.login(username, password)) {
            const playlistManager = new MusicPlaylistManager(authManager);
            window.playlistManager = playlistManager; // Para acceso global en onclick
        }
    });
});

// Manejar el cierre de la aplicación
window.addEventListener('beforeunload', async () => {
    if (authManager.isLoggedIn()) {
        await authManager.saveCurrentSession();
    }
});