#!/usr/bin/env node
import "source-map-support/register"
import * as cdk from "aws-cdk-lib"
import { SpaceportCrmStack } from "../lib/spaceport-crm-stack"

const app = new cdk.App()
new SpaceportCrmStack(app, "SpaceportCrmStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})
