import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { Gauge } from './types';

// get all gauges with current values.
const getGauges = () => axios.post('https://data.riverguide.co.nz/', {
    action: 'get_features',
    crossDomain: true,
    filters: ['flow', 'stage_height'],
  });

/**
 * Every 15 Minutes, offset by 7 mins.
 */
 export const updateCurrentObservations = functions.pubsub.schedule('7-59/15 * * * *').onRun(async () => {
  const gaugesResponse = await getGauges();
  const gauges: Gauge[] = gaugesResponse.data.features;

  const writePromises = gauges.map(gauge => admin.firestore().collection('currentObservations').doc(gauge.id).set({ ...gauge }));
  return Promise.all(writePromises);
 });
