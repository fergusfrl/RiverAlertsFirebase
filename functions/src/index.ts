import * as admin from 'firebase-admin';

admin.initializeApp();

export { createUserProfile } from './userProfile';
export { test_evaluateAlerts, addIdToAlert } from './alerts';
