#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EtlPipelineStack } from '../lib/etl-pipeline-stack';

const app = new cdk.App();
new EtlPipelineStack(app, 'EtlPipelineStack120120251641', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  }
});
