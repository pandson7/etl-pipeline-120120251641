import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as glue from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';

export class EtlPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = '120120251641';

    // S3 Buckets
    const inputBucket = new s3.Bucket(this, `InputBucket${suffix}`, {
      bucketName: `etl-pipeline-input-${suffix}`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const outputBucket = new s3.Bucket(this, `OutputBucket${suffix}`, {
      bucketName: `etl-pipeline-output-${suffix}`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const scriptsBucket = new s3.Bucket(this, `ScriptsBucket${suffix}`, {
      bucketName: `etl-pipeline-scripts-${suffix}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // DynamoDB Table
    const jobsTable = new dynamodb.Table(this, `JobsTable${suffix}`, {
      tableName: `etl-pipeline-jobs-${suffix}`,
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    jobsTable.addGlobalSecondaryIndex({
      indexName: 'status-createdAt-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Glue IAM Role
    const glueRole = new iam.Role(this, `GlueRole${suffix}`, {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'),
      ],
    });

    inputBucket.grantReadWrite(glueRole);
    outputBucket.grantReadWrite(glueRole);
    scriptsBucket.grantRead(glueRole);
    jobsTable.grantReadWriteData(glueRole);

    // Glue Job
    const glueJob = new glue.CfnJob(this, `GlueJob${suffix}`, {
      name: `etl-parquet-to-json-processor-${suffix}`,
      role: glueRole.roleArn,
      command: {
        name: 'glueetl',
        pythonVersion: '3',
        scriptLocation: `s3://${scriptsBucket.bucketName}/glue-script.py`,
      },
      defaultArguments: {
        '--job-language': 'python',
        '--job-bookmark-option': 'job-bookmark-disable',
        '--enable-metrics': 'true',
        '--enable-continuous-cloudwatch-log': 'true',
        '--INPUT_BUCKET': inputBucket.bucketName,
        '--OUTPUT_BUCKET': outputBucket.bucketName,
        '--JOBS_TABLE': jobsTable.tableName,
        '--REGION': this.region,
        '--additional-python-modules': 'pandas==1.5.3,pyarrow==10.0.1',
      },
      glueVersion: '4.0',
      maxRetries: 0,
      timeout: 60,
      workerType: 'G.1X',
      numberOfWorkers: 2,
    });

    // Lambda Functions
    const uploadHandler = new lambda.Function(this, `UploadHandler${suffix}`, {
      functionName: `etl-upload-handler-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { randomUUID } = require('crypto');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body);
    const { fileName, fileSize } = body;
    
    if (!fileName || !fileName.endsWith('.parquet')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid file type. Only .parquet files are allowed.' })
      };
    }

    const jobId = randomUUID();
    const s3Key = \`\${jobId}/\${fileName}\`;
    
    const putCommand = new PutObjectCommand({
      Bucket: process.env.INPUT_BUCKET,
      Key: s3Key,
      ContentType: 'application/octet-stream'
    });
    
    const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: 3600 });
    
    await dynamodb.send(new PutItemCommand({
      TableName: process.env.JOBS_TABLE,
      Item: {
        jobId: { S: jobId },
        fileName: { S: fileName },
        status: { S: 'PENDING' },
        createdAt: { S: new Date().toISOString() },
        updatedAt: { S: new Date().toISOString() },
        inputS3Key: { S: s3Key },
        fileSize: { N: fileSize.toString() }
      }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobId, uploadUrl, message: 'Upload URL generated successfully' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};`),
      environment: {
        INPUT_BUCKET: inputBucket.bucketName,
        JOBS_TABLE: jobsTable.tableName,
      },
    });

    inputBucket.grantReadWrite(uploadHandler);
    jobsTable.grantReadWriteData(uploadHandler);

    const jobTrigger = new lambda.Function(this, `JobTrigger${suffix}`, {
      functionName: `etl-job-trigger-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { GlueClient, StartJobRunCommand } = require('@aws-sdk/client-glue');
const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const glue = new GlueClient({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body);
    const { jobId } = body;

    const getResult = await dynamodb.send(new GetItemCommand({
      TableName: process.env.JOBS_TABLE,
      Key: { jobId: { S: jobId } }
    }));

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }

    const inputS3Key = getResult.Item.inputS3Key.S;
    
    const startJobResult = await glue.send(new StartJobRunCommand({
      JobName: process.env.GLUE_JOB_NAME,
      Arguments: {
        '--INPUT_S3_KEY': inputS3Key,
        '--JOB_ID_ARG': jobId
      }
    }));

    await dynamodb.send(new UpdateItemCommand({
      TableName: process.env.JOBS_TABLE,
      Key: { jobId: { S: jobId } },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, glueJobRunId = :runId',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': { S: 'RUNNING' },
        ':updatedAt': { S: new Date().toISOString() },
        ':runId': { S: startJobResult.JobRunId }
      }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        jobId, 
        status: 'RUNNING', 
        glueJobRunId: startJobResult.JobRunId,
        message: 'ETL job started successfully' 
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to start ETL job' })
    };
  }
};`),
      environment: {
        JOBS_TABLE: jobsTable.tableName,
        GLUE_JOB_NAME: glueJob.name!,
      },
    });

    jobTrigger.addToRolePolicy(new iam.PolicyStatement({
      actions: ['glue:StartJobRun'],
      resources: [`arn:aws:glue:${this.region}:${this.account}:job/${glueJob.name}`],
    }));
    jobsTable.grantReadWriteData(jobTrigger);

    const statusMonitor = new lambda.Function(this, `StatusMonitor${suffix}`, {
      functionName: `etl-status-monitor-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { GlueClient, GetJobRunCommand } = require('@aws-sdk/client-glue');
const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const glue = new GlueClient({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const jobId = event.pathParameters.jobId;

    const getResult = await dynamodb.send(new GetItemCommand({
      TableName: process.env.JOBS_TABLE,
      Key: { jobId: { S: jobId } }
    }));

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }

    const item = getResult.Item;
    let status = item.status.S;
    let processingTime = null;
    let errorMessage = null;

    if (item.glueJobRunId && status === 'RUNNING') {
      try {
        const glueResult = await glue.send(new GetJobRunCommand({
          JobName: process.env.GLUE_JOB_NAME,
          RunId: item.glueJobRunId.S
        }));

        const glueStatus = glueResult.JobRun.JobRunState;
        if (glueStatus === 'SUCCEEDED') {
          status = 'COMPLETED';
          processingTime = Math.round((new Date(glueResult.JobRun.CompletedOn) - new Date(glueResult.JobRun.StartedOn)) / 1000);
        } else if (glueStatus === 'FAILED' || glueStatus === 'ERROR' || glueStatus === 'TIMEOUT') {
          status = 'FAILED';
          errorMessage = glueResult.JobRun.ErrorMessage || 'Glue job failed';
        }

        if (status !== 'RUNNING') {
          const updateParams = {
            TableName: process.env.JOBS_TABLE,
            Key: { jobId: { S: jobId } },
            UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':status': { S: status },
              ':updatedAt': { S: new Date().toISOString() }
            }
          };

          if (processingTime) {
            updateParams.UpdateExpression += ', processingTime = :processingTime';
            updateParams.ExpressionAttributeValues[':processingTime'] = { N: processingTime.toString() };
          }

          if (errorMessage) {
            updateParams.UpdateExpression += ', errorMessage = :errorMessage';
            updateParams.ExpressionAttributeValues[':errorMessage'] = { S: errorMessage };
          }

          await dynamodb.send(new UpdateItemCommand(updateParams));
        }
      } catch (glueError) {
        console.error('Error checking Glue job status:', glueError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        jobId,
        status,
        fileName: item.fileName.S,
        createdAt: item.createdAt.S,
        updatedAt: item.updatedAt.S,
        processingTime,
        errorMessage
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};`),
      environment: {
        JOBS_TABLE: jobsTable.tableName,
        GLUE_JOB_NAME: glueJob.name!,
      },
    });

    statusMonitor.addToRolePolicy(new iam.PolicyStatement({
      actions: ['glue:GetJobRun'],
      resources: ['*'],
    }));
    jobsTable.grantReadWriteData(statusMonitor);

    const downloadHandler = new lambda.Function(this, `DownloadHandler${suffix}`, {
      functionName: `etl-download-handler-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const jobId = event.pathParameters.jobId;

    const getResult = await dynamodb.send(new GetItemCommand({
      TableName: process.env.JOBS_TABLE,
      Key: { jobId: { S: jobId } }
    }));

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }

    const item = getResult.Item;
    if (item.status.S !== 'COMPLETED') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Job not completed yet' })
      };
    }

    const outputKey = \`\${jobId}/output.json\`;
    
    const getCommand = new GetObjectCommand({
      Bucket: process.env.OUTPUT_BUCKET,
      Key: outputKey
    });
    
    const downloadUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        downloadUrl,
        fileName: \`\${item.fileName.S.replace('.parquet', '.json')}\`,
        expiresIn: 3600
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};`),
      environment: {
        JOBS_TABLE: jobsTable.tableName,
        OUTPUT_BUCKET: outputBucket.bucketName,
      },
    });

    outputBucket.grantRead(downloadHandler);
    jobsTable.grantReadData(downloadHandler);

    const listJobsHandler = new lambda.Function(this, `ListJobsHandler${suffix}`, {
      functionName: `etl-list-jobs-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const result = await dynamodb.send(new ScanCommand({
      TableName: process.env.JOBS_TABLE,
      Limit: 50
    }));

    const jobs = result.Items.map(item => ({
      jobId: item.jobId.S,
      fileName: item.fileName.S,
      status: item.status.S,
      createdAt: item.createdAt.S,
      updatedAt: item.updatedAt.S,
      processingTime: item.processingTime ? parseInt(item.processingTime.N) : null,
      errorMessage: item.errorMessage ? item.errorMessage.S : null
    }));

    jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};`),
      environment: {
        JOBS_TABLE: jobsTable.tableName,
      },
    });

    jobsTable.grantReadData(listJobsHandler);

    // API Gateway
    const api = new apigateway.RestApi(this, `EtlApi${suffix}`, {
      restApiName: `etl-pipeline-api-${suffix}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      },
    });

    const uploadIntegration = new apigateway.LambdaIntegration(uploadHandler);
    const triggerIntegration = new apigateway.LambdaIntegration(jobTrigger);
    const statusIntegration = new apigateway.LambdaIntegration(statusMonitor);
    const downloadIntegration = new apigateway.LambdaIntegration(downloadHandler);
    const listJobsIntegration = new apigateway.LambdaIntegration(listJobsHandler);

    api.root.addResource('upload').addMethod('POST', uploadIntegration);
    api.root.addResource('trigger-job').addMethod('POST', triggerIntegration);
    api.root.addResource('jobs').addMethod('GET', listJobsIntegration);
    
    const jobStatusResource = api.root.addResource('job-status').addResource('{jobId}');
    jobStatusResource.addMethod('GET', statusIntegration);
    
    const downloadResource = api.root.addResource('download').addResource('{jobId}');
    downloadResource.addMethod('GET', downloadIntegration);

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL'
    });

    new cdk.CfnOutput(this, 'InputBucketName', {
      value: inputBucket.bucketName,
      description: 'Input S3 Bucket Name'
    });

    new cdk.CfnOutput(this, 'OutputBucketName', {
      value: outputBucket.bucketName,
      description: 'Output S3 Bucket Name'
    });

    new cdk.CfnOutput(this, 'ScriptsBucketName', {
      value: scriptsBucket.bucketName,
      description: 'Scripts S3 Bucket Name'
    });
  }
}
