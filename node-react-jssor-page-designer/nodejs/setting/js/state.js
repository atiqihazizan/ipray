/**
 * Global State Management
 * Pengurusan state aplikasi secara global
 */

// Application state
const state = {
    socket: null,
    currentFileName: '',
    currentData: [],
    currentColumns: [],
    editingRowId: null,
    isAddMode: false,
    lastEditedRowId: null, // Untuk scroll ke row selepas reload
    scrollPosition: null // Untuk maintain scroll position
};

// Getters
export const getSocket = () => state.socket;
export const getCurrentFileName = () => state.currentFileName;
export const getCurrentData = () => state.currentData;
export const getCurrentColumns = () => state.currentColumns;
export const getEditingRowId = () => state.editingRowId;
export const isAddMode = () => state.isAddMode;
export const getLastEditedRowId = () => state.lastEditedRowId;
export const getScrollPosition = () => state.scrollPosition;

// Setters
export const setSocket = (socket) => { state.socket = socket; };
export const setCurrentFileName = (fileName) => { state.currentFileName = fileName; };
export const setCurrentData = (data) => { state.currentData = data; };
export const setCurrentColumns = (columns) => { state.currentColumns = columns; };
export const setEditingRowId = (id) => { state.editingRowId = id; };
export const setAddMode = (mode) => { state.isAddMode = mode; };
export const setLastEditedRowId = (id) => { state.lastEditedRowId = id; };
export const setScrollPosition = (position) => { state.scrollPosition = position; };

// Find row by ID
export const findRowById = (id) => {
    return state.currentData.find(r => r.id === id);
};

// Export untuk browser environment
if (typeof window !== 'undefined') {
    window.AppState = {
        getSocket,
        getCurrentFileName,
        getCurrentData,
        getCurrentColumns,
        getEditingRowId,
        isAddMode,
        getLastEditedRowId,
        getScrollPosition,
        setSocket,
        setCurrentFileName,
        setCurrentData,
        setCurrentColumns,
        setEditingRowId,
        setAddMode,
        setLastEditedRowId,
        setScrollPosition,
        findRowById
    };
}
