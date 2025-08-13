// Service Product - CRUD et gestion des produits
// Fichier: /frontend/src/lib/services/productService.ts

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { 
  Product, 
  CreateProductData, 
  UpdateProductData,
  ProductStatus,
  ProductCategory,
  ApiResponse,
  FilterParams 
} from '@/lib/types'
import { boutiqueService } from './boutiqueService'

class ProductService {
  private readonly collectionName = 'products'

  // ==================== CRÉATION ====================

  /**
   * Créer un nouveau produit
   */
  async createProduct(data: CreateProductData): Promise<ApiResponse<Product>> {
    try {
      // Vérifier que la boutique existe et est active
      const boutiqueResult = await boutiqueService.getBoutiqueById(data.boutique_id)
      if (!boutiqueResult.success || boutiqueResult.data?.status !== 'active') {
        return {
          success: false,
          error: 'Boutique non trouvée ou inactive'
        }
      }

      // Validation des prix
      if (data.prix_min > data.prix_affichage) {
        return {
          success: false,
          error: 'Le prix minimum ne peut pas être supérieur au prix d\'affichage'
        }
      }

      const productData = {
        ...data,
        status: 'available' as ProductStatus,
        created_at: serverTimestamp(),
        // Stats initiales
        total_ventes: 0,
        total_demandes: 0
      }

      const docRef = await addDoc(collection(db, this.collectionName), productData)
      
      // Mettre à jour le compteur de produits de la boutique
      await this.updateBoutiqueProductCount(data.boutique_id, 1)

      const newProduct: Product = {
        id: docRef.id,
        ...productData,
        created_at: Timestamp.now() // Pour le retour immédiat
      }

      return {
        success: true,
        data: newProduct,
        message: 'Produit créé avec succès'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la création: ${error.message}`
      }
    }
  }

  // ==================== LECTURE ====================

  /**
   * Récupérer tous les produits d'une boutique
   */
  async getProductsByBoutique(boutiqueId: string, filters?: FilterParams): Promise<ApiResponse<Product[]>> {
    try {
      let productQuery = query(
        collection(db, this.collectionName),
        where('boutique_id', '==', boutiqueId)
      )

      // Filtres
      if (filters?.status) {
        productQuery = query(productQuery, where('status', '==', filters.status))
      }

      if (filters?.category && filters.category !== 'all') {
        productQuery = query(productQuery, where('category', '==', filters.category))
      }

      // Tri par défaut : plus récents d'abord
      productQuery = query(productQuery, orderBy('created_at', 'desc'))

      const querySnapshot = await getDocs(productQuery)
      const products: Product[] = []

      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data()
        } as Product)
      })

      // Filtrer par recherche si nécessaire
      let filteredProducts = products
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredProducts = products.filter(product => 
          product.nom.toLowerCase().includes(searchTerm) ||
          (product.description && product.description.toLowerCase().includes(searchTerm)) ||
          product.category.toLowerCase().includes(searchTerm)
        )
      }

      return {
        success: true,
        data: filteredProducts
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Récupérer un produit par ID
   */
  async getProductById(id: string): Promise<ApiResponse<Product>> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Produit non trouvé'
        }
      }

      const product: Product = {
        id: docSnap.id,
        ...docSnap.data()
      } as Product

      return {
        success: true,
        data: product
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Récupérer les produits disponibles d'une boutique (pour le bot WhatsApp)
   */
  async getAvailableProducts(boutiqueId: string): Promise<ApiResponse<Product[]>> {
    try {
      const productQuery = query(
        collection(db, this.collectionName),
        where('boutique_id', '==', boutiqueId),
        where('status', '==', 'available'),
        where('stock_quantity', '>', 0),
        orderBy('stock_quantity', 'desc')
      )

      const querySnapshot = await getDocs(productQuery)
      const products: Product[] = []

      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data()
        } as Product)
      })

      return {
        success: true,
        data: products
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Rechercher des produits par nom ou catégorie (pour le bot)
   */
  async searchProducts(boutiqueId: string, searchTerm: string): Promise<ApiResponse<Product[]>> {
    try {
      // D'abord récupérer tous les produits disponibles
      const availableResult = await this.getAvailableProducts(boutiqueId)
      if (!availableResult.success) {
        return availableResult
      }

      const allProducts = availableResult.data!
      const searchTermLower = searchTerm.toLowerCase()

      // Filtrer par terme de recherche
      const matchingProducts = allProducts.filter(product => 
        product.nom.toLowerCase().includes(searchTermLower) ||
        product.category.toLowerCase().includes(searchTermLower) ||
        (product.description && product.description.toLowerCase().includes(searchTermLower))
      )

      return {
        success: true,
        data: matchingProducts
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la recherche: ${error.message}`
      }
    }
  }

  /**
   * Récupérer les produits en rupture de stock
   */
  async getOutOfStockProducts(boutiqueId: string): Promise<ApiResponse<Product[]>> {
    try {
      const productQuery = query(
        collection(db, this.collectionName),
        where('boutique_id', '==', boutiqueId),
        where('stock_quantity', '==', 0),
        orderBy('created_at', 'desc')
      )

      const querySnapshot = await getDocs(productQuery)
      const products: Product[] = []

      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data()
        } as Product)
      })

      return {
        success: true,
        data: products
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  // ==================== MISE À JOUR ====================

  /**
   * Mettre à jour un produit
   */
  async updateProduct(id: string, data: UpdateProductData): Promise<ApiResponse<Product>> {
    try {
      // Vérifier que le produit existe
      const existingProduct = await this.getProductById(id)
      if (!existingProduct.success) {
        return existingProduct
      }

      // Validation des prix si fournis
      if (data.prix_min && data.prix_affichage && data.prix_min > data.prix_affichage) {
        return {
          success: false,
          error: 'Le prix minimum ne peut pas être supérieur au prix d\'affichage'
        }
      }

      const updateData = {
        ...data,
        updated_at: serverTimestamp()
      }

      // Gérer le changement de statut automatique selon le stock
      if (data.stock_quantity !== undefined) {
        if (data.stock_quantity === 0) {
          updateData.status = 'out_of_stock'
        } else if (data.stock_quantity > 0 && existingProduct.data!.status === 'out_of_stock') {
          updateData.status = 'available'
        }
      }

      const docRef = doc(db, this.collectionName, id)
      await updateDoc(docRef, updateData)

      // Récupérer le produit mis à jour
      const updatedProduct = await this.getProductById(id)
      
      return {
        success: true,
        data: updatedProduct.data,
        message: 'Produit mis à jour avec succès'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour: ${error.message}`
      }
    }
  }

  /**
   * Mettre à jour le stock d'un produit (pour les commandes)
   */
  async updateStock(id: string, quantityChange: number): Promise<ApiResponse<void>> {
    try {
      const productResult = await this.getProductById(id)
      if (!productResult.success) {
        return { success: false, error: 'Produit non trouvé' }
      }

      const product = productResult.data!
      const newQuantity = product.stock_quantity + quantityChange

      if (newQuantity < 0) {
        return {
          success: false,
          error: 'Stock insuffisant'
        }
      }

      const docRef = doc(db, this.collectionName, id)
      const updateData: any = {
        stock_quantity: newQuantity,
        updated_at: serverTimestamp()
      }

      // Changer le statut si nécessaire
      if (newQuantity === 0) {
        updateData.status = 'out_of_stock'
      } else if (newQuantity > 0 && product.status === 'out_of_stock') {
        updateData.status = 'available'
      }

      await updateDoc(docRef, updateData)

      return {
        success: true,
        message: 'Stock mis à jour avec succès'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour du stock: ${error.message}`
      }
    }
  }

  /**
   * Mettre à jour les stats d'un produit (ventes, demandes)
   */
  async updateProductStats(
    id: string, 
    stats: {
      total_ventes?: number
      total_demandes?: number
    }
  ): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.collectionName, id)
      
      const updateData: any = {
        updated_at: serverTimestamp()
      }

      if (stats.total_ventes !== undefined) {
        updateData.total_ventes = increment(stats.total_ventes)
      }

      if (stats.total_demandes !== undefined) {
        updateData.total_demandes = increment(stats.total_demandes)
      }

      await updateDoc(docRef, updateData)

      return {
        success: true
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour des stats: ${error.message}`
      }
    }
  }

  // ==================== SUPPRESSION ====================

  /**
   * Supprimer un produit
   */
  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    try {
      // Vérifier que le produit existe
      const existingProduct = await this.getProductById(id)
      if (!existingProduct.success) {
        return {
          success: false,
          error: 'Produit non trouvé'
        }
      }

      const product = existingProduct.data!

      // TODO: Vérifier qu'il n'y a pas de commandes en cours avec ce produit

      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)

      // Mettre à jour le compteur de produits de la boutique
      await this.updateBoutiqueProductCount(product.boutique_id, -1)

      return {
        success: true,
        message: 'Produit supprimé avec succès'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la suppression: ${error.message}`
      }
    }
  }

  /**
   * Supprimer tous les produits d'une boutique (lors de suppression boutique)
   */
  async deleteProductsByBoutique(boutiqueId: string): Promise<ApiResponse<void>> {
    try {
      const productsResult = await this.getProductsByBoutique(boutiqueId)
      if (!productsResult.success) {
        return productsResult as any
      }

      const products = productsResult.data!
      
      // Utiliser un batch pour supprimer plusieurs documents
      const batch = writeBatch(db)
      
      products.forEach(product => {
        const docRef = doc(db, this.collectionName, product.id)
        batch.delete(docRef)
      })

      await batch.commit()

      return {
        success: true,
        message: `${products.length} produits supprimés`
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la suppression: ${error.message}`
      }
    }
  }

  // ==================== STATISTIQUES ====================

  /**
   * Récupérer les stats produits d'une boutique
   */
  async getBoutiqueProductStats(boutiqueId: string): Promise<ApiResponse<{
    total_produits: number
    produits_disponibles: number
    produits_rupture: number
    valeur_stock_total: number
    produit_plus_vendu?: Product
    produit_plus_demande?: Product
  }>> {
    try {
      const productsResult = await this.getProductsByBoutique(boutiqueId)
      if (!productsResult.success) {
        return productsResult as any
      }

      const products = productsResult.data!
      
      const total_produits = products.length
      const produits_disponibles = products.filter(p => p.status === 'available' && p.stock_quantity > 0).length
      const produits_rupture = products.filter(p => p.stock_quantity === 0).length
      
      // Calcul valeur stock
      const valeur_stock_total = products.reduce((total, product) => {
        return total + (product.prix_affichage * product.stock_quantity)
      }, 0)

      // Produit le plus vendu
      const produit_plus_vendu = products.reduce((max, product) => {
        return (product.total_ventes || 0) > (max?.total_ventes || 0) ? product : max
      }, products[0])

      // Produit le plus demandé
      const produit_plus_demande = products.reduce((max, product) => {
        return (product.total_demandes || 0) > (max?.total_demandes || 0) ? product : max
      }, products[0])

      return {
        success: true,
        data: {
          total_produits,
          produits_disponibles,
          produits_rupture,
          valeur_stock_total,
          produit_plus_vendu: produit_plus_vendu?.total_ventes ? produit_plus_vendu : undefined,
          produit_plus_demande: produit_plus_demande?.total_demandes ? produit_plus_demande : undefined
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors du calcul des stats: ${error.message}`
      }
    }
  }

  /**
   * Récupérer les top produits toutes boutiques confondues (Admin)
   */
  async getTopProducts(limitCount: number = 10): Promise<ApiResponse<Product[]>> {
    try {
      const productQuery = query(
        collection(db, this.collectionName),
        where('status', '==', 'available'),
        orderBy('total_ventes', 'desc'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(productQuery)
      const topProducts: Product[] = []

      querySnapshot.forEach((doc) => {
        topProducts.push({
          id: doc.id,
          ...doc.data()
        } as Product)
      })

      return {
        success: true,
        data: topProducts
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération du top: ${error.message}`
      }
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Mettre à jour le compteur de produits dans la boutique
   */
  private async updateBoutiqueProductCount(boutiqueId: string, change: number): Promise<void> {
    try {
      const currentStats = await this.getBoutiqueProductStats(boutiqueId)
      if (currentStats.success) {
        await boutiqueService.updateBoutiqueStats(boutiqueId, {
          total_produits: currentStats.data!.total_produits
        })
      }
    } catch (error) {
      // Log l'erreur mais ne fait pas échouer l'opération principale
      console.error('Erreur mise à jour compteur boutique:', error)
    }
  }

  /**
   * Récupérer les catégories avec le nombre de produits
   */
  async getCategoriesStats(boutiqueId: string): Promise<ApiResponse<{[key in ProductCategory]?: number}>> {
    try {
      const productsResult = await this.getProductsByBoutique(boutiqueId)
      if (!productsResult.success) {
        return productsResult as any
      }

      const products = productsResult.data!
      const categoryStats: {[key in ProductCategory]?: number} = {}

      products.forEach(product => {
        categoryStats[product.category] = (categoryStats[product.category] || 0) + 1
      })

      return {
        success: true,
        data: categoryStats
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors du calcul des catégories: ${error.message}`
      }
    }
  }
}

// Instance unique du service
export const productService = new ProductService()
export default productService