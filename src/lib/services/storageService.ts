// lib/services/storageService.ts
import { auth, storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'

export const storageService = {
  /**
   * Upload une image vers Firebase Storage
   * @param file File object from input
   * @param boutiqueId ID de la boutique
   * @returns URL publique de l'image uploadée
   */
  async uploadProductImage(file: File, boutiqueId: string): Promise<{success: boolean, url?: string, error?: string}> {
    try {
      // Validation du fichier
        console.log('=== DEBUG UPLOAD ===')
    console.log('Boutique ID:', boutiqueId)
    console.log('Current user auth:', auth.currentUser)
    console.log('User UID:', auth.currentUser?.uid)
    console.log('====================')
      if (!file) {
        return { success: false, error: 'Aucun fichier sélectionné' }
      }

      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Format d\'image non supporté. Utilisez JPG, PNG ou WebP' }
      }

      // Vérifier la taille (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        return { success: false, error: 'L\'image est trop volumineuse. Maximum 5MB' }
      }

      // Générer un nom unique pour le fichier
      const fileExtension = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExtension}`
      
      // Créer la référence vers le storage
      const storageRef = ref(storage, `products/${boutiqueId}/${fileName}`)
      
      // Upload du fichier
      console.log('Upload de l\'image vers Firebase Storage...')
      const snapshot = await uploadBytes(storageRef, file)
      
      // Récupérer l'URL publique
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      console.log('Image uploadée avec succès:', downloadURL)
      return { success: true, url: downloadURL }
      
    } catch (error) {
      console.error('Erreur upload image:', error)
      return { success: false, error: 'Erreur lors de l\'upload de l\'image' }
    }
  },

  /**
   * Upload plusieurs images
   */
  async uploadMultipleImages(files: File[], boutiqueId: string): Promise<{success: boolean, urls?: string[], errors?: string[]}> {
    const results = await Promise.allSettled(
      files.map(file => this.uploadProductImage(file, boutiqueId))
    )

    const urls: string[] = []
    const errors: string[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.url) {
        urls.push(result.value.url)
      } else {
        const error = result.status === 'rejected' 
          ? result.reason 
          : result.value.error || 'Erreur inconnue'
        errors.push(`Image ${index + 1}: ${error}`)
      }
    })

    return {
      success: urls.length > 0,
      urls: urls.length > 0 ? urls : undefined,
      errors: errors.length > 0 ? errors : undefined
    }
  },

  /**
   * Supprimer une image du storage
   */
  async deleteImage(imageUrl: string): Promise<{success: boolean, error?: string}> {
    try {
      // Extraire le path depuis l'URL Firebase
      const url = new URL(imageUrl)
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/)
      
      if (!pathMatch) {
        return { success: false, error: 'URL d\'image invalide' }
      }

      const imagePath = decodeURIComponent(pathMatch[1])
      const imageRef = ref(storage, imagePath)
      
      await deleteObject(imageRef)
      console.log('Image supprimée:', imagePath)
      
      return { success: true }
    } catch (error) {
      console.error('Erreur suppression image:', error)
      return { success: false, error: 'Erreur lors de la suppression' }
    }
  },

  /**
   * Convertir un blob URL en File pour upload
   */
  async blobUrlToFile(blobUrl: string, fileName: string): Promise<File | null> {
    try {
      const response = await fetch(blobUrl)
      const blob = await response.blob()
      return new File([blob], fileName, { type: blob.type })
    } catch (error) {
      console.error('Erreur conversion blob vers file:', error)
      return null
    }
  }
}

// Configuration des règles Firebase Storage
/* 
Ajoutez ces règles dans votre Firebase Storage :

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Images des produits - lecture publique, écriture pour propriétaires
    match /products/{boutiqueId}/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == boutiqueId;
      allow delete: if request.auth != null && request.auth.uid == boutiqueId;
    }
  }
}
*/