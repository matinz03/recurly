const appConfig = require("./app.json");

module.exports = {
  ...appConfig.expo,
  extra: {
    ...appConfig.expo.extra,
    posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.POSTHOG_HOST,
    eas: {
      projectId: "7a430de4-9fc4-47bb-a940-6b5b2f2b833f",
    },
  },
};
