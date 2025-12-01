import sys
import boto3
import pandas as pd
import json
from datetime import datetime
import logging
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from pyspark.context import SparkContext

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    try:
        # Initialize Glue context
        sc = SparkContext()
        glueContext = GlueContext(sc)
        
        # Get job arguments using Glue utils
        args = getResolvedOptions(sys.argv, [
            'INPUT_BUCKET',
            'OUTPUT_BUCKET', 
            'JOBS_TABLE',
            'REGION',
            'INPUT_S3_KEY',
            'JOB_ID_ARG'
        ])

        input_bucket = args['INPUT_BUCKET']
        output_bucket = args['OUTPUT_BUCKET']
        jobs_table = args['JOBS_TABLE']
        region = args['REGION']
        input_s3_key = args['INPUT_S3_KEY']
        job_id = args['JOB_ID_ARG']

        logger.info(f"Processing job {job_id} with input {input_s3_key}")

        # Initialize AWS clients
        s3_client = boto3.client('s3', region_name=region)
        dynamodb = boto3.resource('dynamodb', region_name=region)
        table = dynamodb.Table(jobs_table)

        # Update job status to RUNNING
        table.update_item(
            Key={'jobId': job_id},
            UpdateExpression='SET #status = :status, updatedAt = :updatedAt',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'RUNNING',
                ':updatedAt': datetime.utcnow().isoformat()
            }
        )

        # Download Parquet file from S3
        local_input_path = '/tmp/input.parquet'
        s3_client.download_file(input_bucket, input_s3_key, local_input_path)
        logger.info(f"Downloaded {input_s3_key} to {local_input_path}")

        # Read Parquet file
        df = pd.read_parquet(local_input_path)
        logger.info(f"Read {len(df)} records from Parquet file")

        # Convert DataFrame to JSON
        json_data = df.to_json(orient='records', date_format='iso')
        
        # Parse and pretty print JSON
        parsed_data = json.loads(json_data)
        formatted_json = json.dumps(parsed_data, indent=2, ensure_ascii=False)

        # Upload JSON to S3
        output_key = f"{job_id}/output.json"
        s3_client.put_object(
            Bucket=output_bucket,
            Key=output_key,
            Body=formatted_json,
            ContentType='application/json'
        )
        logger.info(f"Uploaded JSON to {output_bucket}/{output_key}")

        # Update job status to COMPLETED
        table.update_item(
            Key={'jobId': job_id},
            UpdateExpression='SET #status = :status, updatedAt = :updatedAt, outputS3Key = :outputKey',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'COMPLETED',
                ':updatedAt': datetime.utcnow().isoformat(),
                ':outputKey': output_key
            }
        )

        logger.info(f"Job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Job failed: {str(e)}")
        
        # Update job status to FAILED
        try:
            table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET #status = :status, updatedAt = :updatedAt, errorMessage = :error',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'FAILED',
                    ':updatedAt': datetime.utcnow().isoformat(),
                    ':error': str(e)
                }
            )
        except:
            pass
        
        raise e

if __name__ == '__main__':
    main()
