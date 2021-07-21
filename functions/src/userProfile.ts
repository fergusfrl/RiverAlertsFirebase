import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const firestore = admin.firestore();

/**
 * On User Create.
 */
 export const createUserProfile = functions.auth.user().onCreate(async user => {
  await firestore.collection('users').doc(user.uid).set({
    email: user.email,
    phoneNumber: '',
    name: {
      first: '',
      last: '',
    },
    alertCount: 0,
  })
});