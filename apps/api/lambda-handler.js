const serverlessExpress = require('@vendia/serverless-express');
const app = require('./src/server.js');

let serverlessExpressInstance;

async function setup(handler) {
  const instance = serverlessExpress({ app });
  return instance(handler);
}

exports.handler = async (event, context) => {
  // Reuse instance if available, otherwise create new
  if (!serverlessExpressInstance) {
    serverlessExpressInstance = serverlessExpress({ app });
  }
  
  return serverlessExpressInstance(event, context);
};
