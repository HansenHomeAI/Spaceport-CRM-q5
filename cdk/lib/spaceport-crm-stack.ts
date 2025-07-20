import * as cdk from "aws-cdk-lib"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cognito from "aws-cdk-lib/aws-cognito"
import type { Construct } from "constructs"

export class SpaceportCrmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // DynamoDB Tables
    const leadsTable = new dynamodb.Table(this, "LeadsTable", {
      tableName: "spaceport-leads",
      partitionKey: { name: "lead_id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: "spaceport-users",
      partitionKey: { name: "user_id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, "SpaceportUserPool", {
      userPoolName: "spaceport-crm-users",
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const userPoolClient = new cognito.UserPoolClient(this, "SpaceportUserPoolClient", {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    })

    // Lambda Functions
    const leadsLambda = new lambda.Function(this, "LeadsFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "leads.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: {
        LEADS_TABLE_NAME: leadsTable.tableName,
        USERS_TABLE_NAME: usersTable.tableName,
      },
    })

    const metricsLambda = new lambda.Function(this, "MetricsFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "metrics.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: {
        LEADS_TABLE_NAME: leadsTable.tableName,
      },
    })

    // Grant permissions
    leadsTable.grantReadWriteData(leadsLambda)
    usersTable.grantReadWriteData(leadsLambda)
    leadsTable.grantReadData(metricsLambda)

    // API Gateway
    const api = new apigateway.RestApi(this, "SpaceportCrmApi", {
      restApiName: "Spaceport CRM API",
      description: "API for Spaceport CRM",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    })

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
      cognitoUserPools: [userPool],
    })

    // API Routes
    const leadsResource = api.root.addResource("leads")
    leadsResource.addMethod("GET", new apigateway.LambdaIntegration(leadsLambda), {
      authorizer,
    })
    leadsResource.addMethod("POST", new apigateway.LambdaIntegration(leadsLambda), {
      authorizer,
    })

    const leadResource = leadsResource.addResource("{id}")
    leadResource.addMethod("GET", new apigateway.LambdaIntegration(leadsLambda), {
      authorizer,
    })
    leadResource.addMethod("PATCH", new apigateway.LambdaIntegration(leadsLambda), {
      authorizer,
    })
    leadResource.addMethod("DELETE", new apigateway.LambdaIntegration(leadsLambda), {
      authorizer,
    })

    const metricsResource = api.root.addResource("metrics")
    metricsResource.addMethod("GET", new apigateway.LambdaIntegration(metricsLambda), {
      authorizer,
    })

    // Outputs
    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "Cognito User Pool ID",
    })

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    })

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    })

    new cdk.CfnOutput(this, "LeadsTableName", {
      value: leadsTable.tableName,
      description: "DynamoDB Leads Table Name",
    })
  }
}
