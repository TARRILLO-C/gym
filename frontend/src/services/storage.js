import { Client, Storage, ID } from 'appwrite';

const ENDPOINT = 'http://190.116.26.62:34800/v1';
const PROJECT_ID = '69daed000025bccae664';
const BUCKET_ID = '69daed1700276946a9ef';

const client = new Client();
client
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

const storage = new Storage(client);

export const deleteImage = async (fileUrl) => {
  try {
    if (!fileUrl || !fileUrl.includes('/files/')) return;
    
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
    // Generar nombre único sin conservar el original
    const extension = file.name.split('.').pop();
    const newFileName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const renamedFile = new File([file], newFileName, { type: file.type });

    const response = await storage.createFile(
      BUCKET_ID,
      ID.unique(),
      renamedFile
    );

    return `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${response.$id}/view?project=${PROJECT_ID}`;
  } catch (error) {
    console.error("Error Appwrite:", error);
    throw error;
  }
};

export default storage;


