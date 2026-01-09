import { 
    registerUser, loginUser, fetchFiles, uploadFile, deleteFile, 
    fetchUsers, fetchUserData, updateComment, updateFileName,
    viewFile as viewFileAPI, downloadFile as downloadFileAPI, getShareLink as getShareLinkAPI 
} from '../api';

export const setUser = (user) => ({
    type: 'SET_USER',
    payload: user,
});

export const setFiles = (files) => ({
    type: 'SET_FILES',
    payload: files,
});

export const addFile = (file) => ({
    type: 'ADD_FILE',
    payload: file,
});

export const removeFile = (fileId) => ({
    type: 'REMOVE_FILE',
    payload: fileId,
});

export const setUsers = (users) => ({
    type: 'SET_USERS',
    payload: users,
});

export const updateCommentSuccess = (file) => ({
    type: 'UPDATE_COMMENT_SUCCESS',
    payload: { file },
});
export const updateCommentFailure = (error) => ({
    type: 'UPDATE_COMMENT_FAILURE',
    payload: { error },
});

export const updateFileNameSuccess = (file) => ({
    type: 'UPDATE_FILE_NAME_SUCCESS',
    payload: { file },
});

export const updateFileNameFailure = (error) => ({
    type: 'UPDATE_FILE_NAME_FAILURE',
    payload: { error },
});

export const register = (userData) => async (dispatch) => {
    try {
        const response = await registerUser(userData);
        localStorage.setItem('token', response.data.token);
        dispatch(setUser(response.data));
    } catch (error) {
        console.error("Registration failed:", error);
        throw "Registration failed: " + error;
    }
};

export const login = (credentials) => async (dispatch) => {
    try {
        const response = await fetch('/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });
        
        console.log("Login response status:", response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка авторизации');
        }
        
        const data = await response.json();
        console.log("Login success data:", data);
        
        if (data.token) {
            // Сохраняем токен
            localStorage.setItem('token', data.token);
            
            // Получаем полные данные пользователя
            const userResponse = await fetch('/api/users/me/', {
                headers: {
                    'Authorization': `Token ${data.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log("User data from /me:", userData);
                
                // Сохраняем пользователя
                localStorage.setItem('user', JSON.stringify(userData));
                
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: userData
                });
            } else {
                throw new Error('Не удалось получить данные пользователя');
            }
        } else {
            throw new Error('Токен не получен от сервера');
        }
    } catch (error) {
        console.error("Login failed:", error);
        
        // Очищаем при ошибке
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        throw error;
    }
};

export const logout = () => async (dispatch) => {
        localStorage.removeItem('token');
        dispatch(setUser(null));
};

export const loadFiles = (token) => async (dispatch) => {
    const response = await fetchFiles(token);
    dispatch(setFiles(response.data));
};

export const upload = (file, comment, token) => async (dispatch) => {
    try {
        const response = await uploadFile(file, comment, token);
        dispatch(addFile(response.data));
        dispatch({ type: 'UPLOAD_FILE_SUCCESS', payload: response.data });
    } catch (error) {
        console.error("Ошибка загрузки файла:", error);
        console.log(error.response.data);
        dispatch({ type: 'UPLOAD_FILE_FAILURE', payload: error });
        throw new Error(error.response.data.detail || "Ошибка загрузки файла");
    }
};

export const updateCommentAction = (fileId, comment, token) => async (dispatch) => {
    try {
        const response = await updateComment(fileId, comment, token);
        dispatch(updateCommentSuccess(response.data));
    } catch (error) {
        console.error("Ошибка обновления комментария:", error);
        dispatch(updateCommentFailure(error.response ? error.response.data : error.message));
        throw new Error(error.response.data.detail || "Ошибка обновления комментария");
    }
};

export const updateFileNameAction = (fileId, newName, token) => async (dispatch) => {
    try {
        const response = await updateFileName(fileId, newName, token);
        dispatch(updateFileNameSuccess(response.data));
    } catch (error) {
        console.error("Ошибка обновления имени файла:", error);
        dispatch(updateFileNameFailure(error.response ? error.response.data : error.message));
        throw new Error(error.response.data.detail || "Ошибка обновления имени файла");
    }
};

export const deleteFileAction = (fileId, token) => async (dispatch) => {
    await deleteFile(fileId, token);
    dispatch(removeFile(fileId));
};

export const loadUsers = (token) => async (dispatch) => {
    try {
        const response = await fetchUsers(token);
        dispatch(setUsers(response.data));
    } catch (error) {
        if (error.response && error.response.status === 403) {
            console.error("Доступ запрещен: вы не являетесь администратором.");
        } else {
            console.error("Ошибка при загрузке пользователей:", error);
        }
    }
};

export const checkAuth = () => async (dispatch) => {
    const token = localStorage.getItem('token');
    console.log("checkAuth: Token from localStorage:", token ? "Exists" : "Missing");
    
    if (!token) {
        console.log("checkAuth: No token, dispatching LOGOUT");
        dispatch({ type: 'LOGOUT' });
        // Очистите ошибочные данные из localStorage
        localStorage.removeItem('user');
        return;
    }
    
    try {
        console.log("checkAuth: Fetching user data...");
        const response = await fetch('/api/users/me/', {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("checkAuth: Response status:", response.status);
        
        if (response.ok) {
            const userData = await response.json();
            console.log("checkAuth: User data received:", userData);
            
            // ВАЖНО: Сохраняем ТОЛЬКО при успешном ответе
            localStorage.setItem('user', JSON.stringify(userData));
            
            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: userData
            });
        } else {
            console.log("checkAuth: Auth failed, status:", response.status);
            
            // Очищаем невалидные данные
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            dispatch({ type: 'LOGOUT' });
        }
    } catch (error) {
        console.error("checkAuth: Error:", error);
        
        // Очищаем при ошибке сети
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        dispatch({ type: 'LOGOUT' });
    }
};
export const viewFile = (fileId, token) => async () => {
    try {
        window.open(`${import.meta.env.VITE_API_URL}files/${fileId}/view/?token=${token}`, '_blank');
    } catch (error) {
        console.error("Ошибка при открытии файла:", error);
        throw new Error("Не удалось открыть файл");
    }
};
export const downloadFile = (fileId, token) => async (dispatch) => {
    try {
        const response = await downloadFileAPI(fileId, token);

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        const contentDisposition = response.headers['content-disposition'];
        let fileName = `file_${fileId}`;
        
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1];
            }
        }
        
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error("Ошибка при скачивании файла:", error);
        throw new Error("Не удалось скачать файл");
    }
};

export const getShareLink = (fileId, token) => async (dispatch) => {
    try {
        const response = await getShareLinkAPI(fileId, token);
        const shareUrl = response.data.special_link;

        prompt('Специальная ссылка для доступа к файлу:', shareUrl);

        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        alert('Ссылка скопирована в буфер обмена');
        
        return response.data;
    } catch (error) {
        console.error("Ошибка при получении специальной ссылки:", error);
        throw new Error(error.response?.data?.detail || 'Ошибка при получении ссылки');
    }
};
