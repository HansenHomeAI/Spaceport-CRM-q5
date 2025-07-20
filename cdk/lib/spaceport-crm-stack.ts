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
      tableName: "spaceport-crm-leads",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    const activitiesTable = new dynamodb.Table(this, "ActivitiesTable", {
      tableName: "spaceport-crm-activities",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // Add GSI for querying activities by lead ID
    activitiesTable.addGlobalSecondaryIndex({
      indexName: "LeadIdIndex",
      partitionKey: { name: "leadId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
    })

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, "SpaceportCrmUserPool", {
      userPoolName: "spaceport-crm-users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    const userPoolClient = new cognito.UserPoolClient(this, "SpaceportCrmUserPoolClient", {
      userPool,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
    })

    // Lambda Functions
    const leadsLambda = new lambda.Function(this, "LeadsFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const dynamodb = new AWS.DynamoDB.DocumentClient();
        
        exports.handler = async (event) => {
          const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
          };
          
          if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers };
          }
          
          try {
            const { httpMethod, pathParameters, body } = event;
            
            switch (httpMethod) {
              case 'GET':
                if (pathParameters && pathParameters.id) {
                  // Get single lead
                  const result = await dynamodb.get({
                    TableName: '${leadsTable.tableName}',
                    Key: { id: pathParameters.id }
                  }).promise();
                  return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(result.Item)
                  };
                } else {
                  // Get all leads
                  const result = await dynamodb.scan({
                    TableName: '${leadsTable.tableName}'
                  }).promise();
                  return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(result.Items)
                  };
                }
              
              case 'POST':
                const newLead = JSON.parse(body);
                newLead.id = Date.now().toString();
                newLead.createdAt = new Date().toISOString();
                
                await dynamodb.put({
                  TableName: '${leadsTable.tableName}',
                  Item: newLead
                }).promise();
                
                return {
                  statusCode: 201,
                  headers,
                  body: JSON.stringify(newLead)
                };
              
              case 'PUT':
                const updatedLead = JSON.parse(body);
                updatedLead.updatedAt = new Date().toISOString();
                
                await dynamodb.put({
                  TableName: '${leadsTable.tableName}',
                  Item: updatedLead
                }).promise();
                
                return {
                  statusCode: 200,
                  headers,
                  body: JSON.stringify(updatedLead)
                };
              
              case 'DELETE':
                await dynamodb.delete({
                  TableName: '${leadsTable.tableName}',
                  Key: { id: pathParameters.id }
                }).promise();
                
                return {
                  statusCode: 204,
                  headers
                };
              
              default:
                return {
                  statusCode: 405,
                  headers,
                  body: JSON.stringify({ error: 'Method not allowed' })
                };
            }
          } catch (error) {
            console.error('Error:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Internal server error' })
            };
          }
        };
      `),
      environment: {
        LEADS_TABLE_NAME: leadsTable.tableName,
        ACTIVITIES_TABLE_NAME: activitiesTable.tableName,
      },
    })

    const activitiesLambda = new lambda.Function(this, "ActivitiesFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const dynamodb = new AWS.DynamoDB.DocumentClient();
        
        exports.handler = async (event) => {
          const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
          };
          
          if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers };
          }
          
          try {
            const { httpMethod, queryStringParameters, body } = event;
            
            switch (httpMethod) {
              case 'GET':
                if (queryStringParameters && queryStringParameters.leadId) {
                  // Get activities for a specific lead
                  const result = await dynamodb.query({
                    TableName: '${activitiesTable.tableName}',
                    IndexName: 'LeadIdIndex',
                    KeyConditionExpression: 'leadId = :leadId',
                    ExpressionAttributeValues: {
                      ':leadId': queryStringParameters.leadId
                    },
                    ScanIndexForward: false // Most recent first
                  }).promise();
                  return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(result.Items)
                  };
                } else {
                  // Get all activities
                  const result = await dynamodb.scan({
                    TableName: '${activitiesTable.tableName}'
                  }).promise();
                  return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(result.Items)
                  };
                }
              
              case 'POST':
                const newActivity = JSON.parse(body);
                newActivity.id = Date.now().toString();
                newActivity.timestamp = Date.now();
                newActivity.createdAt = new Date().toISOString();
                
                await dynamodb.put({
                  TableName: '${activitiesTable.tableName}',
                  Item: newActivity
                }).promise();
                
                return {
                  statusCode: 201,
                  headers,
                  body: JSON.stringify(newActivity)
                };
              
              default:
                return {
                  statusCode: 405,
                  headers,
                  body: JSON.stringify({ error: 'Method not allowed' })
                };
            }
          } catch (error) {
            console.error('Error:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Internal server error' })
            };
          }
        };
      `),
      environment: {
        LEADS_TABLE_NAME: leadsTable.tableName,
        ACTIVITIES_TABLE_NAME: activitiesTable.tableName,
      },
    })

    // Grant permissions
    leadsTable.grantReadWriteData(leadsLambda)
    activitiesTable.grantReadWriteData(leadsLambda)
    activitiesTable.grantReadWriteData(activitiesLambda)

    // API Gateway
    const api = new apigateway.RestApi(this, "SpaceportCrmApi", {
      restApiName: "Spaceport CRM API",
      description: "API for Spaceport CRM application",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    })

    // API Resources
    const leadsResource = api.root.addResource("leads")
    const leadResource = leadsResource.addResource("{id}")
    const activitiesResource = api.root.addResource("activities")

    // API Methods
    leadsResource.addMethod("GET", new apigateway.LambdaIntegration(leadsLambda))
    leadsResource.addMethod("POST", new apigateway.LambdaIntegration(leadsLambda))
    leadResource.addMethod("GET", new apigateway.LambdaIntegration(leadsLambda))
    leadResource.addMethod("PUT", new apigateway.LambdaIntegration(leadsLambda))
    leadResource.addMethod("DELETE", new apigateway.LambdaIntegration(leadsLambda))

    activitiesResource.addMethod("GET", new apigateway.LambdaIntegration(activitiesLambda))
    activitiesResource.addMethod("POST", new apigateway.LambdaIntegration(activitiesLambda))

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    })

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "Cognito User Pool ID",
    })

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    })

    new cdk.CfnOutput(this, "Region", {
      value: this.region,
      description: "AWS Region",
    })
  }
}
