import * as admin from 'firebase-admin';

admin.initializeApp();

export { createUserProfile } from './userProfile';
export { evaluateAlerts, addIdToAlert, handleSendEmail } from './alerts';
