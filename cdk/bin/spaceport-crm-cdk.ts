#!/usr/bin/env node
import "source-map-support/register"
import * as cdk from "aws-cdk-lib"
import { SpaceportCrmStack } from "../lib/spaceport-crm-stack"

const app = new cdk.App()
new SpaceportCrmStack(app, "SpaceportCrmStack", {
  env: {
    account: "975050048887",
    region: "us-west-2",
  },
})
