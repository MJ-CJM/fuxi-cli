/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from './semantic-colors.js';

interface ConfigFilesMissingPromptProps {
  errorMessage: string;
}

/**
 * Component to display a detailed error message when required configuration files are missing.
 * This prevents the app from proceeding to the OAuth2/Google login flow.
 */
export function ConfigFilesMissingPrompt({
  errorMessage,
}: ConfigFilesMissingPromptProps): React.JSX.Element {
  return (
    <Box
      borderStyle="round"
      borderColor={theme.status.error}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Box flexDirection="column">
        <Text color={theme.status.error}>
          {errorMessage}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>
          Press Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  );
}
