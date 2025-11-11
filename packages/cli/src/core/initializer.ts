/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IdeClient,
  IdeConnectionEvent,
  IdeConnectionType,
  logIdeConnection,
  type Config,
} from '@google/gemini-cli-core';
import { type LoadedSettings } from '../config/settings.js';
import { performInitialAuth } from './auth.js';
import { validateTheme } from './theme.js';
import { checkRequiredConfigFiles } from '../utils/configFileChecker.js';

export interface InitializationResult {
  authError: string | null;
  themeError: string | null;
  configFilesMissingError: string | null;
  shouldOpenAuthDialog: boolean;
  geminiMdFileCount: number;
}

/**
 * Orchestrates the application's startup initialization.
 * This runs BEFORE the React UI is rendered.
 * @param config The application config.
 * @param settings The loaded application settings.
 * @returns The results of the initialization.
 */
export async function initializeApp(
  config: Config,
  settings: LoadedSettings,
): Promise<InitializationResult> {
  // Check if required configuration files exist
  const configFilesCheck = checkRequiredConfigFiles();
  const configFilesMissingError = configFilesCheck.errorMessage;

  // If config files are missing, skip auth and return early
  if (!configFilesCheck.allExist) {
    return {
      authError: null,
      themeError: null,
      configFilesMissingError,
      shouldOpenAuthDialog: false,
      geminiMdFileCount: config.getGeminiMdFileCount(),
    };
  }

  // Proceed with normal initialization
  const authError = await performInitialAuth(
    config,
    settings.merged.security?.auth?.selectedType,
  );
  const themeError = validateTheme(settings);

  // Only open auth dialog if config files exist and auth is needed
  const shouldOpenAuthDialog =
    !configFilesMissingError &&
    (settings.merged.security?.auth?.selectedType === undefined || !!authError);

  if (config.getIdeMode()) {
    const ideClient = await IdeClient.getInstance();
    await ideClient.connect();
    logIdeConnection(config, new IdeConnectionEvent(IdeConnectionType.START));
  }

  return {
    authError,
    themeError,
    configFilesMissingError,
    shouldOpenAuthDialog,
    geminiMdFileCount: config.getGeminiMdFileCount(),
  };
}
