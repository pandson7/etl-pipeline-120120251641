# ETL Pipeline Project

A comprehensive ETL (Extract, Transform, Load) pipeline built with AWS CDK and React frontend for processing NYC taxi trip data.

## Project Overview

This project implements a complete ETL pipeline that processes NYC taxi trip data using AWS services. It includes:

- **Data Processing**: AWS Glue jobs for ETL operations
- **Data Storage**: S3 buckets for raw and processed data
- **Data Catalog**: AWS Glue Data Catalog for metadata management
- **Analytics**: Amazon Athena for querying processed data
- **Frontend**: React application for data visualization and monitoring
- **Infrastructure**: AWS CDK for infrastructure as code

## Architecture

The pipeline follows a modern data architecture pattern:

1. **Data Ingestion**: Raw data is uploaded to S3 input bucket
2. **Data Processing**: AWS Glue job transforms and cleans the data
3. **Data Storage**: Processed data is stored in S3 output bucket
4. **Data Cataloging**: Glue Data Catalog maintains metadata
5. **Data Analytics**: Athena provides SQL querying capabilities
6. **Monitoring**: CloudWatch for logging and monitoring

## Project Structure

```
etl-pipeline-120120251641/
├── lib/                          # CDK infrastructure code
├── src/                          # Glue ETL scripts
├── frontend/                     # React web application
├── specs/                        # Project specifications
├── generated-diagrams/           # Architecture diagrams
├── pricing/                      # Cost analysis
├── tasks/                        # Task definitions
├── cdk-app/                      # CDK application entry point
└── README.md                     # This file
```

## Features

### ETL Pipeline
- Automated data processing with AWS Glue
- Data validation and quality checks
- Error handling and retry mechanisms
- Scalable processing for large datasets

### Frontend Application
- Real-time data visualization
- Interactive dashboards
- Data quality monitoring
- User-friendly interface

### Infrastructure
- Infrastructure as Code with AWS CDK
- Automated deployment
- Cost-optimized resource configuration
- Security best practices

## Getting Started

### Prerequisites
- AWS CLI configured
- Node.js 18+ installed
- AWS CDK CLI installed
- Appropriate AWS permissions

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd etl-pipeline-120120251641
```

2. Install dependencies:
```bash
npm install
```

3. Deploy the infrastructure:
```bash
cdk deploy
```

4. Start the frontend application:
```bash
cd frontend
npm install
npm start
```

## Usage

### Data Processing
1. Upload raw data files to the S3 input bucket
2. The Glue job will automatically process the data
3. Processed data will be available in the output bucket
4. Query data using Athena or the frontend application

### Frontend Application
- Access the web interface at `http://localhost:3000`
- View data processing status
- Explore processed datasets
- Monitor pipeline performance

## Configuration

Key configuration files:
- `cdk.json`: CDK configuration
- `lib/etl-pipeline-stack.ts`: Infrastructure definition
- `src/glue-script.py`: ETL processing logic
- `frontend/src/App.js`: Frontend application

## Monitoring and Logging

- CloudWatch Logs for Glue job execution
- CloudWatch Metrics for performance monitoring
- S3 access logs for data access patterns
- Frontend error tracking and analytics

## Cost Optimization

The project includes cost analysis and optimization:
- Pay-per-use pricing model
- Automated resource scaling
- Cost monitoring and alerts
- Detailed pricing breakdown available in `/pricing/`

## Security

Security features implemented:
- IAM roles with least privilege access
- S3 bucket encryption
- VPC endpoints for secure communication
- Data access logging and monitoring

## Documentation

Additional documentation available:
- [Requirements](specs/requirements.md)
- [Design Document](specs/design.md)
- [Task Breakdown](specs/tasks.md)
- [Architecture Diagrams](generated-diagrams/)
- [Pricing Analysis](pricing/)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:
- Check the documentation in the `specs/` directory
- Review the architecture diagrams in `generated-diagrams/`
- Consult the pricing analysis in `pricing/`

## Project Summary

This ETL pipeline project demonstrates modern data engineering practices using AWS cloud services. It provides a complete solution for processing large-scale data with automated infrastructure deployment, comprehensive monitoring, and an intuitive frontend interface.

Key achievements:
- ✅ Scalable ETL pipeline with AWS Glue
- ✅ Infrastructure as Code with CDK
- ✅ React frontend for data visualization
- ✅ Comprehensive documentation
- ✅ Cost optimization analysis
- ✅ Security best practices
- ✅ Monitoring and logging setup
