import { Account, Avatars, Client, Databases, ID, Query, Storage } from 'react-native-appwrite';

export const appwriteConfig = {
    endpoint: 'https://cloud.appwrite.io/v1',
    platform: 'com.jpsdev.aorareactnative',
    projectId: '6720cfdf002983dd8042',
    databaseId: '6720d1b100312527b9d3',
    userCollectionId: '6720d1e2002b321045c6',
    videoCollectionId: '6720d20b000b678ef8f4',
    storageId: '6720d3900023194297f1'
}

const {
    endpoint,
    platform,
    projectId,
    databaseId,
    userCollectionId,
    videoCollectionId,
    storageId,
} = appwriteConfig

// Init your React Native SDK
const client = new Client();

client
    .setEndpoint(endpoint) // Your Appwrite Endpoint
    .setProject(projectId) // Your project ID
    .setPlatform(platform); // Your application ID or bundle ID.

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const storage = new Storage(client);

export const createUser = async (email, password, username) => {
    // Register User
    try {
        const newAcc = await account.create(
            ID.unique(),
            email,
            password,
            username
        )

        if (!newAcc) throw Error

        const avatarUrl = avatars.getInitials(username)

        await signIn(email, password)

        const newUser = await databases.createDocument(
            databaseId,
            userCollectionId,
            ID.unique(),
            {
                accountId: newAcc.$id,
                email,
                username,
                avatar: avatarUrl
            }
        )

        return newUser
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}

export async function signIn (email, password) {
    try {
        const session = await account.createEmailPasswordSession(email, password)
        return session
    } catch (error) {
        throw new Error(error)
    }
}

export async function getCurrentUser () {
    try {
        const currentAcc = await account.get()

        if (!currentAcc) throw Error

        const currentUser = await databases.listDocuments(
            databaseId,
            userCollectionId,
            [Query.equal('accountId', currentAcc.$id)]
        )

        if (!currentUser) throw Error

        return currentUser.documents[0]
    } catch (error) {
        throw new Error(error)
    }
}

export async function getAllPosts () {
    try {
        const posts = await databases.listDocuments(
            databaseId,
            videoCollectionId
        )

        return posts.documents
    } catch (error) {
        throw new Error(error)
    }
}

export async function getLatestPosts () {
    try {
        const posts = await databases.listDocuments(
            databaseId,
            videoCollectionId,
            [Query.orderDesc('$createdAt', Query.limit(5))],
        )

        return posts.documents
    } catch (error) {
        throw new Error(error)
    }
}

export async function searchPosts (query) {
    try {
        const posts = await databases.listDocuments(
            databaseId,
            videoCollectionId,
            [Query.search('title', query)],
        )

        return posts.documents
    } catch (error) {
        throw new Error(error)
    }
}

export async function getUserPosts (userId) {
    try {
        const posts = await databases.listDocuments(
            databaseId,
            videoCollectionId,
            [Query.equal('creator', userId)],
        )

        return posts.documents
    } catch (error) {
        throw new Error(error)
    }
}

export async function signOut () {
    try {
        const session = await account.deleteSession('current')
        return session
    } catch (error) {
        throw new Error(error)
    }
}

export async function getFilePreview (fileId, type) {
    let fileUrl

    try {
        if (type === 'image') {
            fileUrl = storage.getFilePreview(
                storageId,
                fileId,
                2000,
                2000,
                "top",
                100
            )
        } else if (type === 'video') {
            fileUrl = storage.getFileView(
                storageId,
                fileId
            )
        } else {
            throw new Error('Invalid file type')
        }

        if (!fileUrl) throw Error

        return fileUrl
    } catch (error) {
        throw new Error(error)
    }
}

export async function uploadFile (file, type) {
    if (!file) return

    const { mimeType, ...rest } = file
    const asset = { 
        name: file.fileName,
        type: file.mimeType,
        size: file.fileSize,
        uri: file.uri
    }

    try {
        const uploadedFile = await storage.createFile(
            storageId,
            ID.unique(),
            asset
        )

        const fileUrl = await storage.getFilePreview(
            uploadedFile.$id,
            type
        )

        return fileUrl
    } catch (error) {
        throw new Error(error)
    }
}

export async function uploadVideo (form) {
    try {
        const [thumbnailUrl, videoUrl] = await Promise.all([
            uploadFile(form.thumbnail, 'image'),
            uploadFile(form.video, 'video')
        ])

        const newPosts = await databases.createDocument(
            databaseId,
            videoCollectionId,
            ID.unique(),
            {
                title: form.title,
                thumbnail: thumbnailUrl,
                video: videoUrl,
                prompt: form.prompt,
                creator: form.userId
            }
        )

        return newPosts
    } catch (error) {
        throw new Error(error)
    }
}