import * as admin from 'firebase-admin';

admin.initializeApp();

export { createUserProfile } from './userProfile';
export { evaluateAlerts, addIdToAlert, removeAlert, handleSendEmail } from './alerts';
