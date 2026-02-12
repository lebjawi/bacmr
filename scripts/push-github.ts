import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const OWNER = 'lebjawi';
const REPO = 'BacMR';
const BRANCH = 'main';

async function getOctokit(): Promise<Octokit> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Missing Replit environment variables');
  }

  const res = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  const data = await res.json();
  const connectionSettings = data.items?.[0];
  const token = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!token) {
    throw new Error('Could not get GitHub access token');
  }

  console.log('Got GitHub access token');
  return new Octokit({ auth: token });
}

function getTrackedFiles(): string[] {
  const output = execSync('git ls-files', { encoding: 'utf8' });
  return output.trim().split('\n').filter((f: string) => f.length > 0);
}

function isBinaryFile(filePath: string): boolean {
  const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.eot', '.svg', '.mp3', '.mp4', '.zip', '.tar', '.gz'];
  return binaryExts.some(ext => filePath.toLowerCase().endsWith(ext));
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const SKIP_DIRS = ['storage/', 'attached_assets/'];

async function main() {
  const octokit = await getOctokit();
  
  const allFiles = getTrackedFiles();
  const files = allFiles.filter((f: string) => {
    if (SKIP_DIRS.some(dir => f.startsWith(dir))) return false;
    try {
      const stat = fs.statSync(path.resolve(f));
      if (stat.size > MAX_FILE_SIZE) return false;
    } catch { return false; }
    return true;
  });
  console.log(`Found ${files.length} files to push (skipped ${allFiles.length - files.length} large/storage files)`);

  let defaultBranchSha: string;
  try {
    const { data: repo } = await octokit.repos.get({ owner: OWNER, repo: REPO });
    const defaultBranch = repo.default_branch;
    const { data: ref } = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: `heads/${defaultBranch}` });
    defaultBranchSha = ref.object.sha;
    console.log(`Default branch '${defaultBranch}' at ${defaultBranchSha}`);
  } catch (e: any) {
    if (e.status === 404) {
      console.log('Repository not found, creating it...');
      await octokit.repos.createForAuthenticatedUser({
        name: REPO,
        description: 'BACMR - AI Tutor for Mauritanian BAC Students',
        private: false,
        auto_init: false,
      });
      console.log(`Created repository ${OWNER}/${REPO}`);
      defaultBranchSha = '';
    } else {
      throw e;
    }
  }

  console.log('Creating blobs for all files...');
  const treeItems: Array<{path: string; mode: '100644'; type: 'blob'; sha: string}> = [];
  
  const BATCH_SIZE = 10;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (filePath: string) => {
      const fullPath = path.resolve(filePath);
      let content: string;
      let encoding: 'utf-8' | 'base64';
      
      if (isBinaryFile(filePath)) {
        content = fs.readFileSync(fullPath).toString('base64');
        encoding = 'base64';
      } else {
        content = fs.readFileSync(fullPath, 'utf8');
        encoding = 'utf-8';
      }
      
      const { data: blob } = await octokit.git.createBlob({
        owner: OWNER,
        repo: REPO,
        content,
        encoding,
      });
      
      return { path: filePath, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
    }));
    
    treeItems.push(...results);
    console.log(`  Uploaded ${Math.min(i + BATCH_SIZE, files.length)}/${files.length} files`);
  }

  console.log('Creating tree...');
  const { data: tree } = await octokit.git.createTree({
    owner: OWNER,
    repo: REPO,
    tree: treeItems,
  });

  console.log('Creating commit...');
  const commitParams: any = {
    owner: OWNER,
    repo: REPO,
    message: 'Push codebase from Replit',
    tree: tree.sha,
  };
  if (defaultBranchSha) {
    commitParams.parents = [defaultBranchSha];
  }
  
  const { data: commit } = await octokit.git.createCommit(commitParams);
  console.log(`Created commit ${commit.sha}`);

  try {
    await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: `heads/${BRANCH}` });
    await octokit.git.updateRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BRANCH}`,
      sha: commit.sha,
      force: true,
    });
    console.log(`Updated branch '${BRANCH}'`);
  } catch (e: any) {
    if (e.status === 404) {
      await octokit.git.createRef({
        owner: OWNER,
        repo: REPO,
        ref: `refs/heads/${BRANCH}`,
        sha: commit.sha,
      });
      console.log(`Created branch '${BRANCH}'`);
    } else {
      throw e;
    }
  }

  console.log(`Successfully pushed to github.com/${OWNER}/${REPO} on branch ${BRANCH}`);
}

main().catch(err => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
