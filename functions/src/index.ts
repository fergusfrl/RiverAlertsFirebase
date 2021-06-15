import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
// import axios from 'axios';

admin.initializeApp();

const firestore = admin.firestore();

// export const getAlerts = functions.pubsub.schedule('*/15 * * * *').onRun(async () => {
//   const [gaugeRes, alerts] = await Promise.all([
//     axios.post('https://data.riverguide.co.nz/', {
//       action: 'get_features',
//       crossDomain: true,
//       filters: ['flow', 'stage_height'],
//     }),
//     firestore.collectionGroup('alerts').get()
//   ]);

//   const gauges = gaugeRes.data.features;
//   alerts.docs.forEach(alertRef => {
//     const alert = alertRef.data();
//     const { observables } = gauges.find((gauge: any) => gauge.id === alert.gauge.id);

//     const { operation, value, units } = alert.threshold;

//     for (let i = 0; i < observables.length; i++) {
//       const observation = observables[i];
//       if (observation.units !== units) continue;

//       if (operation === 'equals' && value === observation.latest_value) {
//         console.log('EMAIL');
//       }

//       if (operation === 'greater-than' && value > observation.latest_value) {
//         console.log('EMAIL');
//       }

//       if (operation === 'less-than' && value < observation.latest_value) {
//         console.log('EMAIL');
//       }
//     }
//   });
// });

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
  })
});
