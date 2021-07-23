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

export const handleProfileChange = functions.firestore.document('users/{userId}').onUpdate((querySnap) => {
  const { beforeEmail } = querySnap.before.data();
  const afterRef = querySnap.after;
  const { afterEmail } = afterRef.data();

  if (beforeEmail !== afterEmail) {
    return afterRef.ref.collection('alerts').get().then(snap => {
      snap.docs.forEach(doc => {
        doc.ref.update({ email: afterEmail });
      });
    });
  }

  return Promise.resolve();
});