# AWS ETL Pipeline Solution Cost Analysis Estimate Report

## Service Overview

AWS ETL Pipeline Solution is a fully managed, serverless service that allows you to This project uses multiple AWS services.. This service follows a pay-as-you-go pricing model, making it cost-effective for various workloads.

## Pricing Model

This cost analysis estimate is based on the following pricing model:
- **ON DEMAND** pricing (pay-as-you-go) unless otherwise specified
- Standard service configurations without reserved capacity or savings plans
- No caching or optimization techniques applied

## Assumptions

- Standard ON DEMAND pricing model for all services
- Python Shell jobs for AWS Glue (1 DPU per job)
- Average job duration of 5 minutes for Glue ETL processing
- 512MB memory allocation for Lambda functions
- Average file sizes: 5GB input Parquet, 5GB output JSON
- HTTP API Gateway (not REST API) for cost optimization
- DynamoDB on-demand billing mode
- S3 Standard storage class for active data

## Limitations and Exclusions

- Data transfer costs between regions (single region deployment)
- CloudWatch logs storage costs beyond free tier
- Development and testing environment costs
- Network acceleration or CloudFront costs
- Custom domain and SSL certificate costs
- Backup and disaster recovery costs
- Monitoring and alerting service costs beyond basic CloudWatch

## Cost Breakdown

### Unit Pricing Details

| Service | Resource Type | Unit | Price | Free Tier |
|---------|--------------|------|-------|------------|
| AWS Lambda | Requests | request | $0.0000002 | First 12 months: 1M requests + 400,000 GB-seconds free per month |
| AWS Lambda | Compute Time | GB-second (Tier 1) | $0.0000166667 | First 12 months: 1M requests + 400,000 GB-seconds free per month |
| AWS Glue | Flex Jobs | DPU-hour | $0.29 | No free tier for AWS Glue services |
| AWS Glue | Standard Jobs | DPU-hour | $0.44 | No free tier for AWS Glue services |
| Amazon S3 | Storage | GB-month (first 50TB) | $0.023 | First 12 months: 5GB storage + 20,000 GET + 2,000 PUT requests free |
| Amazon S3 | Put Requests | 1,000 requests | $0.0005 | First 12 months: 5GB storage + 20,000 GET + 2,000 PUT requests free |
| Amazon S3 | Get Requests | 1,000 requests | $0.0004 | First 12 months: 5GB storage + 20,000 GET + 2,000 PUT requests free |
| Amazon DynamoDB | Write Requests | million WRUs | $0.625 | Always free: 25GB storage + 25 RCU/WCU capacity units |
| Amazon DynamoDB | Read Requests | million RRUs | $0.125 | Always free: 25GB storage + 25 RCU/WCU capacity units |
| Amazon DynamoDB | Storage | GB-month (after 25GB free) | $0.25 | Always free: 25GB storage + 25 RCU/WCU capacity units |
| Amazon API Gateway | Http Api | million requests (first 300M) | $1.00 | First 12 months: 1M HTTP API requests free per month |
| Amazon API Gateway | Rest Api | million requests (first 333M) | $3.50 | First 12 months: 1M HTTP API requests free per month |

### Cost Calculation

| Service | Usage | Calculation | Monthly Cost |
|---------|-------|-------------|-------------|
| AWS Lambda | 4 Lambda functions handling 1,000 ETL jobs per month with 512MB memory (Requests: 4,000 requests per month, Compute Time: 400 GB-seconds per month) | $0.0000002 × 4,000 requests + $0.0000166667 × 400 GB-seconds = $0.0075 | $0.0075 |
| AWS Glue | 1,000 ETL jobs per month using Flex pricing with 5-minute average duration (Dpu Hours: 83 DPU-hours per month (1,000 jobs × 0.083 hours × 1 DPU)) | $0.29 × 83 DPU-hours = $24.07 (using Flex pricing for cost optimization) | $24.07 |
| Amazon S3 | 50GB average storage with 2,000 PUT and 3,000 GET requests per month (Storage: 50 GB-months, Put Requests: 2,000 requests, Get Requests: 3,000 requests) | $0.023 × 50 GB + $0.0005 × 2 + $0.0004 × 3 = $1.15 | $1.15 |
| Amazon DynamoDB | 5,000 write operations and 10,000 read operations per month with <1GB storage (Write Requests: 5,000 WRUs per month, Read Requests: 10,000 RRUs per month, Storage: <1GB (within free tier)) | $0.625 × 0.005M WRUs + $0.125 × 0.01M RRUs + $0 storage = $0.004 | $0.004 |
| Amazon API Gateway | 10,000 HTTP API requests per month for ETL job management (Api Requests: 10,000 HTTP API requests per month) | $1.00 × 0.01M requests = $0.01 (using HTTP API for cost optimization) | $0.01 |
| **Total** | **All services** | **Sum of all calculations** | **$25.24/month** |

### Free Tier

Free tier information by service:
- **AWS Lambda**: First 12 months: 1M requests + 400,000 GB-seconds free per month
- **AWS Glue**: No free tier for AWS Glue services
- **Amazon S3**: First 12 months: 5GB storage + 20,000 GET + 2,000 PUT requests free
- **Amazon DynamoDB**: Always free: 25GB storage + 25 RCU/WCU capacity units
- **Amazon API Gateway**: First 12 months: 1M HTTP API requests free per month

## Cost Scaling with Usage

The following table illustrates how cost estimates scale with different usage levels:

| Service | Low Usage | Medium Usage | High Usage |
|---------|-----------|--------------|------------|
| AWS Lambda | $0/month | $0/month | $0/month |
| AWS Glue | $12/month | $24/month | $48/month |
| Amazon S3 | $0/month | $1/month | $2/month |
| Amazon DynamoDB | $0/month | $0/month | $0/month |
| Amazon API Gateway | $0/month | $0/month | $0/month |

### Key Cost Factors

- **AWS Lambda**: 4 Lambda functions handling 1,000 ETL jobs per month with 512MB memory
- **AWS Glue**: 1,000 ETL jobs per month using Flex pricing with 5-minute average duration
- **Amazon S3**: 50GB average storage with 2,000 PUT and 3,000 GET requests per month
- **Amazon DynamoDB**: 5,000 write operations and 10,000 read operations per month with <1GB storage
- **Amazon API Gateway**: 10,000 HTTP API requests per month for ETL job management

## Projected Costs Over Time

The following projections show estimated monthly costs over a 12-month period based on different growth patterns:

Base monthly cost calculation:

| Service | Monthly Cost |
|---------|-------------|
| AWS Lambda | $0.01 |
| AWS Glue | $24.07 |
| Amazon S3 | $1.15 |
| Amazon DynamoDB | $0.00 |
| Amazon API Gateway | $0.01 |
| **Total Monthly Cost** | **$25** |

| Growth Pattern | Month 1 | Month 3 | Month 6 | Month 12 |
|---------------|---------|---------|---------|----------|
| Steady | $25/mo | $25/mo | $25/mo | $25/mo |
| Moderate | $25/mo | $27/mo | $32/mo | $43/mo |
| Rapid | $25/mo | $30/mo | $40/mo | $72/mo |

* Steady: No monthly growth (1.0x)
* Moderate: 5% monthly growth (1.05x)
* Rapid: 10% monthly growth (1.1x)

## Detailed Cost Analysis

### Pricing Model

ON DEMAND


### Exclusions

- Data transfer costs between regions (single region deployment)
- CloudWatch logs storage costs beyond free tier
- Development and testing environment costs
- Network acceleration or CloudFront costs
- Custom domain and SSL certificate costs
- Backup and disaster recovery costs
- Monitoring and alerting service costs beyond basic CloudWatch

### Recommendations

#### Immediate Actions

- Use AWS Glue Flex Jobs instead of Standard Jobs to save 34% on processing costs
- Implement HTTP API Gateway instead of REST API to save 71% on API request costs
- Right-size Lambda function memory allocation based on actual usage patterns
- Set up S3 lifecycle policies to move processed files to cheaper storage classes after 30 days
#### Best Practices

- Implement batch processing to group multiple small files into single Glue jobs
- Set up AWS Budgets with alerts at 80% and 100% of expected monthly costs
- Monitor DPU-hours and optimize Glue job performance to reduce execution time
- Use CloudWatch metrics to track and optimize resource utilization across all services
- Consider DynamoDB reserved capacity for predictable, high-volume workloads



## Cost Optimization Recommendations

### Immediate Actions

- Use AWS Glue Flex Jobs instead of Standard Jobs to save 34% on processing costs
- Implement HTTP API Gateway instead of REST API to save 71% on API request costs
- Right-size Lambda function memory allocation based on actual usage patterns

### Best Practices

- Implement batch processing to group multiple small files into single Glue jobs
- Set up AWS Budgets with alerts at 80% and 100% of expected monthly costs
- Monitor DPU-hours and optimize Glue job performance to reduce execution time

## Conclusion

By following the recommendations in this report, you can optimize your AWS ETL Pipeline Solution costs while maintaining performance and reliability. Regular monitoring and adjustment of your usage patterns will help ensure cost efficiency as your workload evolves.
