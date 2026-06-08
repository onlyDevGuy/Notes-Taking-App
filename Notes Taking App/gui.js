// State Management
class SmartNotesApp {
    constructor() {
        this.state = {
            notes: [],
            searchTerm: '',
            sortBy: 'newest',
            darkMode: false,
            viewMode: 'grid',
            isLoading: true,
            colorPalette: {
                show: false,
                noteId: null,
                position: { top: 0, left: 0 }
            }
        };

        this.LOCAL_STORAGE_KEY = 'smart_notes_data';
        this.DARK_MODE_KEY = 'smart_notes_dark_mode';
        this.searchTimeout = null;

        this.gradients = [
            'gradient-1', 'gradient-2', 'gradient-3',
            'gradient-4', 'gradient-5', 'gradient-6'
        ];

        this.colors = [
            { name: 'White', value: '#ffffff' },
            { name: 'Yellow', value: '#fff9c4' },
            { name: 'Green', value: '#c8e6c9' },
            { name: 'Blue', value: '#bbdefb' },
            { name: 'Pink', value: '#f8bbd0' },
            { name: 'Purple', value: '#e1bee7' }
        ];

        this.init();
    }

    // Initialize the app
    init() {
        this.loadState();
        this.setupEventListeners();
        this.render();
        
        // Hide loading spinner after initial render
        setTimeout(() => {
            this.setState({ isLoading: false });
        }, 500);
    }

    // Load state from localStorage
    loadState() {
        try {
            const savedNotes = localStorage.getItem(this.LOCAL_STORAGE_KEY);
            const savedDarkMode = localStorage.getItem(this.DARK_MODE_KEY) === 'true';

            if (savedNotes) {
                const parsedNotes = JSON.parse(savedNotes).map(note => ({
                    ...note,
                    timestamp: new Date(note.timestamp)
                }));
                this.setState({ notes: parsedNotes });
            }

            this.setState({ darkMode: savedDarkMode });
            document.documentElement.setAttribute('data-theme', savedDarkMode ? 'dark' : 'light');
        } catch (error) {
            this.showNotification('Error loading notes', 'error');
        }
    }

    // Save state to localStorage
    saveState() {
        try {
            localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(this.state.notes));
            localStorage.setItem(this.DARK_MODE_KEY, this.state.darkMode.toString());
        } catch (error) {
            this.showNotification('Error saving notes', 'error');
        }
    }

    // Set state and trigger re-render
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.saveState();
        this.render();
    }

    // Generate unique ID
    generateId() {
        return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Create a new note
    createNote() {
        const newNote = {
            _id: this.generateId(),
            title: '',
            content: '',
            color: '#ffffff',
            pinned: false,
            tags: [],
            timestamp: new Date()
        };

        this.setState({
            notes: [newNote, ...this.state.notes]
        });

        this.showNotification('Note created successfully', 'success');
    }

    // Update a note
    updateNote(noteId, updates) {
        const updatedNotes = this.state.notes.map(note => 
            note._id === noteId 
                ? { ...note, ...updates, timestamp: new Date() }
                : note
        );

        this.setState({ notes: updatedNotes });
    }

    // Delete a note
    deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            const updatedNotes = this.state.notes.filter(note => note._id !== noteId);
            this.setState({ notes: updatedNotes });
            this.showNotification('Note deleted successfully', 'success');
        }
    }

    // Toggle pin status
    togglePin(noteId) {
        const updatedNotes = this.state.notes.map(note => 
            note._id === noteId 
                ? { ...note, pinned: !note.pinned }
                : note
        );

        const note = this.state.notes.find(n => n._id === noteId);
        this.setState({ notes: updatedNotes });
        this.showNotification(note?.pinned ? 'Note unpinned' : 'Note pinned', 'success');
    }

    // Add tag to note
    addTag(noteId, tagInput) {
        const tag = tagInput.value.trim();
        if (!tag) return;

        const note = this.state.notes.find(n => n._id === noteId);
        if (note && !note.tags.includes(tag)) {
            this.updateNote(noteId, { tags: [...note.tags, tag] });
            tagInput.value = '';
        }
    }

    // Remove tag from note
    removeTag(noteId, tagToRemove) {
        const note = this.state.notes.find(n => n._id === noteId);
        if (note) {
            this.updateNote(noteId, { 
                tags: note.tags.filter(tag => tag !== tagToRemove) 
            });
        }
    }

    // Format timestamp
    formatTimestamp(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Show color palette
    showColorPalette(noteId, button) {
        const rect = button.getBoundingClientRect();
        this.setState({
            colorPalette: {
                show: true,
                noteId,
                position: {
                    top: rect.bottom + window.scrollY + 5,
                    left: rect.left + window.scrollX
                }
            }
        });
    }

    // Hide color palette
    hideColorPalette() {
        this.setState({
            colorPalette: { show: false, noteId: null, position: { top: 0, left: 0 } }
        });
    }

    // Handle search with debouncing
    handleSearch(value) {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            this.setState({ searchTerm: value });
        }, 300);
    }

    // Filter and sort notes
    getFilteredAndSortedNotes() {
        let filtered = this.state.notes;

        // Filter by search term
        if (this.state.searchTerm) {
            const term = this.state.searchTerm.toLowerCase();
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(term) ||
                note.content.toLowerCase().includes(term) ||
                note.tags.some(tag => tag.toLowerCase().includes(term))
            );
        }

        // Sort notes
        const sorted = [...filtered].sort((a, b) => {
            // Pinned notes always first
            if (a.pinned !== b.pinned) return b.pinned - a.pinned;

            switch (this.state.sortBy) {
                case 'newest':
                    return new Date(b.timestamp) - new Date(a.timestamp);
                case 'oldest':
                    return new Date(a.timestamp) - new Date(b.timestamp);
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        return sorted;
    }

    // Export notes
    exportNotes() {
        try {
            const dataStr = JSON.stringify(this.state.notes, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `smart-notes-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            this.showNotification('Notes exported successfully', 'success');
        } catch (error) {
            this.showNotification('Error exporting notes', 'error');
        }
    }

    // Import notes
    importNotes(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedNotes = JSON.parse(e.target.result);
                const validatedNotes = importedNotes.map(note => ({
                    ...note,
                    timestamp: new Date(note.timestamp),
                    _id: note._id || this.generateId()
                }));

                this.setState({ notes: validatedNotes });
                this.showNotification('Notes imported successfully', 'success');
            } catch (error) {
                this.showNotification('Error importing notes. Invalid file format.', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Setup event listeners
    setupEventListeners() {
        // Add note button
        document.getElementById('addBtn').addEventListener('click', () => this.createNote());

        // Search input
        document.getElementById('searchNotes').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Sort select
        document.getElementById('sortNotes').addEventListener('change', (e) => {
            this.setState({ sortBy: e.target.value });
        });

        // View mode toggle
        document.getElementById('viewModeToggle').addEventListener('click', () => {
            const newViewMode = this.state.viewMode === 'grid' ? 'list' : 'grid';
            this.setState({ viewMode: newViewMode });
            
            // Update icon
            const icon = document.querySelector('#viewModeToggle i');
            icon.className = newViewMode === 'grid' ? 'fas fa-th-large' : 'fas fa-list';
        });

        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            const newDarkMode = !this.state.darkMode;
            this.setState({ darkMode: newDarkMode });
            document.documentElement.setAttribute('data-theme', newDarkMode ? 'dark' : 'light');
            
            // Update icon
            const icon = document.querySelector('#darkModeToggle i');
            icon.className = newDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => this.exportNotes());

        // Import file input
        document.getElementById('importFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importNotes(file);
            }
            e.target.value = ''; // Reset input
        });

        // Color palette click outside
        document.addEventListener('click', (e) => {
            const palette = document.getElementById('colorPalette');
            if (this.state.colorPalette.show && !palette.contains(e.target)) {
                this.hideColorPalette();
            }
        });

        // Color palette options
        document.getElementById('colorPalette').addEventListener('click', (e) => {
            const colorOption = e.target.closest('.color-option');
            if (colorOption && this.state.colorPalette.noteId) {
                const color = colorOption.dataset.color;
                this.updateNote(this.state.colorPalette.noteId, { color });
                this.hideColorPalette();
            }
        });
    }

    // Render the app
    render() {
        const filteredNotes = this.getFilteredAndSortedNotes();
        const main = document.getElementById('main');
        
        // Show/hide loading spinner
        const loadingSpinner = document.getElementById('loadingSpinner');
        loadingSpinner.style.display = this.state.isLoading ? 'flex' : 'none';

        // Update color palette position
        const palette = document.getElementById('colorPalette');
        if (this.state.colorPalette.show) {
            palette.style.top = `${this.state.colorPalette.position.top}px`;
            palette.style.left = `${this.state.colorPalette.position.left}px`;
            palette.classList.add('show');
        } else {
            palette.classList.remove('show');
        }

        // Render notes or empty state
        if (filteredNotes.length === 0 && !this.state.isLoading) {
            this.renderEmptyState(main);
        } else {
            this.renderNotes(main, filteredNotes);
        }
    }

    // Render empty state
    renderEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sticky-note"></i>
                <h3>${this.state.searchTerm ? 'No notes found' : 'No notes yet'}</h3>
                <p>${this.state.searchTerm 
                    ? 'Try a different search term' 
                    : 'Create your first note to get started'}</p>
                ${!this.state.searchTerm ? `
                    <button class="btn-primary" onclick="app.createNote()">
                        <i class="fas fa-plus"></i>
                        Create Note
                    </button>
                ` : ''}
            </div>
        `;
    }

    // Render notes
    renderNotes(container, notes) {
        const viewClass = this.state.viewMode === 'grid' ? 'notes-grid' : 'notes-list';
        
        container.innerHTML = `
            <div class="${viewClass}">
                ${notes.map((note, index) => this.renderNote(note, index)).join('')}
            </div>
        `;

        // Attach event listeners to rendered notes
        this.attachNoteEventListeners();
    }

    // Render individual note
    renderNote(note, index) {
        const gradientClass = this.gradients[index % this.gradients.length];
        const isPinnedClass = note.pinned ? 'pinned' : '';

        return `
            <div class="note ${isPinnedClass}" data-id="${note._id}" style="background-color: ${note.color}">
                <div class="note-tab ${gradientClass}"></div>
                <div class="note-header">
                    <input type="text" class="note-title" value="${note.title}" placeholder="Note title...">
                    <div class="note-tools">
                        <button class="tool-btn pin-btn ${note.pinned ? 'active' : ''}" title="${note.pinned ? 'Unpin' : 'Pin'}">
                            <i class="fas fa-thumbtack"></i>
                        </button>
                        <button class="tool-btn color-btn" title="Change color">
                            <i class="fas fa-palette"></i>
                        </button>
                        <button class="tool-btn delete" title="Delete note">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content">
                    <textarea placeholder="Start typing...">${note.content}</textarea>
                </div>
                <div class="note-footer">
                    <span class="timestamp">${this.formatTimestamp(note.timestamp)}</span>
                    <div class="note-tags">
                        ${note.tags.map(tag => `
                            <span class="tag">
                                ${tag}
                                <button class="tag-remove" title="Remove tag">
                                    <i class="fas fa-times"></i>
                                </button>
                            </span>
                        `).join('')}
                        <input type="text" class="tag-input" placeholder="Add tag...">
                    </div>
                </div>
            </div>
        `;
    }

    // Attach event listeners to rendered notes
    attachNoteEventListeners() {
        document.querySelectorAll('.note').forEach(noteElement => {
            const noteId = noteElement.dataset.id;
            const note = this.state.notes.find(n => n._id === noteId);
            if (!note) return;

            // Title input
            const titleInput = noteElement.querySelector('.note-title');
            titleInput.addEventListener('input', (e) => {
                this.updateNote(noteId, { title: e.target.value });
            });

            // Content textarea
            const contentTextarea = noteElement.querySelector('textarea');
            contentTextarea.addEventListener('input', (e) => {
                this.updateNote(noteId, { content: e.target.value });
            });

            // Pin button
            const pinBtn = noteElement.querySelector('.pin-btn');
            pinBtn.addEventListener('click', () => this.togglePin(noteId));

            // Color button
            const colorBtn = noteElement.querySelector('.color-btn');
            colorBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showColorPalette(noteId, colorBtn);
            });

            // Delete button
            const deleteBtn = noteElement.querySelector('.delete');
            deleteBtn.addEventListener('click', () => this.deleteNote(noteId));

            // Tag input
            const tagInput = noteElement.querySelector('.tag-input');
            tagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addTag(noteId, tagInput);
                }
            });

            // Tag remove buttons
            noteElement.querySelectorAll('.tag-remove').forEach((removeBtn, tagIndex) => {
                removeBtn.addEventListener('click', () => {
                    this.removeTag(noteId, note.tags[tagIndex]);
                });
            });
        });
    }
}

// Initialize the app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SmartNotesApp();
});