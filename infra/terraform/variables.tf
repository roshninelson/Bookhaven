variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment (development, staging, production)"
  type        = string
  default     = "production"
}

variable "api_image_uri" {
  description = "ECR Image URI for the backend API"
  type        = string
  default     = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/bookhaven-api"
}
