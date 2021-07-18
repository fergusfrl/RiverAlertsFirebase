import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import axios from 'axios';
import { PubSub } from '@google-cloud/pubsub';
import { Alert, AlertData, Gauge, Observable, Operation, Type } from './types';
import { SEND_EMAIL } from './constants';

const firestore = admin.firestore();
const config = functions.config();
const pubSubClient: PubSub = new PubSub();

sgMail.setApiKey(config.sendgrid.api);

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

// Get human readableoperation.
const operationToHumanReadable = (operation: Operation): string => operationHandlers[operation];
const operationHandlers: Record<Operation, string> = {
  'greater-than': 'greater than',
  'less-than': 'less than',
  equals: 'equal to',
};

// get human readable type.
const typeToHumanReadable = (type: Type): string => typeHandlers[type];
const typeHandlers: Record<Type, string> = {
  flow: 'flow',
  stage_height: 'height',
};

export const handleSendEmail = functions.pubsub.topic(SEND_EMAIL).onPublish((payload) => {
  const { templateData, to } = payload.json;
  sgMail.send({
    to,
    from: config.sendgrid.from,
    templateId: config.sendgrid.template_id,
    dynamicTemplateData: templateData,
  }).then(() => {
    console.log(`alert sent to ${to}`);
  }).catch(() => {
    console.log('Something went wrong sending email')
  });
});

const evauluateAlert = async (observation: Observable, alert: Alert) => {
  const { id, threshold, contactPreferences, active } = alert;
  const { operation, value, units } = threshold;
  const { email, includeEmail } = contactPreferences;

  if (observation.units !== units) return;

  if (!active) {
    if (
      (operation === 'equals' && value === observation.latest_value) ||
      (operation === 'greater-than' && value < observation.latest_value) ||
      (operation === 'less-than' && value > observation.latest_value)
    ) { 
      await setAlertActiveStatus(id, true);

      if (includeEmail) {
        pubSubClient.topic(SEND_EMAIL).publishJSON({
          to: email,
          templateData: {
            name: alert.name,
            description: alert.description,
            type: typeToHumanReadable(observation.type),
            gaugeName: alert.gauge.name,
            currentValue: observation.latest_value,
            units: observation.units,
            operationString: operationToHumanReadable(operation),
            thresholdValue: value,
          },
        });         
      }
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
  const gauges: Gauge[] = gaugeRes.data.features;

  alerts.docs.forEach(alertRef => {
    const alertDocId = alertRef.id;
    const alertData: AlertData = alertRef.data() as AlertData;
    const alert: Alert = { ...alertData, id: alertDocId };
    const targetGauge: Gauge | undefined = gauges.find((gauge: Gauge) => gauge.id === alert.gauge.id);

    targetGauge?.observables.forEach((observation: Observable) => evauluateAlert(observation, alert));
  });

  res.sendStatus(200);
});

/**
 * Add document id to the alert document.
 * This is required to find an individual alert from a collection group during alert evaluation.
 */
export const addIdToAlert = functions.firestore.document('users/{userId}/alerts/{alertId}')
  .onCreate((snap, context) => {
    return snap.ref.update({
      id: context.params.alertId
    });
  });
