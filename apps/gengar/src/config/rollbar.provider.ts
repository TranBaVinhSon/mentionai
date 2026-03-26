import Rollbar from "rollbar";

export const ROLLBAR_TOKEN = "ROLLBAR";

export const rollbarProvider = {
  provide: ROLLBAR_TOKEN,
  useFactory: () => {
    return new Rollbar({
      accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
      environment: process.env.NODE_ENV || "development",
      captureUncaught: true,
      captureUnhandledRejections: true,
      enabled: !!process.env.ROLLBAR_ACCESS_TOKEN,
      payload: {
        server: {
          root: process.cwd(),
        },
      },
      scrubFields: ["password", "token", "accessToken", "refreshToken", "authorization", "cookie"],
    });
  },
};
