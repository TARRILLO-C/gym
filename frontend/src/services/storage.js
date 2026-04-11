import { Client, Storage, ID } from 'appwrite';

const client = new Client();
client
  .setEndpoint('http://190.116.26.62:34800/v1')
  .setProject('69d9bfa9002876f4ff92');

const storage = new Storage(client);

const BUCKET_ID = '69d9c01600341b84674c';

export const uploadImage = async (file) => {
  try {
    const response = await storage.createFile(
      BUCKET_ID,
      ID.unique(),
      file
    );

    // Construct the file preview URL
    // Project ID: 69d9bfa9002876f4ff92
    // Endpoint: http://190.116.26.62:34800/v1
    return `http://190.116.26.62:34800/v1/storage/buckets/${BUCKET_ID}/files/${response.$id}/view?project=69d9bfa9002876f4ff92`;
  } catch (error) {
    console.error("Error Appwrite:", error);
    throw error;
  }
};

export default storage;

