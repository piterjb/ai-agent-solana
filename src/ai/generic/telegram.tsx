import { ExternalLink } from 'lucide-react';
import { z } from 'zod';

import { Card } from '@/components/ui/card';
import {
  BOT_NOT_STARTED_ERROR,
  MISSING_USERNAME_ERROR,
  checkTelegramUsername,
  sendTelegramNotification,
  verifyTelegramSetupAction,
} from '@/server/actions/telegram';

interface TelegramResult {
  success: boolean;
  data?: string;
  error?: string;
  botId?: string;
  noFollowUp?: boolean;
}

function renderTelegramResponse({
  success,
  error,
  botId,
  successTitle,
  successMessage,
}: {
  success: boolean;
  error?: string;
  botId?: string;
  successTitle: string;
  successMessage: string;
}) {
  if (!success && error === MISSING_USERNAME_ERROR) {
    return (
      <Card className="bg-card p-6">
        <h2 className="mb-1 text-xl font-semibold text-card-foreground">
          Missing Telegram Username
        </h2>
        <p className="text-sm text-muted-foreground">
          Please provide a Telegram username.
        </p>
      </Card>
    );
  }

  if (!success && error === BOT_NOT_STARTED_ERROR) {
    return (
      <Card className="bg-card p-6">
        <h2 className="mb-1 text-xl font-semibold text-card-foreground">
          Bot Not Started
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>You need to start the bot before using Telegram notifications.</p>
          <p className="flex items-center gap-1">
            <span>Click here to start:</span>
            <a
              href={`https://t.me/${botId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md font-medium underline hover:text-primary"
            >
              @{botId}
              <ExternalLink className="ml-1 inline-block h-3 w-3" />
            </a>
          </p>
        </div>
      </Card>
    );
  }

  if (!success) {
    return (
      <Card className="bg-card p-6">
        <h2 className="mb-1 text-xl font-semibold text-destructive">Error</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="bg-card p-6">
      <h2 className="mb-1 text-xl font-semibold text-card-foreground">
        {successTitle}
      </h2>
      {successMessage && (
        <p className="text-sm text-muted-foreground">{successMessage}</p>
      )}
    </Card>
  );
}

export const telegramTools = {
  verifyTelegramSetup: {
    displayName: '🔍 Verify Telegram Setup',
    isCollapsible: true,
    isExpandedByDefault: true,
    description:
      'Verifies the users telegram setup before creating an action that sends a telegram notification. Not required if this is not for an action',
    parameters: z.object({
      username: z.string().optional(),
    }),
    execute: async ({ username }: { username?: string }) => {
      try {
        const response = await verifyTelegramSetupAction({ username });
        if (!response?.data?.data) {
          return { success: false, error: 'No response from Telegram action' };
        }
        if (!response.data.success) {
          return {
            success: false,
            error: response.data.error,
            botId: response.data.data?.botId,
          };
        }
        return { success: true, data: 'Telegram setup verified' };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Verification failed',
        };
      }
    },
    render: (result: unknown) => {
      const r = result as TelegramResult;
      return renderTelegramResponse({
        success: r.success,
        error: r.error,
        botId: r.botId,
        successTitle: 'Setup Verified ✅',
        successMessage: 'Your Telegram setup is valid.',
      });
    },
  },

  sendTelegramNotification: {
    userId: null,
    displayName: '📨 Send Telegram Notification',
    isCollapsible: true,
    isExpandedByDefault: true,
    description:
      'Sends a Telegram message. Requires a Telegram username to be passed in or saved in the database.',
    parameters: z.object({
      username: z.string().optional(),
      message: z.string(),
    }),
    execute: async function ({
      username,
      message,
    }: {
      username?: string;
      message: string;
    }) {
      try {
        const usernameCheck = await checkTelegramUsername(
          this.userId || undefined,
        );
        if (!username && !usernameCheck.username) {
          return { success: false, error: MISSING_USERNAME_ERROR };
        }
        const finalUsername = username || usernameCheck.username;
        const response = await sendTelegramNotification({
          username: finalUsername,
          userId: this.userId || undefined,
          text: message,
        });
        if (!response?.data?.data) {
          return { success: false, error: 'No response from Telegram action' };
        }
        const { success, error, botId } = response.data.data;
        if (!success) {
          return { success, error, botId };
        }
        return {
          success: true,
          data: 'Notification sent successfully',
          noFollowUp: true,
          botId,
        };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : 'Failed to send notification',
        };
      }
    },
    render: (result: unknown) => {
      const r = result as TelegramResult;
      return renderTelegramResponse({
        success: r.success,
        error: r.error,
        botId: r.botId,
        successTitle: 'Telegram Notification Sent ✅',
        successMessage: `Check your Telegram for a message from ${r.botId}`,
      });
    },
  },
};
