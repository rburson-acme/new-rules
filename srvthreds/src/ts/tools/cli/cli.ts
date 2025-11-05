#!/usr/bin/env node

import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Logger, LoggerLevel } from '../../thredlib/index.js';
import { CliOps } from './CliOps.js';

Logger.setLevel(LoggerLevel.DEBUG);

async function generateRefreshToken(participantId: string, expireMins: number) {
  const result = await CliOps.generateRefreshToken(participantId, expireMins);
  Logger.info('Refresh token:\n' + JSON.stringify(result, null, 2));
}

async function generateAccessToken(participantId: string, expireMins: number) {
  const result = await CliOps.generateAccessToken(participantId, expireMins);
  Logger.info('Access token:\n' + JSON.stringify(result, null, 2));
}

async function main(): Promise<void> {
  const argv = yargs(hideBin(process.argv))
    .command(
      'generate-refresh-token <participantId> <expireMins>',
      'Generate a refresh token',
      (yargs) => {
        return yargs
          .positional('participantId', {
            describe: 'The participant ID to include in the token payload',
            type: 'string',
            demandOption: true,
          })
          .positional('expireMins', {
            describe: 'Expiration time in minutes',
            type: 'number',
            demandOption: true,
          });
      },
      async (argv) => {
        await generateRefreshToken(argv.participantId, argv.expireMins);
      },
    )
    .command(
      'generate-access-token <participantId> <expireMins>',
      'Generate an access token',
      (yargs) => {
        return yargs
          .positional('participantId', {
            describe: 'The participant ID to include in the token payload',
            type: 'string',
            demandOption: true,
          })
          .positional('expireMins', {
            describe: 'Expiration time in minutes',
            type: 'number',
            demandOption: true,
          });
      },
      async (argv) => {
        await generateAccessToken(argv.participantId, argv.expireMins);
      },
    )
    .wrap(null)
    .demandCommand(1, 'You must specify at least one command')
    .help()
    .alias('help', 'h').argv;
}

main();
