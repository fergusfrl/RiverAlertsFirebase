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

/**
 * On Profile Document Update.
 */
export const handleProfileChange = functions.firestore.document('users/{userId}').onUpdate((querySnap) => {
  const { email: beforeEmail } = querySnap.before.data();
  const afterRef = querySnap.after;
  const { email: afterEmail } = afterRef.data();

  console.log('BEFORE:', beforeEmail);
  console.log('AFTER:', afterEmail);

  if (beforeEmail !== afterEmail) {
    return afterRef.ref.collection('alerts').get().then(snap => {
      snap.docs.forEach(doc => {
        console.log('DOC:', doc.data().name);
        return doc.ref.set({
          contactPreference: {
            email: afterEmail,
          },
        }, { merge: true });
      });
    });
  }

  return Promise.resolve();
});