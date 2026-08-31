output "vpc_id" {
  description = "ID of the project VPC."
  value       = aws_vpc.main.id
}

output "subnet_id" {
  description = "ID of the project subnet."
  value       = aws_subnet.main.id
}

output "security_group_id" {
  description = "ID of the EC2 security group."
  value       = aws_security_group.vm.id
}

output "ubuntu_ami_id" {
  description = "Ubuntu AMI selected dynamically by Terraform."
  value       = data.aws_ami.ubuntu.id
}