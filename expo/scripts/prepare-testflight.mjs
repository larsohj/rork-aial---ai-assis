import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Only public application identifiers belong in these files. Apple credentials
// remain in EAS; EXPO_TOKEN remains in GitHub Actions secrets.
export function prepareConfiguration(app, eas, env = {}) {
  const nextApp = structuredClone(app);
  const nextEas = structuredClone(eas);
  const existingProject = app.expo?.extra?.eas?.projectId;
  const existingAppleApp = eas.submit?.production?.ios?.ascAppId;
  const existingOwner = app.expo?.owner;
  const projectId = env.EXPO_PROJECT_ID || existingProject;
  const ascAppId = env.ASC_APP_ID || existingAppleApp;
  const owner = env.EXPO_OWNER || existingOwner;
  const problems = [];

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId || '')) {
    problems.push('EXPO_PROJECT_ID is missing or invalid. Run eas init and use the real EAS project UUID.');
  }
  if (!/^\d+$/.test(String(ascAppId || ''))) {
    problems.push('ASC_APP_ID is missing or invalid. Use the numeric Apple ID from App Store Connect, not the bundle identifier.');
  }
  for (const [label, supplied, existing] of [
    ['EXPO_PROJECT_ID', env.EXPO_PROJECT_ID, existingProject],
    ['ASC_APP_ID', env.ASC_APP_ID, existingAppleApp],
    ['EXPO_OWNER', env.EXPO_OWNER, existingOwner],
  ]) {
    if (supplied && existing && supplied !== String(existing)) {
      problems.push(`${label} conflicts with the checked-in app identity. Reconcile the project before uploading.`);
    }
  }
  if (!app.expo?.ios?.bundleIdentifier) {
    problems.push('app.json must contain ios.bundleIdentifier.');
  }
  if (eas.build?.production?.distribution !== 'store') {
    problems.push('The production build must use store distribution.');
  }
  if (problems.length) throw new Error(problems.join('\n'));

  nextApp.expo.extra = {
    ...nextApp.expo.extra,
    eas: { ...nextApp.expo.extra?.eas, projectId },
  };
  if (owner) nextApp.expo.owner = owner;
  nextEas.submit ??= {};
  nextEas.submit.production ??= {};
  nextEas.submit.production.ios = {
    ...nextEas.submit.production.ios,
    ascAppId: String(ascAppId),
  };
  return { app: nextApp, eas: nextEas };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = process.argv.slice(2);
    if (options.some(value => value !== '--check')) throw new Error('Usage: node scripts/prepare-testflight.mjs [--check]');
    const appPath = resolve(projectDirectory, 'app.json');
    const easPath = resolve(projectDirectory, 'eas.json');
    const configuration = prepareConfiguration(
      JSON.parse(readFileSync(appPath, 'utf8')),
      JSON.parse(readFileSync(easPath, 'utf8')),
      process.env,
    );
    if (!options.includes('--check')) {
      writeFileSync(appPath, `${JSON.stringify(configuration.app, null, 2)}\n`);
      writeFileSync(easPath, `${JSON.stringify(configuration.eas, null, 2)}\n`);
    }
    console.log(`TestFlight configuration validated for ${configuration.app.expo.ios.bundleIdentifier}.`);
    console.log(options.includes('--check') ? 'No files changed.' : 'Public project identifiers saved. Signing credentials must already be configured in EAS.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
