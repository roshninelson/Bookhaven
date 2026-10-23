output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "ecs_cluster_name" {
  description = "ECS Cluster Name"
  value       = aws_ecs_cluster.main.name
}

output "cloudfront_domain_name" {
  description = "CloudFront Distribution Domain Name for the frontend web app"
  value       = aws_cloudfront_distribution.s3_distribution.domain_name
}

output "s3_bucket_name" {
  description = "S3 Bucket storing frontend web assets"
  value       = aws_s3_bucket.frontend.bucket
}
