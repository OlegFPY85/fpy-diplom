import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL

export const registerUser = async (userData) => {
    return await axios.post(`${API_URL}auth/register/`, userData);
};

export const loginUser = async (credentials) => {
    return await axios.post(`${API_URL}auth/login/`, credentials);
};

export const fetchFiles = async (token) => {
    return await axios.get(`${API_URL}files/`, {
        headers: {
            Authorization: `Token ${token}`,
        },
        withCredentials: true,
    });
};

export const uploadFile = async (file, comment, token) => {
    const formData = new FormData();
    formData.append('file_path', file);
    formData.append('comment', comment);
    return await axios.post(`${API_URL}files/`, formData, {
        headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
    });
};

export const updateComment = async (fileId, comment, token) => {
    return await axios.patch(`${API_URL}files/${fileId}/`, { comment }, {
        headers: {
            Authorization: `Token ${token}`,
        },
        withCredentials: true,
    });
};

export const updateFileName = async (fileId, newName, token) => {
    return await axios.patch(`${API_URL}files/${fileId}/rename_file/`, { new_name: newName }, {
        headers: {
            Authorization: `Token ${token}`,
        },
        withCredentials: true,
    });
};

export const deleteFile = async (fileId, token) => {
    return await axios.delete(`${API_URL}files/${fileId}/`, {
        headers: {
            Authorization: `Token ${token}`,
        },
        withCredentials: true,
    });
};

export const fetchUsers = async (token) => {
    return await axios.get(`${API_URL}users/list_users/`, {
        headers: {
            Authorization: `Token ${token}`,
        },
        withCredentials: true,
    });
};

export const fetchMyFiles = async (token) => {
    return await axios.get(`${API_URL}files/my_files/`, {
        headers: {
            Authorization: `Token ${token}`,
        },
        withCredentials: true,
    });
};

export const fetchUserData = async (token) => {
    return await axios.get(`${API_URL}users/me/`, {
        headers: {
            Authorization: `Token ${token}`,
        },
        withCredentials: true,
    });
};

export const viewFile = async (fileId, token) => {
    return await axios.get(`${API_URL}files/${fileId}/view/`, {
        headers: {
            Authorization: `Token ${token}`,
        },
        responseType: 'blob',
        withCredentials: true,
    });
};

export const downloadFile = async (fileId, token) => {
    return await axios.get(`${API_URL}files/${fileId}/download/`, {
        headers: {
            Authorization: `Token ${token}`,
        },
        responseType: 'blob',
        withCredentials: true,
    });
};

export const getShareLink = async (fileId, token) => {
    return await axios.get(`${API_URL}files/${fileId}/get_special_link/`, {
        headers: {
            Authorization: `Token ${token}`,
        },
        withCredentials: true,
    });
};
