#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {exec} from 'child_process';
import inquirer from 'inquirer';

async function main() {
  const [inputUrl] = process.argv.slice(2);

  if (!inputUrl) {
    console.error('Please provide a Git SSH URL as an argument.');
    process.exit(1);
  }

  const {modifiedUrl, repoType} = await convertToWorkOrPersonal(
    convertHttpsToSsh(inputUrl)
  );

  // Clone the repo
  exec(`git clone ${modifiedUrl}`, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Error cloning the repository: ${error.message}`);
      process.exit(1);
    }

    console.log('Repository cloned successfully.');

    if (repoType === 'personal') {
      const repoName = modifiedUrl.split('/')[1].replace('.git', '');
      const repoPath = path.join(process.cwd(), repoName);

      if (!fs.existsSync(repoPath)) {
        console.error(`The repository folder does not exist at: ${repoPath}`);
        process.exit(1);
      }
      // My git global config is work, so add personal as local if needed
      exec(
        'git config user.email "euanmorgan48@gmail.com"',
        {cwd: repoPath},
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Error updating local git config: ${error.message}`);
            process.exit(1);
          }
          console.log('Successfully updated local git config.');
        }
      );
    }
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

function convertHttpsToSsh(url) {
  // For ease of use, we can convert a normal HTTPS github url to SSH if needed
  console.log('trying to convert to ssh');

  const httpsPattern = /^https:\/\/github.com\/(.+\/.+?)(\.git)?$/;

  const match = url.match(httpsPattern);

  console.log(match ? 'match' : 'no match');

  if (match) {
    console.log('Converting https to ssh');
    const repoPath = match[1];
    return `git@github.com:${repoPath}.git`;
  }

  return url;
}

async function convertToWorkOrPersonal(url) {
  // SSH Has been setup to look for gihub.com-work and github.com-personal
  // This adds that automatically if it can, or prompts if not

  let repoType;
  if (url.includes('ck-euan') || url.includes('MyPetPro') || url.includes('CountingKing')) {
    repoType = 'work';
  } else if (url.includes('EuanMorgan')) {
    repoType = 'personal';
  } else {
    const {type} = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: 'Is this a work or personal repository?',
      choices: ['work', 'personal'],
    });
    repoType = type;
  }

  const modifiedUrl = url.replace('@github.com', `@github.com-${repoType}`);
  console.log(`Modified Git URL: ${modifiedUrl}`);

  return {modifiedUrl, repoType};
}
