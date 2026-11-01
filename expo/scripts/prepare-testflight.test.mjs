import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareConfiguration } from './prepare-testflight.mjs';

const projectId = '11111111-1111-4111-8111-111111111111';
const app = { expo: { ios: { bundleIdentifier: 'app.example.alesund' }, extra: { retained: true } } };
const eas = { build: { production: { distribution: 'store' } }, submit: { production: { ios: { language: 'nb-NO' } } } };

test('missing identifiers fail before a remote build is queued', () => {
  assert.throws(() => prepareConfiguration(app, eas), /EXPO_PROJECT_ID[\s\S]*ASC_APP_ID/);
  assert.throws(() => prepareConfiguration(app, eas, { EXPO_PROJECT_ID: projectId, ASC_APP_ID: 'app.example.alesund' }), /numeric Apple ID/);
});

test('configuration preserves identity and settings without persisting credentials', () => {
  const prepared = prepareConfiguration(app, eas, {
    EXPO_PROJECT_ID: projectId, ASC_APP_ID: '1234567890', EXPO_OWNER: 'example-owner', EXPO_TOKEN: 'must-not-be-written',
  });
  assert.equal(prepared.app.expo.extra.eas.projectId, projectId);
  assert.equal(prepared.app.expo.extra.retained, true);
  assert.equal(prepared.app.expo.ios.bundleIdentifier, app.expo.ios.bundleIdentifier);
  assert.equal(prepared.eas.submit.production.ios.language, 'nb-NO');
  assert.equal(prepared.eas.submit.production.ios.ascAppId, '1234567890');
  assert.ok(!JSON.stringify(prepared).includes('must-not-be-written'));
  assert.equal(app.expo.extra.eas, undefined);
});

test('conflicting CI variables cannot silently send a build to another project', () => {
  const prepared = prepareConfiguration(app, eas, { EXPO_PROJECT_ID: projectId, ASC_APP_ID: '1234567890', EXPO_OWNER: 'example-owner' });
  for (const env of [
    { EXPO_PROJECT_ID: '22222222-2222-4222-8222-222222222222' },
    { ASC_APP_ID: '9999999999' },
    { EXPO_OWNER: 'different-owner' },
  ]) assert.throws(() => prepareConfiguration(prepared.app, prepared.eas, env), /conflicts/);
  assert.deepEqual(prepareConfiguration(prepared.app, prepared.eas), prepared);
});
