import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';

/**
 * A robust script to upload build artifacts to a Cloudflare R2 bucket.
 * Reads configuration from environment variables and file paths from command-line arguments.
 */

// --- Configuration from Environment Variables ---
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
} = process.env;

// --- Arguments from Command Line ---
const getArg = (name) => {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  if (!arg) throw new Error(`Missing required argument: --${name}`);
  return arg.split('=')[1];
};

let installerPath, platform, version, sha512, fileName;

try {
  installerPath = getArg('installerPath');
  platform = getArg('platform');
  version = getArg('version');
  sha512 = getArg('sha512');
  fileName = getArg('fileName');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// --- Validation ---
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT) {
  console.error('Error: Missing one or more required R2 environment variables.');
  process.exit(1);
}

if (!fs.existsSync(installerPath)) {
    console.error(`Error: Installer file not found at ${installerPath}`);
    process.exit(1);
}

// --- S3 Client Setup ---
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ENDPOINT}`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// --- Helper function for uploading ---
async function uploadFile(filePath, key, contentType) {
  console.log(`\nAttempting to upload ${path.basename(filePath)} to R2 object: ${key}`);
  const fileStream = fs.createReadStream(filePath);

  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: R2_BUCKET,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
      },
    });

    upload.on('httpUploadProgress', (progress) => {
      const percent = progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0;
      process.stdout.write(`Uploading ${path.basename(filePath)}: ${percent}%\r`);
    });

    await upload.done();
    console.log(`\nSuccessfully uploaded ${key} to bucket "${R2_BUCKET}"`);
    return true;
  } catch (error) {
    console.error(`\nError uploading ${key}:`, error);
    return false;
  }
}

// --- Main Execution Logic ---
async function main() {
  // 1. Create metadata content
  const metadata = {
    version,
    url: `https://${R2_ENDPOINT}/${R2_BUCKET}/releases/${platform}/${fileName}`,
    releaseDate: new Date().toISOString(),
    sha512,
    platform,
    fileName,
  };

  // 2. Write metadata to a temporary file
  const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'temp-upload-'));
  const metadataFileName = `latest-${platform}.json`;
  const metadataFilePath = path.join(tempDir, metadataFileName);
  fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));
  console.log(`Created temporary metadata file at: ${metadataFilePath}`);

  // 3. Upload installer file
  const installerKey = `releases/${platform}/${fileName}`;
  const installerUploaded = await uploadFile(installerPath, installerKey, 'application/octet-stream');

  // 4. Upload metadata file
  const metadataKey = `updates/${metadataFileName}`;
  const metadataUploaded = await uploadFile(metadataFilePath, metadataKey, 'application/json');

  // 5. Cleanup temporary files
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('\nCleaned up temporary directory.');

  // 6. Final status check
  if (installerUploaded && metadataUploaded) {
    console.log('\n✅ All files uploaded successfully!');
  } else {
    console.error('\n❌ One or more file uploads failed.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\nAn unexpected error occurred:', error);
  process.exit(1);
});

