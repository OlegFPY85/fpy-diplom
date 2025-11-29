const initialState = {
    user: null,
    files: [],
    users: [],
};

export const rootReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, user: action.payload };
        case 'SET_FILES':
            return { ...state, files: action.payload };
        case 'ADD_FILE':
            return { ...state, files: [...state.files, action.payload] };
        case 'REMOVE_FILE':
            return { ...state, files: state.files.filter(file => file.id !== action.payload) };
        case 'SET_USERS':
            return { ...state, users: action.payload };
        case 'UPDATE_COMMENT_SUCCESS':
            return {
                ...state,
                files: state.files.map(file =>
                    file.id === action.payload.file.id ? { ...file, comment: action.payload.file.comment } : file
                ),
            };
        case 'UPDATE_FILE_NAME_SUCCESS':
            return {
                ...state,
                files: state.files.map(file =>
                    file.id === action.payload.file.id ? { ...file, original_name: action.payload.file.original_name } : file
                ),
            };
        default:
            return state;
    }
};
