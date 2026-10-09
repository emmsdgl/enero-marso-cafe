import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.options";

export function register() {
  Sentry.init(sentryOptions);
}

// Reports errors thrown in server components, route handlers, server actions and the proxy
export const onRequestError = Sentry.captureRequestError;
