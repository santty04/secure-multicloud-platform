import type { InstanceSummaryResponse } from "@/schemas/instance";
import type { CloudProvider } from "@/types/domain";

const SEED_INSTANCES: InstanceSummaryResponse[] = [
  {
    id: "b2000000-0000-4000-8000-000000000001",
    name: "vm-app-prod-01",
    provider: "azure",
    resource_type: "virtual_machine",
    region: "eastus",
    environment: "production",
    status: "running",
    is_managed: true,
  },
  {
    id: "b2000000-0000-4000-8000-000000000002",
    name: "vm-api-prod-02",
    provider: "azure",
    resource_type: "virtual_machine",
    region: "eastus",
    environment: "production",
    status: "running",
    is_managed: true,
  },
  {
    id: "b2000000-0000-4000-8000-000000000003",
    name: "vm-db-stage-01",
    provider: "azure",
    resource_type: "virtual_machine",
    region: "westeurope",
    environment: "staging",
    status: "stopped",
    is_managed: true,
  },
  {
    id: "b2000000-0000-4000-8000-000000000004",
    name: "vm-bastion-01",
    provider: "azure",
    resource_type: "virtual_machine",
    region: "eastus",
    environment: "production",
    status: "running",
    is_managed: true,
  },
  {
    id: "b2000000-0000-4000-8000-000000000005",
    name: "vm-batch-dev-03",
    provider: "azure",
    resource_type: "virtual_machine",
    region: "centralus",
    environment: "development",
    status: "stopped",
    is_managed: false,
  },
  {
    id: "b2000000-0000-4000-8000-000000000006",
    name: "ec2-web-prod-01",
    provider: "aws",
    resource_type: "ec2_instance",
    region: "us-east-1",
    environment: "production",
    status: "running",
    is_managed: true,
  },
  {
    id: "b2000000-0000-4000-8000-000000000007",
    name: "ec2-worker-prod-02",
    provider: "aws",
    resource_type: "ec2_instance",
    region: "us-east-1",
    environment: "production",
    status: "running",
    is_managed: true,
  },
  {
    id: "b2000000-0000-4000-8000-000000000008",
    name: "ec2-cache-stage-01",
    provider: "aws",
    resource_type: "ec2_instance",
    region: "us-west-2",
    environment: "staging",
    status: "pending",
    is_managed: true,
  },
  {
    id: "b2000000-0000-4000-8000-000000000009",
    name: "ec2-ml-dev-04",
    provider: "aws",
    resource_type: "ec2_instance",
    region: "sa-east-1",
    environment: "development",
    status: "running",
    is_managed: true,
  },
  {
    id: "b2000000-0000-4000-8000-000000000010",
    name: "ec2-legacy-01",
    provider: "aws",
    resource_type: "ec2_instance",
    region: "us-east-2",
    environment: "production",
    status: "stopped",
    is_managed: false,
  },
];

/** In-memory instance store — mutated by the mocked start/stop/delete handlers. */
export let instances: InstanceSummaryResponse[] = SEED_INSTANCES.map((instance) => ({ ...instance }));

export function getInstances(): InstanceSummaryResponse[] {
  return instances;
}

export function findInstance(
  provider: CloudProvider,
  resourceId: string,
): InstanceSummaryResponse | undefined {
  return instances.find((instance) => instance.provider === provider && instance.id === resourceId);
}

export function setInstanceStatus(resourceId: string, status: string): void {
  instances = instances.map((instance) =>
    instance.id === resourceId ? { ...instance, status } : instance,
  );
}

export function removeInstance(resourceId: string): void {
  instances = instances.filter((instance) => instance.id !== resourceId);
}
