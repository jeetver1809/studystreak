import { Alert } from 'react-native';

// REPLACE WITH YOUR ACTUAL PRESET NAME FROM CLOUDINARY SETTINGS -> UPLOAD
const CLOUD_NAME = "drk1v0vom";
const UPLOAD_PRESET = "studystreak_unsigned"; // User needs to create this!

export const CloudinaryService = {
    uploadImage: async (uri: string): Promise<string | null> => {
        try {
            const data = new FormData();

            // Append the image file
            // @ts-ignore - React Native handling of FormData files
            data.append('file', {
                uri: uri,
                type: 'image/jpeg',
                name: 'upload.jpg',
            });

            data.append('upload_preset', UPLOAD_PRESET);
            data.append('cloud_name', CLOUD_NAME);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'post',
                body: data,
            });

            const result = await response.json();

            if (result.secure_url) {
                console.log("Cloudinary Upload Success:", result.secure_url);
                return result.secure_url;
            } else {
                console.error("Cloudinary Upload Failed:", result);
                Alert.alert("Upload Failed", result.error?.message || "Unknown error");
                return null;
            }
        } catch (error: any) {
            console.error("Cloudinary Error:", error);
            Alert.alert("Upload Error", error.message);
            return null;
        }
    }
};
