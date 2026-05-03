const { execFileSync } = require('child_process');
const { existsSync, mkdirSync, readdirSync, statSync } = require('fs');
const { dirname, join, resolve } = require('path');

function findApkSigner(sdkRoot) {
  const buildToolsDir = join(sdkRoot, 'build-tools');
  if (!existsSync(buildToolsDir)) {
    throw new Error(`Android SDK build-tools directory not found at ${buildToolsDir}`);
  }

  const versions = readdirSync(buildToolsDir)
    .filter((name) => statSync(join(buildToolsDir, name)).isDirectory())
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .reverse();

  for (const version of versions) {
    const candidate = join(buildToolsDir, version, process.platform === 'win32' ? 'apksigner.bat' : 'apksigner');
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Could not find apksigner in ${buildToolsDir}`);
}

function run(command, args) {
  const execCommand = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  execFileSync(execCommand, args, { stdio: 'inherit' });
}

function runShell(command) {
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/c', command], { stdio: 'inherit' });
  } else {
    execFileSync('sh', ['-c', command], { stdio: 'inherit' });
  }
}

function runCommand(command, args) {
  if (process.platform === 'win32' && command.endsWith('.bat')) {
    execFileSync('cmd.exe', ['/c', command, ...args], { stdio: 'inherit' });
  } else {
    execFileSync(command, args, { stdio: 'inherit' });
  }
}

const sdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || 'C:\\Users\\jeffr\\AppData\\Local\\Android\\Sdk';
const keystorePath = resolve(process.env.KEYSTORE_PATH || join(__dirname, '..', 'android', 'app', 'release.keystore'));
const keyAlias = process.env.KEY_ALIAS;
const keystorePass = process.env.KEYSTORE_PASSWORD;
const keyPass = process.env.KEY_PASSWORD || keystorePass;
const distinguishedName = process.env.KEYSTORE_DNAME || 'CN=DJCPos, OU=IT, O=DJCPos, L=Manila, S=Metro Manila, C=PH';

if (!keyAlias || !keystorePass) {
  console.error('Missing required signing environment variables.');
  console.error('Set KEY_ALIAS and KEYSTORE_PASSWORD before running this script.');
  process.exit(1);
}

const androidReleaseDir = join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release');
const unsignedApk = join(androidReleaseDir, 'app-release-unsigned.apk');
const signedApk = join(androidReleaseDir, 'app-release-signed.apk');

if (!existsSync(dirname(keystorePath))) {
  mkdirSync(dirname(keystorePath), { recursive: true });
}

if (!existsSync(keystorePath)) {
  console.log(`Keystore not found at ${keystorePath}. Generating new keystore...`);
  run('keytool', [
    '-genkeypair',
    '-v',
    '-keystore', keystorePath,
    '-storepass', keystorePass,
    '-keypass', keyPass,
    '-alias', keyAlias,
    '-keyalg', 'RSA',
    '-keysize', '2048',
    '-validity', '10000',
    '-dname', distinguishedName,
  ]);
  console.log(`Generated new keystore at: ${keystorePath}`);
}

// Build the release APK using the existing npm build script through the shell.
console.log('Building release APK...');
runShell('npm run cap:build:android');
runShell('cd android && gradlew assembleRelease');

if (!existsSync(unsignedApk)) {
  console.error(`Unsigned APK not found at ${unsignedApk}`);
  process.exit(1);
}

const apksigner = findApkSigner(sdkRoot);

runCommand(apksigner, [
  'sign',
  '--ks', keystorePath,
  '--ks-pass', `pass:${keystorePass}`,
  '--key-pass', `pass:${keyPass}`,
  '--out', signedApk,
  unsignedApk,
]);

console.log(`Signed APK generated at: ${signedApk}`);
