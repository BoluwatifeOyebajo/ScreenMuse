// TMDb & OMDb API Configuration
const TMDB_API_KEY = 'bcdb4341bcb1b2281a6d5bb1fcb1d284'; 
const OMDB_API_KEY = '4d93314c'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OMDB_BASE_URL = 'https://www.omdbapi.com';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Mood to Genre Mapping
const moodToGenres = {
    nostalgic: [18, 10749, 10751], // Drama, Romance, Family
    lonely: [18, 10749], // Drama, Romance
    relaxed: [99, 10402, 16], // Documentary, Music, Animation
    adventurous: [12, 28, 14], // Adventure, Action, Fantasy
    romantic: [10749, 35], // Romance, Comedy
    bored: [35, 28, 878] // Comedy, Action, Sci-Fi
};

// State
let currentView = 'results';
let watchlist = [];
let allMovies = [];
let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');
const moodSelect = document.getElementById('mood');
const genreSelect = document.getElementById('genre');
const yearSelect = document.getElementById('year');
const searchBtn = document.getElementById('searchBtn');
const discoverBtn = document.getElementById('discoverBtn');
const watchlistBtn = document.getElementById('watchlistBtn');
const moviesGrid = document.getElementById('moviesGrid');
const watchlistGrid = document.getElementById('watchlistGrid');
const resultsSection = document.getElementById('resultsSection');
const watchlistSection = document.getElementById('watchlistSection');
const loading = document.getElementById('loading');
const movieModal = document.getElementById('movieModal');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');
const emptyMessage = document.getElementById('emptyMessage');
const resultsTitle = document.getElementById('resultsTitle');
const loadMoreBtn = document.getElementById('loadMoreBtn');

// Initialize
function init() {
    loadWatchlist();
    loadTheme();
    attachEventListeners();
    checkAPIKey();
    loadInitialMovies(); // Load movies on page load
}

// Check if API key is set
function checkAPIKey() {
    if (!TMDB_API_KEY) {
        moviesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <h3 style="color: var(--accent); margin-bottom: 20px;">API Keys Required</h3>
                <p style="color: var(--text-secondary); line-height: 1.8;">
                    To use ScreenMuse, you need free API keys from TMDb and OMDb.<br><br>
                    <strong>TMDb API:</strong><br>
                    1. Visit <a href="https://www.themoviedb.org/settings/api" target="_blank" style="color: var(--accent);">TMDb API Settings</a><br>
                    2. Create a free account and request an API key<br>
                    3. Add your API key to script.js (line 2)<br><br>
                    <strong>OMDb API:</strong><br>
                    1. Visit <a href="http://www.omdbapi.com/apikey.aspx" target="_blank" style="color: var(--accent);">OMDb API Key</a><br>
                    2. Request a free API key (check your email to activate)<br>
                    3. Add your API key to script.js (line 3)<br><br>
                    It only takes a few minutes!
                </p>
            </div>
        `;
        loadMoreBtn.classList.add('hidden');
    }
}

// Event Listeners
function attachEventListeners() {
    themeToggle.addEventListener('click', toggleTheme);
    searchBtn.addEventListener('click', searchMovies);
    discoverBtn.addEventListener('click', discoverMovies);
    watchlistBtn.addEventListener('click', showWatchlist);
    loadMoreBtn.addEventListener('click', loadMoreMovies);
    modalClose.addEventListener('click', closeModal);
    movieModal.addEventListener('click', (e) => {
        if (e.target === movieModal) closeModal();
    });
}

// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    
    if (isLight) {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    } else {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }
    
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

function loadTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
}

// Watchlist Management
function loadWatchlist() {
    const saved = localStorage.getItem('watchlist');
    watchlist = saved ? JSON.parse(saved) : [];
}

function saveWatchlist() {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
}

function addToWatchlist(movie) {
    if (!watchlist.find(m => m.id === movie.id)) {
        watchlist.push(movie);
        saveWatchlist();
        alert('Added to watchlist!');
    } else {
        alert('Already in watchlist!');
    }
}

function removeFromWatchlist(movieId) {
    watchlist = watchlist.filter(m => m.id !== movieId);
    saveWatchlist();
    showWatchlist();
}

// API Calls
async function fetchMovies(endpoint, params = {}, page = 1) {
    if (!TMDB_API_KEY) {
        return { results: [], total_pages: 0 };
    }

    try {
        loading.classList.add('active');
        const queryParams = new URLSearchParams({
            api_key: TMDB_API_KEY,
            page: page,
            ...params
        });
        const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${queryParams}`);
        const data = await response.json();
        loading.classList.remove('active');
        return data;
    } catch (error) {
        console.error('Error fetching movies:', error);
        loading.classList.remove('active');
        return { results: [], total_pages: 0 };
    }
}

async function fetchMovieDetails(movieId) {
    if (!TMDB_API_KEY) return null;

    try {
        const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

async function fetchOMDbData(imdbId) {
    if (!OMDB_API_KEY || !imdbId) return null;

    try {
        const response = await fetch(`${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&i=${imdbId}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching OMDb data:', error);
        return null;
    }
}

// Search and Discover
async function loadInitialMovies() {
    if (!TMDB_API_KEY) return;
    
    currentPage = 1;
    currentFilters = {
        sort_by: 'popularity.desc',
        'vote_count.gte': 100
    };
    
    const data = await fetchMovies('/discover/movie', currentFilters, currentPage);
    allMovies = data.results || [];
    totalPages = data.total_pages || 1;
    
    resultsTitle.textContent = 'Trending Now';
    displayMovies(allMovies, moviesGrid);
    updateLoadMoreButton();
}

async function searchMovies() {
    const mood = moodSelect.value;
    const genre = genreSelect.value;
    const year = yearSelect.value;

    currentPage = 1;
    currentFilters = {
        sort_by: 'popularity.desc',
        'vote_count.gte': 100
    };

    // Add genre (from mood or direct selection)
    if (mood && !genre) {
        const genres = moodToGenres[mood];
        currentFilters.with_genres = genres.join(',');
    } else if (genre) {
        currentFilters.with_genres = genre;
    }

    // Add year
    if (year) {
        if (year.includes('-')) {
            const [start, end] = year.split('-');
            currentFilters['primary_release_date.gte'] = `${start}-01-01`;
            currentFilters['primary_release_date.lte'] = `${end}-12-31`;
        } else {
            currentFilters.primary_release_year = year;
        }
    }

    const data = await fetchMovies('/discover/movie', currentFilters, currentPage);
    allMovies = data.results || [];
    totalPages = data.total_pages || 1;
    
    currentView = 'results';
    resultsSection.classList.remove('hidden');
    watchlistSection.classList.add('hidden');
    
    resultsTitle.textContent = mood ? `${mood.charAt(0).toUpperCase() + mood.slice(1)} Movies` : 'Search Results';
    displayMovies(allMovies, moviesGrid);
    updateLoadMoreButton();
}

async function discoverMovies() {
    currentPage = 1;
    currentFilters = {
        sort_by: 'popularity.desc'
    };
    
    const data = await fetchMovies('/movie/popular', currentFilters, currentPage);
    allMovies = data.results || [];
    totalPages = data.total_pages || 1;
    
    currentView = 'results';
    resultsSection.classList.remove('hidden');
    watchlistSection.classList.add('hidden');
    
    resultsTitle.textContent = 'Popular Movies';
    displayMovies(allMovies, moviesGrid);
    updateLoadMoreButton();
}

async function loadMoreMovies() {
    if (currentPage >= totalPages) return;
    
    currentPage++;
    const data = await fetchMovies(
        currentView === 'discover' ? '/movie/popular' : '/discover/movie', 
        currentFilters, 
        currentPage
    );
    
    const newMovies = data.results || [];
    allMovies = [...allMovies, ...newMovies];
    
    displayMovies(allMovies, moviesGrid);
    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    if (currentPage < totalPages && currentView === 'results') {
        loadMoreBtn.classList.remove('hidden');
    } else {
        loadMoreBtn.classList.add('hidden');
    }
}

function showWatchlist() {
    currentView = 'watchlist';
    resultsSection.classList.add('hidden');
    watchlistSection.classList.remove('hidden');
    
    if (watchlist.length === 0) {
        emptyMessage.classList.remove('hidden');
        watchlistGrid.innerHTML = '';
    } else {
        emptyMessage.classList.add('hidden');
        displayMovies(watchlist, watchlistGrid, true);
    }
}

// Display Movies
function displayMovies(movies, container, isWatchlist = false) {
    if (movies.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No movies found. Try different filters!</p>';
        return;
    }

    container.innerHTML = movies.map(movie => createMovieCard(movie, isWatchlist)).join('');
    
    // Add event listeners
    container.querySelectorAll('.movie-card').forEach(card => {
        const movieId = parseInt(card.dataset.id);
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-watchlist') && !e.target.classList.contains('btn-remove')) {
                showMovieDetails(movieId);
            }
        });
    });

    container.querySelectorAll('.btn-watchlist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = parseInt(e.target.dataset.id);
            const movie = allMovies.find(m => m.id === movieId);
            if (movie) addToWatchlist(movie);
        });
    });

    container.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = parseInt(e.target.dataset.id);
            removeFromWatchlist(movieId);
        });
    });
}

function createMovieCard(movie, isWatchlist = false) {
    const posterUrl = movie.poster_path 
        ? `${IMAGE_BASE_URL}${movie.poster_path}` 
        : 'https://via.placeholder.com/500x750?text=No+Poster';
    
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    
    return `
        <div class="movie-card" data-id="${movie.id}">
            <img src="${posterUrl}" alt="${movie.title}" class="movie-poster">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span class="movie-year">${year}</span>
                    <span class="movie-rating">⭐ ${rating}</span>
                </div>
                <p class="movie-overview">${movie.overview || 'No description available.'}</p>
                <div class="movie-actions">
                    ${isWatchlist 
                        ? `<button class="btn-remove" data-id="${movie.id}">Remove</button>`
                        : `<button class="btn-watchlist" data-id="${movie.id}">Add to Watchlist</button>`
                    }
                </div>
            </div>
        </div>
    `;
}

// Movie Details Modal
async function showMovieDetails(movieId) {
    const movie = await fetchMovieDetails(movieId);
    if (!movie) return;

    const posterUrl = movie.poster_path 
        ? `${IMAGE_BASE_URL}${movie.poster_path}` 
        : 'https://via.placeholder.com/500x750?text=No+Poster';
    
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
    
    const genres = movie.genres ? movie.genres.map(g => 
        `<span class="genre-tag">${g.name}</span>`
    ).join('') : '';

    const director = movie.credits?.crew?.find(c => c.job === 'Director')?.name || 'N/A';
    const cast = movie.credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || 'N/A';

    modalBody.innerHTML = `
        <img src="${posterUrl}" alt="${movie.title}" class="modal-poster">
        <h2 class="modal-title">${movie.title}</h2>
        <div class="modal-meta">
            <span>⭐ ${rating}</span>
            <span>📅 ${year}</span>
            <span>⏱️ ${runtime}</span>
        </div>
        <div class="modal-genres">${genres}</div>
        <p class="modal-overview">${movie.overview || 'No description available.'}</p>
        <p style="margin-bottom: 10px;"><strong>Director:</strong> ${director}</p>
        <p><strong>Cast:</strong> ${cast}</p>
    `;

    movieModal.classList.remove('hidden');
}

function closeModal() {
    movieModal.classList.add('hidden');
}

// Initialize app
init();