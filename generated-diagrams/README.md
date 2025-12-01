# ETL Pipeline AWS Architecture Diagrams

This directory contains AWS architecture diagrams generated for the ETL Pipeline project based on the technical design specifications.

## Generated Diagrams

### 1. ETL Pipeline Architecture (`etl-pipeline-architecture.png`)
**Purpose**: High-level system architecture overview
**Description**: Shows the main components and data flow of the ETL pipeline system including:
- User interaction with React frontend
- API Gateway for REST endpoints
- Lambda functions for different operations (upload, job trigger, status monitoring, download)
- S3 buckets for input (Parquet) and output (JSON) storage
- AWS Glue job for ETL processing
- DynamoDB for job metadata storage
- CloudWatch for monitoring and logging

### 2. ETL Pipeline Data Flow (`etl-pipeline-dataflow.png`)
**Purpose**: Detailed step-by-step data flow process
**Description**: Illustrates the complete workflow from file upload to download:
1. User uploads Parquet file through React frontend
2. File stored in S3 input bucket with job record created in DynamoDB
3. ETL job triggered via AWS Glue
4. Glue processes Parquet to JSON format
5. Output stored in S3 output bucket
6. Status monitoring and file download capabilities
7. All operations logged to CloudWatch

### 3. ETL Pipeline Deployment Architecture (`etl-pipeline-deployment.png`)
**Purpose**: Infrastructure deployment and development environment
**Description**: Shows the deployment architecture including:
- Development environment with local React app and AWS CDK
- AWS cloud infrastructure components
- Security and monitoring setup with IAM roles and CloudWatch
- Infrastructure as Code deployment using AWS CDK (TypeScript)

## Key Architecture Decisions

### Storage Strategy
- **Input Storage**: S3 bucket with 30-day lifecycle policy for Parquet files
- **Output Storage**: S3 bucket with public read access for JSON files
- **Metadata Storage**: DynamoDB with on-demand pricing and GSI for status queries

### Processing Strategy
- **Serverless Architecture**: Lambda functions for API operations
- **ETL Processing**: AWS Glue Python Shell jobs for Parquet to JSON transformation
- **Auto-scaling**: Built-in scaling for Lambda and Glue based on demand

### Security & Monitoring
- **IAM Roles**: Least-privilege permissions for Lambda and Glue
- **Monitoring**: CloudWatch Logs and custom metrics
- **Error Handling**: Comprehensive logging and status tracking

### API Design
- **REST Endpoints**: 
  - POST /upload - File upload
  - POST /trigger-job - Start ETL processing
  - GET /job-status/{jobId} - Status monitoring
  - GET /download/{jobId} - File download
  - GET /jobs - List all jobs

## Technology Stack
- **Frontend**: React.js (local development)
- **API**: AWS API Gateway with Lambda integration
- **Processing**: AWS Glue (Python Shell)
- **Storage**: Amazon S3
- **Database**: Amazon DynamoDB
- **Monitoring**: Amazon CloudWatch
- **Infrastructure**: AWS CDK (TypeScript)

## Compliance with Requirements
✅ Uses DynamoDB as backend data store  
✅ No authentication (prototype environment)  
✅ React frontend (no CloudFront)  
✅ No SageMaker, Amplify, or Cognito services  
✅ Serverless architecture for scalability  
✅ Comprehensive monitoring and logging  

All diagrams are stored in PNG format and can be used for documentation, presentations, or further architectural discussions.
