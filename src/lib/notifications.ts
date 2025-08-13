// // lib/notifications.ts
// import { getMessaging, getToken, onMessage } from 'firebase/messaging';
// import { app, db } from './firebase';
// import { authService } from './services';
// import { arrayUnion, doc, updateDoc } from 'firebase/firestore';

// class NotificationService {
//     private messaging: any = null;
//     private currentToken: string | null = null;

//     async initialize() {
//         if (typeof window === 'undefined') return;
        
//         try {
//             this.messaging = getMessaging(app);
//             await this.requestPermission();
//             this.setupMessageListener();
//         } catch (error) {
//             console.error('❌ Erreur initialisation notifications:', error);
//         }
//     }

//     async requestPermission() {
//         try {
//             const permission = await Notification.requestPermission();
            
//             if (permission === 'granted') {
//                 console.log('✅ Permission notifications accordée');
//                 await this.getToken();
//             } else {
//                 console.log('❌ Permission notifications refusée');
//             }
//         } catch (error) {
//             console.error('❌ Erreur permission notifications:', error);
//         }
//     }

//     async getToken() {
//         try {
//             const token = await getToken(this.messaging, {
//                 vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
//             });
            
//             if (token) {
//                 this.currentToken = token;
//                 console.log('📱 Token FCM obtenu:', token.substring(0, 20) + '...');
                
//                 // Sauvegarder le token pour la boutique
//                 await this.saveTokenToDatabase(token);
//             }
//         } catch (error) {
//             console.error('❌ Erreur obtention token FCM:', error);
//         }
//     }

//     private async saveTokenToDatabase(token: string) {
//         try {
//             const session = authService.getCurrentSession();
//             if (!session || session.type !== 'boutique') return;

//             const boutiqueId = session.boutique.id;
//             const boutiqueRef = doc(db, 'boutiques', boutiqueId);
            
//             // Ajouter le token aux tokens existants
//             await updateDoc(boutiqueRef, {
//                 fcm_tokens: arrayUnion(token),
//                 last_token_update: new Date()
//             });
            
//             console.log('✅ Token FCM sauvegardé');
//         } catch (error) {
//             console.error('❌ Erreur sauvegarde token:', error);
//         }
//     }

//     setupMessageListener() {
//         if (!this.messaging) return;

//         onMessage(this.messaging, (payload) => {
//             console.log('📨 Message reçu en foreground:', payload);
            
//             const { title, body } = payload.notification || {};
//             const { type, boutiqueId } = payload.data || {};
            
//             // Afficher notification toast
//             this.showToast({
//                 title: title || 'Notification',
//                 message: body || 'Nouveau message',
//                 type: type?.includes('connected') ? 'success' : 'warning',
//                 duration: 10000
//             });
            
//             // Mettre à jour l'UI si c'est une notification bot
//             if (type?.includes('bot_')) {
//                 this.updateBotStatus(boutiqueId, type.includes('connected'));
//             }
//         });
//     }

//     showToast({ title, message, type = 'info', duration = 5000 }: {
//         title: string;
//         message: string;
//         type?: 'success' | 'error' | 'warning' | 'info';
//         duration?: number;
//     }) {
//         // Utiliser une bibliothèque de toast ou créer un système custom
//         if (typeof window !== 'undefined') {
//             // Exemple avec notification native du navigateur
//             if (Notification.permission === 'granted') {
//                 new Notification(title, {
//                     body: message,
//                     icon: '/icons/bot-notification.png',
//                     badge: '/icons/bot-badge.png',
//                     tag: 'bot-notification'
//                 });
//             }
            
//             // Émettre un événement custom pour l'UI
//             window.dispatchEvent(new CustomEvent('show-toast', {
//                 detail: { title, message, type, duration }
//             }));
//         }
//     }

//     private updateBotStatus(boutiqueId: string, isConnected: boolean) {
//         // Émettre événement pour mettre à jour l'UI
//         window.dispatchEvent(new CustomEvent('bot-status-changed', {
//             detail: { boutiqueId, isConnected }
//         }));
//     }

//     // Tester les notifications
//     async testNotification(type: 'connected' | 'disconnected' = 'connected') {
//         try {
//             const session = authService.getCurrentSession();
//             if (!session || session.type !== 'boutique') return;

//             const testFunction = httpsCallable(functions, 'testNotification');
//             await testFunction({
//                 boutiqueId: session.boutique.id,
//                 type
//             });
            
//             this.showToast({
//                 title: '🧪 Test envoyé',
//                 message: 'Notification de test envoyée avec succès !',
//                 type: 'info'
//             });
//         } catch (error) {
//             console.error('❌ Erreur test notification:', error);
//         }
//     }
// }

// export const notificationService = new NotificationService();