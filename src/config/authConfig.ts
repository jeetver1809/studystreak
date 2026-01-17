export const GoogleAuthConfig = {
    // Get these from Google Cloud Console: https://console.cloud.google.com/
    // 1. Create a project
    // 2. Configure OAuth Consent Screen
    // 3. Create Credentials > OAuth client ID

    // For Expo Go development: 
    // You mainly need a "Web" Client ID. 
    // Add "https://auth.expo.io/@your-username/studystreak" to "Authorized redirect URIs" if using proxy,
    // or just use the IDs directly.

    androidClientId: 'YOUR_ANDROID_CLIENT_ID', // Create an Android Client ID
    iosClientId: 'YOUR_IOS_CLIENT_ID',         // Create an iOS Client ID
    webClientId: '177631596369-8k7lurve5f5adfb8hdrbr96opp63uo6t.apps.googleusercontent.com',         // Create a Web Client ID
};
