import { Client, Storage, ID } from 'appwrite';

const client = new Client();
client
  .setEndpoint('http://190.116.26.62:34800/v1')
  .setProject('69d9bfa9002876f4ff92');

const storage = new Storage(client);

const BUCKET_ID = '69d9c01600341b84674c';

export const deleteImage = async (fileUrl) => {
  try {
    if (!fileUrl || !fileUrl.includes('/files/')) return;
    
    // Extraer el ID del archivo de la URL de Appwrite
    // Formato: .../files/{fileId}/view?...
    const parts = fileUrl.split('/files/');
    if (parts.length < 2) return;
    const fileId = parts[1].split('/')[0];
    
    await storage.deleteFile(BUCKET_ID, fileId);
  } catch (error) {
    console.error("Error al eliminar imagen de Appwrite:", error);
  }
};

export const uploadImage = async (file) => {
  try {
    // Renombrar el archivo con un timestamp para que sea único en la consola de Appwrite
    const newFileName = `${Date.now()}_${file.name}`;
    const renamedFile = new File([file], newFileName, { type: file.type });

    const response = await storage.createFile(
      BUCKET_ID,
      ID.unique(),
      renamedFile
    );

    return `http://190.116.26.62:34800/v1/storage/buckets/${BUCKET_ID}/files/${response.$id}/view?project=69d9bfa9002876f4ff92`;
  } catch (error) {
    console.error("Error Appwrite:", error);
    throw error;
  }
};

export default storage;


