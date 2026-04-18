import api from './api';

export const uploadImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    // Retorna la URL pública completa del servidor Java
    return response.data.url;
  } catch (error) {
    console.error("Error Upload Local:", error);
    throw error;
  }
};

export const deleteImage = async (fileUrl) => {
  // Omitimos la función de borrado de Appwrite.
  // Podrías implementar una ruta DELETE /upload en el futuro, pero 
  // por seguridad e integridad de historiales, dejaremos huérfanas las basuras locales o borraremos manual.
  console.log("Ignorando borrado físico anterior para:", fileUrl);
};

export default { uploadImage, deleteImage };

