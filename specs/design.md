# Technical Design Document

## Architecture Overview

The ETL Pipeline system follows a serverless architecture using AWS services for scalability and cost-effectiveness. The system consists of a React frontend, API Gateway for REST endpoints, Lambda functions for orchestration, AWS Glue for data processing, S3 for storage, and DynamoDB for metadata management.

## System Components

### Frontend Layer
- **Technology**: React.js with local hosting
- **Purpose**: User interface for file upload, job management, and result viewing
- **Key Features**: File upload, real-time status updates, output preview and download

### API Layer
- **Technology**: AWS API Gateway with Lambda integration
- **Purpose**: RESTful API endpoints for frontend communication
- **Authentication**: None (prototype environment)

### Processing Layer
- **Technology**: AWS Glue Jobs
- **Purpose**: ETL processing from Parquet to JSON format
- **Scaling**: Automatic based on job requirements

### Storage Layer
- **Input Storage**: S3 bucket for Parquet files
- **Output Storage**: S3 bucket for JSON files
- **Metadata Storage**: DynamoDB for job tracking and file metadata

### Orchestration Layer
- **Technology**: AWS Lambda functions
- **Purpose**: Job triggering, status monitoring, and API handling

## Data Flow Architecture

```
[React Frontend] 
    ↓ (HTTP/REST)
[API Gateway] 
    ↓ (Lambda Proxy)
[Lambda Functions] 
    ↓ (S3 Upload/Glue Trigger)
[S3 Input Bucket] → [AWS Glue Job] → [S3 Output Bucket]
    ↓ (Metadata Updates)
[DynamoDB]
    ↑ (Status Polling)
[Lambda Functions] 
    ↑ (WebSocket/Polling)
[React Frontend]
```

## Component Specifications

### S3 Buckets
- **Input Bucket**: `etl-pipeline-input-{random-suffix}`
  - Purpose: Store uploaded Parquet files
  - Lifecycle: 30-day retention policy
- **Output Bucket**: `etl-pipeline-output-{random-suffix}`
  - Purpose: Store transformed JSON files
  - Public read access for download functionality

### DynamoDB Tables
- **Jobs Table**: `etl-pipeline-jobs`
  - Primary Key: `jobId` (String)
  - Attributes:
    - `fileName` (String)
    - `status` (String) - PENDING, RUNNING, COMPLETED, FAILED
    - `createdAt` (String)
    - `updatedAt` (String)
    - `inputS3Key` (String)
    - `outputS3Key` (String)
    - `errorMessage` (String)
    - `processingTime` (Number)
  - GSI: `status-createdAt-index` for status-based queries

### AWS Glue Job
- **Job Name**: `etl-parquet-to-json-processor`
- **Job Type**: Python Shell
- **Runtime**: Python 3.9
- **Script Location**: S3 bucket for Glue scripts
- **Input**: Parquet files from S3 input bucket
- **Output**: JSON files to S3 output bucket
- **Transformation Logic**:
  - Read Parquet file using PyArrow
  - Convert to Pandas DataFrame
  - Transform to JSON format
  - Write to S3 output bucket
  - Update job status in DynamoDB

### Lambda Functions

#### 1. File Upload Handler (`upload-handler`)
- **Runtime**: Node.js 18.x
- **Purpose**: Handle file uploads to S3
- **Triggers**: API Gateway POST /upload
- **Permissions**: S3 PutObject, DynamoDB PutItem

#### 2. Job Trigger Handler (`job-trigger`)
- **Runtime**: Node.js 18.x
- **Purpose**: Start AWS Glue jobs
- **Triggers**: API Gateway POST /trigger-job
- **Permissions**: Glue StartJobRun, DynamoDB UpdateItem

#### 3. Status Monitor (`status-monitor`)
- **Runtime**: Node.js 18.x
- **Purpose**: Check job status and update DynamoDB
- **Triggers**: API Gateway GET /job-status/{jobId}
- **Permissions**: Glue GetJobRun, DynamoDB GetItem, UpdateItem

#### 4. File Download Handler (`download-handler`)
- **Runtime**: Node.js 18.x
- **Purpose**: Generate presigned URLs for file downloads
- **Triggers**: API Gateway GET /download/{jobId}
- **Permissions**: S3 GetObject, DynamoDB GetItem

## API Endpoints

### POST /upload
- **Purpose**: Upload Parquet file
- **Request**: Multipart form data with file
- **Response**: `{jobId, message, uploadUrl}`

### POST /trigger-job
- **Purpose**: Start ETL processing
- **Request**: `{jobId}`
- **Response**: `{jobId, status, message}`

### GET /job-status/{jobId}
- **Purpose**: Get current job status
- **Response**: `{jobId, status, createdAt, updatedAt, processingTime, errorMessage}`

### GET /jobs
- **Purpose**: List all jobs with pagination
- **Response**: `{jobs: [], nextToken}`

### GET /download/{jobId}
- **Purpose**: Get download URL for processed file
- **Response**: `{downloadUrl, fileName, expiresIn}`

## Security Considerations

### Data Protection
- S3 buckets with appropriate IAM policies
- Lambda functions with least-privilege permissions
- API Gateway with CORS configuration

### Error Handling
- Comprehensive error logging in CloudWatch
- Graceful error responses to frontend
- Retry mechanisms for transient failures

## Deployment Architecture

### Infrastructure as Code
- **Technology**: AWS CDK (TypeScript)
- **Stacks**:
  - Storage Stack (S3, DynamoDB)
  - Compute Stack (Lambda, Glue)
  - API Stack (API Gateway)
  - Frontend Stack (Local React app)

### Environment Configuration
- Development environment only
- No CI/CD pipeline (simple CDK deployment)
- Local frontend development server

## Performance Considerations

### Scalability
- Lambda auto-scaling for API requests
- Glue job auto-scaling based on data size
- DynamoDB on-demand pricing for variable workloads

### Optimization
- Efficient Parquet reading with PyArrow
- Streaming JSON output for large files
- Connection pooling in Lambda functions
- DynamoDB query optimization with GSI

## Monitoring and Logging

### CloudWatch Integration
- Lambda function logs and metrics
- Glue job execution logs
- API Gateway access logs
- Custom metrics for job success/failure rates

### Error Tracking
- Structured logging with correlation IDs
- Error aggregation and alerting
- Performance monitoring and optimization
