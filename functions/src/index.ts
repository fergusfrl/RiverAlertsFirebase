import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import axios from 'axios';

const config = functions.config();

admin.initializeApp();
sgMail.setApiKey(config.sendgrid.api);

const firestore = admin.firestore();

// get all gauges with current values.
const getGauges = () => axios.post('https://data.riverguide.co.nz/', {
    action: 'get_features',
    crossDomain: true,
    filters: ['flow', 'stage_height'],
  });

// get all alerts for all users.
const getAlerts = () => firestore.collectionGroup('alerts').get();

// set active status for an alert.
const setAlertActiveStatus = async (alertDocId: string, active: boolean) => {
  return firestore
    .collectionGroup('alerts')
    .where('id', '==', alertDocId)
    .get()
    .then(snapshot => {
      snapshot.forEach(async doc => {
        await doc.ref.update({ active });
      });
    });
};

// TODO: replace with cool typescript mapping thing
const operationToHumanReadable = (operation: string): string => {
  if (operation === 'greater-than') return "greater than";
  if (operation === 'less-than') return "less than";
  if (operation === 'equals') return 'equal to';
  return 'equal to';
}

// TODO: replace with cool typescript mapping thing
const typeToHumanReadable = (type: string): string => {
  if (type === 'flow') return 'flow';
  if (type === 'stage_height') return 'height';
  return 'flow';
}

// TODO: replace with pubsub to avoid blocking
const sendEmailAlert = async (to: string, alert: any, threshold: any, currentVals: any) => {
  const { name, description } = alert;
  const { name: gaugeName } = alert.gauge;
  const { units, value: thresholdValue, operation } = threshold;
  const { latest_value: currentValue, type } = currentVals;

  return sgMail.send({
    to,
    from: config.sendgrid.from,
    templateId: config.sendgrid.template_id,
    dynamicTemplateData: {
      name,
      description,
      type: typeToHumanReadable(type),
      gaugeName,
      currentValue,
      units,
      operationString: operationToHumanReadable(operation),
      thresholdValue,
    }
  });
}

const evauluateAlert = async (observation: any, alert: any) => {
  const { id, threshold, contactPreferences, active } = alert;
  const { operation, value, units } = threshold;
  const { email } = contactPreferences;

  if (observation.units !== units) return;

  if (!active) {
    if (
      (operation === 'equals' && value === observation.latest_value) ||
      (operation === 'greater-than' && value < observation.latest_value) ||
      (operation === 'less-than' && value > observation.latest_value)
    ) { 
      await setAlertActiveStatus(id, true);
      sendEmailAlert(email, alert, threshold, observation)
        .then(() => {
          console.log(`alert sent to ${email}`);
        }).catch(() => {
          console.log('Something went wrong sending email')
        });
    }
  } else {
    if (
      (operation === 'equals' && value !== observation.latest_value) ||
      (operation === 'greater-than' && value > observation.latest_value) ||
      (operation === 'less-than' && value < observation.latest_value)
    ) {
      await setAlertActiveStatus(id, false);
    }
  }
}

/**
 * Every 15 Minutes.
 */
// export const evauluateAlerts = functions.pubsub.schedule('*/15 * * * *').onRun(async () => {

// TODO: revert to scheduled run
export const test_evaluateAlerts = functions.https.onRequest(async (req, res) => {
  // Multiple requests in parallel
  const [gaugeRes, alerts] = await Promise.all([ getGauges(), getAlerts() ]);
  const gauges = gaugeRes.data.features;

  alerts.docs.forEach(alertRef => {
    const alertDocId = alertRef.id;
    const alert: any = { ...alertRef.data(), id: alertDocId };
    const targetGauge = gauges.find((gauge: any) => gauge.id === alert.gauge.id);

    targetGauge.observables.forEach((observation: any) => evauluateAlert(observation, alert));
  });

  res.sendStatus(200);
});

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
